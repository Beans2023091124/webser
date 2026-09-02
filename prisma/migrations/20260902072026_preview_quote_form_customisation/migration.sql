-- AlterTable
ALTER TABLE "Preview" ADD COLUMN     "formBlurb" TEXT,
ADD COLUMN     "formButtonText" TEXT,
ADD COLUMN     "formHeading" TEXT,
ADD COLUMN     "formMessageLabel" TEXT,
ADD COLUMN     "formNote" TEXT,
ADD COLUMN     "formRequireEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formServiceLabel" TEXT,
ADD COLUMN     "formShowMessage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "formShowService" BOOLEAN NOT NULL DEFAULT true;
