/*
  Warnings:

  - You are about to drop the column `content` on the `AssignmentSubmission` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubmissionContentType" AS ENUM ('TEXT', 'MINDMAP', 'DOCUMENT', 'MIXED');

-- AlterTable
ALTER TABLE "AssignmentSubmission" DROP COLUMN "content",
ADD COLUMN     "contentType" "SubmissionContentType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "documentName" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "mindmapId" TEXT,
ADD COLUMN     "textContent" TEXT;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_mindmapId_fkey" FOREIGN KEY ("mindmapId") REFERENCES "Mindmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
