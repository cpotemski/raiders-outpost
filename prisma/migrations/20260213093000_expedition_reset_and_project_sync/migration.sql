ALTER TABLE "User" ADD COLUMN "expeditionResetDismissedCycle" TEXT;
ALTER TABLE "User" ADD COLUMN "expeditionResetCompletedCycle" TEXT;

CREATE UNIQUE INDEX "ProjectStage_projectId_sortOrder_key" ON "ProjectStage"("projectId", "sortOrder");
