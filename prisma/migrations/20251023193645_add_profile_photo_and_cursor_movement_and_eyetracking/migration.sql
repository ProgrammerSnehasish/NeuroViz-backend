-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cursorMovement" JSONB,
ADD COLUMN     "eyeTrackingData" JSONB,
ADD COLUMN     "profilePhoto" TEXT DEFAULT '';
