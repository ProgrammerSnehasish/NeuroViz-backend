/*
  Warnings:

  - You are about to drop the column `experience` on the `TeacherProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Subjects" AS ENUM ('ENGLISH', 'BENGALI', 'HINDI', 'SANSKRIT', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'COMPUTER_SCIENCE', 'COMMERCE', 'ECONOMICS', 'LAW');

-- CreateEnum
CREATE TYPE "Languages" AS ENUM ('BENGALI', 'ENGLISH', 'HINDI');

-- AlterTable
ALTER TABLE "TeacherProfile" DROP COLUMN "experience",
ADD COLUMN     "availability" TEXT,
ADD COLUMN     "bio" TEXT DEFAULT 'Not mentioned yet.',
ADD COLUMN     "certifications" TEXT[],
ADD COLUMN     "experienceDetails" TEXT,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "languages" "Languages"[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "subjects" "Subjects"[],
ADD COLUMN     "totalReviews" INTEGER DEFAULT 0;
