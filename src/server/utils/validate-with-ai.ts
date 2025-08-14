import "server-only";

import type z from "zod";
import type { createSchema } from "../api/routers/cv";
import OpenAI from "openai";
import pdf from "pdf-parse";
import { promises as fs } from "node:fs";
import { env } from "~/env";

// --- Tunables ---
const MODEL = "gpt-4o-mini";
const CONCURRENCY = 5;
const MAX_RETRIES = 3;

// --- Helpers ---
function getOpenAI() {
    const apiKey = env.OPENAI_API_KEY;
    return new OpenAI({ apiKey });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let attempt = 0;
    while (true) {
        try { return await fn(); }
        catch (e: any) {
            const status = e?.status ?? e?.response?.status;
            const retriable = status === 429 || (typeof status === "number" && status >= 500);
            if (!retriable || attempt >= retries) throw e;
            const delay = Math.min(2000 * 2 ** attempt, 10000) + Math.floor(Math.random() * 300);
            await sleep(delay); attempt++;
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
                const i = next++; if (i >= items.length) return;
                try { results[i] = await worker(items[i]!, i); }
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                catch { /* keep going; mark this chunk empty */ // @ts-expect-error
                    results[i] = [];
                }
            }
        })
    );
    return results;
}

// --- Your existing utilities ---
export async function extractPdfText(filePath: string) {
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    return data.text;
}

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

// --- Main ---
export async function validateWithAI(
    input: z.infer<typeof createSchema>,
    pdfText: string,
    verbose = false
) {
    const openai = getOpenAI();
    const chunks = chunkText(pdfText, 12000, 100);

    const mkPrompt = (chunk: string) => `
Compare the provided CV form data to this part of the PDF.

Form data:
${JSON.stringify(input, null, 2)}

PDF chunk:
${chunk}

Return JSON ONLY in this format:
{ "mismatches": [ { "field": "string", "expected": "string", "actual": "string", "message": "string" } ] }
If there are no mismatches, return { "mismatches": [] }.
`.trim();

    // Run all chunk calls in parallel (with a small concurrency pool)
    const perChunk = await parallelMap(chunks, CONCURRENCY, async (chunk, i) => {
        const completion = await withRetry(() =>
            openai.chat.completions.create({
                model: MODEL,
                messages: [{ role: "user", content: mkPrompt(chunk) }],
                response_format: { type: "json_object" }
            })
        );

        const raw = completion.choices[0]?.message?.content ?? "{}";
        if (verbose) console.log(`--- chunk ${i + 1}/${chunks.length} response ---\n${raw.slice(0, 300)}...`);

        // Be robust to stray whitespace or tool noise (unlikely with json_object, but safe)
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            const first = raw.indexOf("{"), last = raw.lastIndexOf("}");
            parsed = first >= 0 && last > first ? JSON.parse(raw.slice(first, last + 1)) : { mismatches: [] };
        }
        const arr = Array.isArray(parsed?.mismatches) ? parsed.mismatches : [];
        // Ensure shape
        return arr.filter((m: any) => m && typeof m.field === "string");
    });

    // Flatten + dedupe locally (no extra LLM merge call)
    type M = { field: string; expected: string; actual: string; message: string };
    const all: M[] = perChunk.flat();

    const byKey = new Map<string, M>();
    for (const m of all) {
        const key = `${m.field}|${m.expected}|${m.actual}`;
        if (!byKey.has(key)) byKey.set(key, m);
    }

    const merged = Array.from(byKey.values());
    if (verbose) console.log(`Merged ${all.length} → ${merged.length} mismatches`);
    return merged;
}
