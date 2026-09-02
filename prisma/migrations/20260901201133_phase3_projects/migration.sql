-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "liveUrl" TEXT,
ADD COLUMN     "monthlyPrice" DECIMAL(10,2),
ADD COLUMN     "stripeCustomerId" TEXT;
