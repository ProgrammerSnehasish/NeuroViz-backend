/*
  Warnings:

  - You are about to drop the column `cursorMovement` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `eyeTrackingData` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "cursorMovement",
DROP COLUMN "eyeTrackingData";
