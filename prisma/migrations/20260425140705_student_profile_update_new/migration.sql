/*
  Warnings:

  - You are about to drop the column `gurdianEmail` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `gurdianPhone` on the `StudentProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "gurdianEmail",
DROP COLUMN "gurdianPhone",
ADD COLUMN     "guardianEmail" TEXT DEFAULT 'Not mentioned yet.',
ADD COLUMN     "guardianPhone" TEXT DEFAULT 'Not mentioned yet.';
