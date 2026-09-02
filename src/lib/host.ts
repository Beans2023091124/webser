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
