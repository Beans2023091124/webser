/**
 * Which website a request is asking for.
 *
 * A single deployment serves three kinds of hostname: the platform itself
 * (admin, portals), the host client domains are pointed at, and the client
 * domains themselves. Only the last kind should render a customer's website.
 *
 * This file is imported by middleware, so it must stay edge-safe — no Prisma,
 * no node: modules, no filesystem.
 */

/** Strip the port and a leading "www." so lookups are stable. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const h = raw
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!h) return null;
  return h.startsWith("www.") ? h.slice(4) : h;
}

/**
 * Hostnames that mean "serve the platform", not a client site.
 *
 * WEBSER_DEPLOY_HOST is included deliberately: it's the CNAME target clients
 * aim at, so it has to resolve to this app, but visiting it directly should
 * land on Webser rather than an arbitrary customer's website.
 */
export function appHosts(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "[::1]"]);
  for (const value of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.WEBSER_DEPLOY_HOST,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const h = normalizeHost(value);
    if (h) hosts.add(h);
  }
  return [...hosts];
}

/** The app's own registrable domain, e.g. "webser.org". */
export function baseDomain(): string | null {
  for (const v of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const h = normalizeHost(v);
    if (h) return h;
  }
  return null;
}

/**
 * "larsen-plumbing.webser.org" with base "webser.org" -> "larsen-plumbing".
 *
 * Only a single label counts, so "a.b.webser.org" resolves to nothing rather
 * than being treated as the site "a.b".
 */
export function subdomainOf(host: string, base: string): string | null {
  const suffix = `.${base}`;
  if (host === base || !host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".")) return null;
  return label;
}

/**
 * Where a published site lives: <slug>.webser.org.
 *
 * Falls back to the /p/<slug> path when no app URL is configured, so nothing
 * ends up linking to a host that doesn't exist.
 */
export function publishedSiteUrl(slug: string): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return `/p/${slug}`;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    return `${u.protocol}//${slug}.${host}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return `/p/${slug}`;
  }
}

export function isAppHost(host: string | null): boolean {
  // No Host header at all: serve the platform rather than guess.
  if (!host) return true;
  if (appHosts().includes(host)) return true;
  // Vercel preview deployments.
  if (host.endsWith(".vercel.app")) return true;
  // Note *.localhost is deliberately NOT exempt: Chrome resolves it to
  // loopback, so http://clientdomain.localhost:3000 is how you exercise the
  // custom-domain path locally. Add a Domain row with that hostname to try it.
  return false;
}
