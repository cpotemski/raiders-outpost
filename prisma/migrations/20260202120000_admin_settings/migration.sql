-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL,
    "disabledProjectSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "disabledItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);
