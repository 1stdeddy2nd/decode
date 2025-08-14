import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Prisma } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { extractPdfText, validateWithAI } from "~/server/utils/validate-with-ai";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const phoneRegex = /^[0-9+()[\]\s-]{6,}$/;

const getListSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    status: z.enum(["PENDING", "PASSED", "FAILED"]).optional(),
});

const mismatchSchema = z.object({
    field: z.string(),
    expected: z.any().optional(),
    actual: z.any().optional(),
    message: z.string(),
});
const mismatchArraySchema = z.array(mismatchSchema);

function normalizeMismatches(m: Prisma.JsonValue | null) {
    const val = m ?? [];
    return mismatchArraySchema.safeParse(val).success
        ? (val as z.infer<typeof mismatchArraySchema>)
        : [];
}

export const createSchema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().trim().regex(phoneRegex),
    skills: z.array(z.string()).min(1),
    file: z.object({
        fileName: z.string().min(1),
        mime: z.literal("application/pdf"),
        base64: z.string().min(1),
    }),
    experience: z.array(z.object({
        date: z.string().min(1),
        company: z.string().min(1),
        position: z.string().min(1),
        description: z.string(),
        durationMonths: z.number().int().positive(),
    })).min(1)
});

async function savePdfToLocalProject(fileName: string, base64: string) {
    // decode & validate size
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_FILE_BYTES) {
        throw new Error("File too large (max 5 MB)");
    }

    // ensure uploads dir exists (project-relative)
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "cvs");
    await fs.mkdir(uploadsDir, { recursive: true });

    // randomize to avoid collisions
    const ext = path.extname(fileName).toLowerCase() || ".pdf";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const absPath = path.join(uploadsDir, safeName);

    await fs.writeFile(absPath, buffer);

    const publicPath = `/uploads/cvs/${safeName}`;
    return publicPath;
}


export const cvRouter = createTRPCRouter({
    list: protectedProcedure
        .input(getListSchema)
        .query(async ({ ctx, input }) => {
            const { page, pageSize, search, status } = input;

            const where: Prisma.CVSubmissionWhereInput = {
                userId: ctx.session.user.id,
                ...(status ? { status } : {}),
                ...(search
                    ? {
                        OR: [
                            { fullName: { contains: search, mode: "insensitive" } },
                            { email: { contains: search, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            };

            const [rawItems, total] = await Promise.all([
                ctx.db.cVSubmission.findMany({
                    where,
                    orderBy: [
                        { createdAt: "desc" },
                        { id: "desc" },
                    ],
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    select: {
                        id: true,
                        createdAt: true,
                        updatedAt: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        status: true,
                        score: true,
                        skills: true,
                        pdfPath: true,
                        mismatches: true
                    },
                }),
                ctx.db.cVSubmission.count({ where }),
            ]);

            const items = rawItems.map((it) => ({
                ...it,
                mismatches: normalizeMismatches(it.mismatches),
            }));


            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const hasPrevPage = page > 1;
            const hasNextPage = page < totalPages;

            return {
                items,
                pageInfo: {
                    page,
                    pageSize,
                    totalItems: total,
                    totalPages,
                    hasPrevPage,
                    hasNextPage,
                },
            };
        }),

    create: protectedProcedure
        .input(createSchema)
        .mutation(async ({ ctx, input }) => {
            const pdfPath = await savePdfToLocalProject(input.file.fileName, input.file.base64);

            // 1. Extract PDF text
            const pdfAbsPath = path.join(process.cwd(), "public", pdfPath);
            const pdfText = await extractPdfText(pdfAbsPath);

            // 2. Validate with AI
            const mismatches = await validateWithAI(input, pdfText);

            // 3. Decide status
            const status = mismatches.length === 0 ? "PASSED" : "FAILED";

            // 4. Save in DB
            const submission = await ctx.db.cVSubmission.create({
                data: {
                    fullName: input.fullName,
                    email: input.email,
                    phone: input.phone,
                    skills: input.skills,
                    pdfPath,
                    experience: input.experience,
                    mismatches,
                    extractedData: {},
                    status,
                    userId: ctx.session.user.id,
                },
                select: { id: true, status: true, mismatches: true },
            });

            return submission;
        }),


    delete: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.cVSubmission.delete({
                where: { id: input.id, userId: ctx.session.user.id },
            });

            return { ok: true };
        }),
});
