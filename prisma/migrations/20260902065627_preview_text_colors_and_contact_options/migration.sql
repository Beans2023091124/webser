-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "bookingUrl" TEXT,
ADD COLUMN     "contactNote" TEXT,
ADD COLUMN     "mutedTextColor" TEXT,
ADD COLUMN     "showEmailContact" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textColor" TEXT;
