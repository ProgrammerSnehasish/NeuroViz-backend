-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "evaluationMode" TEXT DEFAULT 'MANUAL',
ADD COLUMN     "metadata" JSONB DEFAULT '{}';
