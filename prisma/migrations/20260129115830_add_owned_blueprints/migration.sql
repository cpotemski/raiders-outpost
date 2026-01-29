-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ownedBlueprints" TEXT[] DEFAULT ARRAY[]::TEXT[];
