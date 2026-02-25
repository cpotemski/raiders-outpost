-- AlterTable
ALTER TABLE "User"
ADD COLUMN "inactiveProjectSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
