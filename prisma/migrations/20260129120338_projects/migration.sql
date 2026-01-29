/*
  Warnings:

  - You are about to drop the column `ownedBlueprints` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "ownedBlueprints";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectItem" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantityRequired" INTEGER NOT NULL,

    CONSTRAINT "ProjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProjectItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectItemId" TEXT NOT NULL,
    "quantityOwned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserProjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectItem_stageId_itemName_key" ON "ProjectItem"("stageId", "itemName");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectItem_userId_projectItemId_key" ON "UserProjectItem"("userId", "projectItemId");

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectItem" ADD CONSTRAINT "UserProjectItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectItem" ADD CONSTRAINT "UserProjectItem_projectItemId_fkey" FOREIGN KEY ("projectItemId") REFERENCES "ProjectItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
