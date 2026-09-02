import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeHost, baseDomain, subdomainOf } from "@/lib/host";
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

  // 1. A domain the client brought themselves.
  const domain = await prisma.domain.findFirst({
    where: { domainName: host },
    select: { project: { select: { status: true, preview: true } } },
  });
  if (domain?.project) {
    // Served as soon as the domain is on the project, before the DNS check has
    // passed: the client needs to see it working at their address in order to
    // believe the setup worked.
    return domain.project.status === "CANCELLED" ? null : domain.project.preview;
  }

  // 2. The address every site gets for free: <slug>.webser.org.
  const base = baseDomain();
  const slug = base ? subdomainOf(host, base) : null;
  if (!slug) return null;

  const preview = await prisma.preview.findUnique({ where: { slug } });
  return preview;
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
