-- AlterTable
ALTER TABLE "User" ADD COLUMN "publicProfileSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicProfileSlug_key" ON "User"("publicProfileSlug");
