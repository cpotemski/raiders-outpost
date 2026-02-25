-- CreateTable
CREATE TABLE "EasyItemFilter" (
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EasyItemFilter_pkey" PRIMARY KEY ("itemId")
);
