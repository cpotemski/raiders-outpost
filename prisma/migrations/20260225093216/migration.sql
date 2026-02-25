-- DropIndex
DROP INDEX "CommunityMember_userId_idx";

-- AlterTable
ALTER TABLE "AdminSettings" ALTER COLUMN "id" SET DEFAULT 'global',
ALTER COLUMN "updatedAt" DROP DEFAULT;
