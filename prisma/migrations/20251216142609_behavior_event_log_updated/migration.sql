/*
  Warnings:

  - Changed the type of `type` on the `BehaviorEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('PAGE_FOCUS', 'CLICK', 'IDLE');

-- AlterTable
ALTER TABLE "BehaviorEvent" DROP COLUMN "type",
ADD COLUMN     "type" "BehaviorType" NOT NULL;

-- CreateIndex
CREATE INDEX "BehaviorEvent_type_idx" ON "BehaviorEvent"("type");
