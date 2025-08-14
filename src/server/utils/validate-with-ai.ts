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

/** Split `text` into overlapping chunks for robust LLM context handling. */
function chunkText(text: string, chunkSize = 9000, overlap = 300) {
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
    const chunks = chunkText(pdfText, 9000, 300);
    const allowedFields = pointersFromInput(input);

    const mkPrompt = (chunk: string) => `
Compare the CV form data to this PDF chunk.

- You MUST choose "field" ONLY from the provided JSON Pointer list.
- If unsure, pick the best matching pointer; DO NOT invent new names.
- Put values as strings (stringify arrays/objects/numbers).

Form (canonical pointers):
${JSON.stringify(allowedFields, null, 2)}

Form data:
${JSON.stringify(input, null, 2)}

PDF chunk:
${chunk}
`;

    const schema = {
        name: "MismatchReport",
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                mismatches: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["field", "expected", "actual", "message"],
                        properties: {
                            field: { type: "string", enum: allowedFields },
                            expected: { type: "string" },
                            actual: { type: "string" },
                            message: { type: "string" }
                        }
                    }
                }
            },
            required: ["mismatches"]
        },
        strict: true
    } as const;

    const chunkResults: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [{ role: "user", content: mkPrompt(chunks[i]!) }],
            response_format: { type: "json_schema", json_schema: schema }
        });
        const content = completion.choices[0]?.message.content ?? '{"mismatches": []}';
        if (verbose) console.log(`chunk ${i + 1}:`, content);
        chunkResults.push(JSON.parse(content).mismatches ?? []);
    }

    const all = chunkResults.flat();
    const byKey = new Map<string, any>();
    for (const m of all) {
        const key = `${m.field}|${m.expected}|${m.actual}`;
        if (!byKey.has(key)) byKey.set(key, m);
    }
    const merged = Array.from(byKey.values());

    const mergePrompt = `
Merge these mismatch arrays, remove duplicates, keep messages:

${JSON.stringify(merged, null, 2)}
`;

    const merge = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "user", content: mergePrompt }],
        response_format: { type: "json_schema", json_schema: schema }
    });

    const final = JSON.parse(merge.choices[0]?.message.content ?? '{"mismatches": []}');

    const normalized = (final.mismatches as any[]).map(m => ({
        field: pointerToColumn(m.field),
        json_pointer: m.field,
        expected: toStr(m.expected),
        actual: toStr(m.actual),
        message: m.message
    }));

    return normalized;
}
