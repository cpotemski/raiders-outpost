ALTER TABLE "User"
ADD COLUMN "completedExpeditionSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
