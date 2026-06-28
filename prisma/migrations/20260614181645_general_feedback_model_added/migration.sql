-- CreateEnum
CREATE TYPE "SiteFeedbackType" AS ENUM ('BUG', 'SUGGESTION', 'COMPLAINT', 'GENERAL');

-- CreateEnum
CREATE TYPE "SiteFeedbackStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "SiteFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SiteFeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" "SiteFeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SiteFeedback" ADD CONSTRAINT "SiteFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
