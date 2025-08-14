import "server-only";

import type z from "zod";
import type { createSchema } from "../api/routers/cv";
import OpenAI from "openai";
import pdf from "pdf-parse";
import { promises as fs } from "node:fs";

/** Recursively produce JSON Pointer paths for every leaf in `obj`. */
function pointersFromInput(obj: unknown, base = ""): string[] {
    if (Array.isArray(obj)) {
        return obj.flatMap((v, i) => pointersFromInput(v, `${base}/${i}`));
    }
    if (obj && typeof obj === "object") {
        return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
            pointersFromInput(v, `${base}/${k}`)
        );
    }
    return [base || "/"];
}

/** Convert a JSON Pointer to a flat column name, e.g. "/a/0/b" -> "a_0_b". */
function pointerToColumn(ptr: string) {
    return ptr.replace(/^\//, "").replace(/\//g, "_");
}

/** Normalize any value to a string for consistent storage/comparison. */
function toStr(v: unknown) {
    return typeof v === "string" ? v : JSON.stringify(v);
}

/** Create an OpenAI client using the OPENAI_API_KEY environment variable. */
function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing");
    }
    return new OpenAI({ apiKey });
}

/** Extract plaintext from a PDF file at `filePath`. */
export async function extractPdfText(filePath: string) {
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    return data.text;
}
// === Tunables ===
const MODEL = "gpt-4o-mini";
const CONCURRENCY = 3;
const MAX_RETRIES = 3;

// === Small helpers ===
function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let attempt = 0;
    // simple exponential backoff + jitter for 429/5xx
    while (true) {
        try {
            return await fn();
        } catch (e: any) {
            const status = e?.status ?? e?.response?.status;
            const retriable = status === 429 || (typeof status === "number" && status >= 500);
            if (!retriable || attempt >= retries) throw e;
            const delay = Math.min(2000 * 2 ** attempt, 10000) + Math.floor(Math.random() * 300);
            await sleep(delay);
            attempt++;
        }
    }
}

/** Run async work over `items` with at most `limit` concurrent tasks. */
async function parallelMap<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;

    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (true) {
                const i = next++;
                if (i >= items.length) return;
                try {
                    results[i] = await worker(items[i]!, i);
                } catch {
                    // swallow per-chunk failure; produce empty result for that chunk
                    // (You can rethrow if you prefer strict failure)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    results[i] = [];
                }
            }
        })
    );

    return results;
}

// === Your existing helpers kept as-is ===
// pointersFromInput, pointerToColumn, toStr, getOpenAI, extractPdfText

/** Split `text` into overlapping chunks for robust LLM context handling. */
function chunkText(text: string, chunkSize = 12000, overlap = 100) {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

/** Compare CV form `input` against `pdfText` using an LLM and return normalized mismatches. */
export async function validateWithAI(
    input: z.infer<typeof createSchema>,
    pdfText: string,
    verbose = false
) {
    const openai = getOpenAI();
    const chunks = chunkText(pdfText, 12000, 100);

    // Build canonical pointer list once
    const allowedFields = pointersFromInput(input);

    // Compact schema: refer to fields by index (0..N-1) instead of huge enum of strings
    const schema = {
        name: "MismatchReport",
        schema: {
            type: "object",
            additionalProperties: false,
            required: ["mismatches"],
            properties: {
                mismatches: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["field_index", "expected", "actual", "message"],
                        properties: {
                            field_index: { type: "integer", minimum: 0, maximum: Math.max(0, allowedFields.length - 1) },
                            expected: { type: "string" },
                            actual: { type: "string" },
                            message: { type: "string" }
                        }
                    }
                }
            }
        },
        strict: true
    } as const;

    // Keep the prompt short; include allowed_fields once and refer by index.
    const mkPrompt = (chunk: string) => `
You are comparing a normalized CV form ("form") to OCR'd PDF text.

Return any mismatches using the JSON schema.
CRITICAL:
- Use "field_index" to point into the "allowed_fields" array (0-based).
- Put ALL values as strings (stringify arrays/objects/numbers).
- If there's no mismatch in this chunk, return [].

allowed_fields (canonical JSON Pointers):
${JSON.stringify(allowedFields)}

form (source of truth):
${JSON.stringify(input)}

pdf_chunk:
${chunk}
`;

    // Run chunks in parallel with a small pool + retries
    const chunkResults = await parallelMap(chunks, CONCURRENCY, async (chunk, i) => {
        const completion = await withRetry(() =>
            openai.chat.completions.create({
                model: MODEL,
                temperature: 0,
                messages: [{ role: "user", content: mkPrompt(chunk) }],
                response_format: { type: "json_schema", json_schema: schema }
            })
        );

        const raw = completion.choices?.[0]?.message?.content ?? '{"mismatches":[]}';
        if (verbose) console.log(`chunk ${i + 1}/${chunks.length}: ${raw.slice(0, 200)}...`);
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { mismatches: [] };
        }
        return Array.isArray(parsed?.mismatches) ? parsed.mismatches : [];
    });

    // Flatten + map back to pointers; drop bogus indices
    type Raw = { field_index: number; expected: string; actual: string; message: string };
    const all: Raw[] = chunkResults.flat();
    const mapped = all
        .map((m) => {
            const ptr = allowedFields[m.field_index];
            if (typeof ptr !== "string") return null;
            return {
                field: pointerToColumn(ptr),
                json_pointer: ptr,
                expected: toStr(m.expected),
                actual: toStr(m.actual),
                message: m.message
            };
        })
        .filter(Boolean) as Array<{
            field: string;
            json_pointer: string;
            expected: string;
            actual: string;
            message: string;
        }>;

    // De-duplicate locally (no extra LLM call)
    const byKey = new Map<string, (typeof mapped)[number]>();
    for (const m of mapped) {
        const key = `${m.json_pointer}|${m.expected}|${m.actual}`;
        if (!byKey.has(key)) byKey.set(key, m);
    }

    return Array.from(byKey.values());
}
