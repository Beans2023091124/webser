-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "ownerName" TEXT NOT NULL DEFAULT '',
    "businessName" TEXT NOT NULL DEFAULT 'Webser',
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
