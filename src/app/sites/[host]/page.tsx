import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeHost } from "@/lib/host";
import { PublicSite, siteMetadata } from "@/components/site/public-site";

/**
 * A client's website served from their own domain.
 *
 * Middleware rewrites the root of any hostname we don't recognise to here,
 * with the hostname in the path, and this route does the database lookup that
 * middleware can't.
 *
 * The folder can't be underscore-prefixed: the App Router treats those as
 * private and excludes them from routing entirely, so the rewrite 404s.
 * Reached directly at /sites/<host> it renders the same page, which is
 * harmless — the content is public either way.
 */

export const dynamic = "force-dynamic";

async function previewForHost(hostParam: string) {
  const host = normalizeHost(decodeURIComponent(hostParam));
  if (!host) return null;

  const domain = await prisma.domain.findFirst({
    where: { domainName: host },
    select: { project: { select: { status: true, preview: true } } },
  });

  const project = domain?.project;
  if (!project || project.status === "CANCELLED") return null;

  // Served as soon as the domain is on the project, before the DNS check has
  // passed: the client needs to be able to see it working at their address in
  // order to believe the setup worked.
  return project.preview;
}

export async function generateMetadata({ params }: { params: { host: string } }) {
  const preview = await previewForHost(params.host);
  if (!preview) return { title: "Not found" };
  return siteMetadata(preview);
}

export default async function ClientDomainSitePage({ params }: { params: { host: string } }) {
  const preview = await previewForHost(params.host);
  if (!preview) notFound();
  return <PublicSite preview={preview} />;
}
