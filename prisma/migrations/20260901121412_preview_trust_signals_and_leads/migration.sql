-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "emergencyService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "freeEstimates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "googleRating" DECIMAL(2,1),
ADD COLUMN     "headingFont" TEXT NOT NULL DEFAULT 'Inter',
ADD COLUMN     "layoutVariant" TEXT NOT NULL DEFAULT 'trade',
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "reviewCount" INTEGER,
ADD COLUMN     "serviceAreas" JSONB,
ADD COLUMN     "whyChooseUs" JSONB,
ADD COLUMN     "yearsInBusiness" INTEGER;

-- CreateTable
CREATE TABLE "PreviewLead" (
    "id" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "service" TEXT,
    "message" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreviewLead_previewId_idx" ON "PreviewLead"("previewId");

-- AddForeignKey
ALTER TABLE "PreviewLead" ADD CONSTRAINT "PreviewLead_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
