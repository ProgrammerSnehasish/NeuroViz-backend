-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT DEFAULT '',
ADD COLUMN     "updatedBy" TEXT DEFAULT '',
ALTER COLUMN "middleName" SET DEFAULT '';
