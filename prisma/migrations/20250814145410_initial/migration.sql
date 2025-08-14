/*
  Warnings:

  - You are about to drop the `CVSubmission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CVSubmission" DROP CONSTRAINT "CVSubmission_userId_fkey";

-- DropTable
DROP TABLE "public"."CVSubmission";

-- CreateTable
CREATE TABLE "public"."CsvSubmission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "skills" TEXT[],
    "experience" JSONB NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "status" "public"."ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "mismatches" JSONB,
    "extractedData" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CsvSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CsvSubmission_userId_status_createdAt_idx" ON "public"."CsvSubmission"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CsvSubmission_fullName_idx" ON "public"."CsvSubmission"("fullName");

-- AddForeignKey
ALTER TABLE "public"."CsvSubmission" ADD CONSTRAINT "CsvSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
