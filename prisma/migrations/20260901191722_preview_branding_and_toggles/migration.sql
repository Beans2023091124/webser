-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "footerColor" TEXT,
ADD COLUMN     "galleryHeading" TEXT,
ADD COLUMN     "headingColor" TEXT,
ADD COLUMN     "showStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "surfaceColor" TEXT;
