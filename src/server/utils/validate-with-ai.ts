import "server-only";

import type z from "zod";
import type { createSchema } from "../api/routers/cv";
import OpenAI from "openai";
import pdf from "pdf-parse";
import { promises as fs } from "node:fs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function extractPdfText(filePath: string) {
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    return data.text;
}

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

export async function validateWithAI(
    input: z.infer<typeof createSchema>,
    pdfText: string,
    verbose = false
) {
    const chunks = chunkText(pdfText, 9000, 300);
    const chunkResults: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = `
Compare the provided CV form data to this part of the PDF.

Form data:
${JSON.stringify(input, null, 2)}

PDF chunk:
${chunk}

Return JSON ONLY in this format:
{
  "mismatches": [
    { "field": "string", "expected": "string", "actual": "string", "message": "string" }
  ]
}
If there are no mismatches, return { "mismatches": [] }.
`;

        if (verbose) {
            console.log(`\n--- Sending chunk ${i + 1}/${chunks.length} ---`);
            console.log(prompt);
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message.content ?? "{}";

        if (verbose) {
            console.log(`--- Response for chunk ${i + 1} ---`);
            console.log(content);
        }

        chunkResults.push(content);
    }

    // Final summarization
    const mergePrompt = `
You are given multiple JSON mismatch reports from separate PDF chunks.
Merge them into one single JSON object, removing duplicates, and preserving details.

Reports:
${chunkResults.join("\n\n")}

Return JSON ONLY in this format:
{
  "mismatches": [
    { "field": "string", "expected": "string", "actual": "string", "message": "string" }
  ]
}
`;

    if (verbose) {
        console.log(`\n--- Sending merge prompt ---`);
        console.log(mergePrompt);
    }

    const mergeCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: mergePrompt }],
        response_format: { type: "json_object" },
    });

    const mergeContent = mergeCompletion.choices[0]?.message.content ?? "{}";

    if (verbose) {
        console.log(`--- Merge response ---`);
        console.log(mergeContent);
    }

    const finalParsed = JSON.parse(mergeContent);
    return finalParsed.mismatches ?? [];
}
