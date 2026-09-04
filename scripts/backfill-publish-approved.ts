/**
 * Publishes projects that were approved under the old flow.
 *
 *   npx tsx scripts/backfill-publish-approved.ts
 *
 * Approval used to move a project to APPROVED and then wait for the client to
 * connect a domain before anything went live. Approval now publishes straight
 * away on the free address, so anything left sitting in APPROVED or DEPLOYING
 * is a site that was signed off but never went up. This puts them live.
 *
 * Safe to re-run: it only touches projects in those two states.
 */
import { prisma } from "../src/lib/prisma";
import { publishedSiteUrl } from "../src/lib/host";

async function main() {
  const stranded = await prisma.project.findMany({
    where: { status: { in: ["APPROVED", "DEPLOYING"] } },
    select: { id: true, businessName: true, status: true, preview: { select: { slug: true } } },
  });

  if (stranded.length === 0) {
    console.log("Nothing stranded — no projects waiting in APPROVED or DEPLOYING.");
    return;
  }

  for (const p of stranded) {
    if (!p.preview) {
      console.log(`skipped ${p.businessName} — no preview to publish`);
      continue;
    }
    const liveUrl = publishedSiteUrl(p.preview.slug);
    await prisma.project.update({
      where: { id: p.id },
      data: { status: "LIVE", liveUrl },
    });
    console.log(`published ${p.businessName} (${p.status} -> LIVE) at ${liveUrl}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
