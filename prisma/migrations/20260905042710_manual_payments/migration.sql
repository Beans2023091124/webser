-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "method" TEXT,
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "cashAppTag" TEXT,
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "venmoHandle" TEXT;
