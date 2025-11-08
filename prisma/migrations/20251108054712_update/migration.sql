-- DropIndex
DROP INDEX "StudentInvite_token_key";

-- AlterTable
ALTER TABLE "StudentInvite" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "StudentInvite" ADD CONSTRAINT "StudentInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
