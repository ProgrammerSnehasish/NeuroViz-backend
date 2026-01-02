-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BehaviorType" ADD VALUE 'MOUSE_CLICK';
ALTER TYPE "BehaviorType" ADD VALUE 'SCROLL';
ALTER TYPE "BehaviorType" ADD VALUE 'KEYSTROKE';
ALTER TYPE "BehaviorType" ADD VALUE 'EYE_MOVEMENT';
ALTER TYPE "BehaviorType" ADD VALUE 'EMOTION_CHANGE';
ALTER TYPE "BehaviorType" ADD VALUE 'HOVER';
