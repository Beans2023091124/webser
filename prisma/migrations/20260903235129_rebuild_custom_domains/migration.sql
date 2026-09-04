-- Rebuild custom domains around a single question: does the address serve
-- the site? The three status columns tracked separately drifted out of
-- agreement, so they are replaced by verifiedAt / lastCheckedAt / lastError.

-- A row with no domain name never meant anything; domainName is required now.
DELETE FROM "Domain" WHERE "domainName" IS NULL;

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "deploymentStatus",
DROP COLUMN "deploymentUrl",
DROP COLUMN "dnsStatus",
DROP COLUMN "hostingProvider",
DROP COLUMN "registrar",
DROP COLUMN "requiredDnsRecords",
DROP COLUMN "sslStatus",
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "domainName" SET NOT NULL;

-- DropEnum
DROP TYPE "DeploymentStatus";

-- DropEnum
DROP TYPE "DnsStatus";

-- DropEnum
DROP TYPE "SslStatus";

