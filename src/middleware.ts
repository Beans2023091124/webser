import { NextResponse, type NextRequest } from "next/server";
import { isAppHost, normalizeHost } from "@/lib/host";

/**
 * Serves a client's website from their own domain.
 *
 * Middleware runs on the edge, where Prisma can't, so this deliberately does
 * no database work: it only decides "this hostname isn't ours" and rewrites to
 * a route that can look the domain up in Node. Only the root path is rewritten
 * — a client site is a single page, and leaving everything else alone keeps
 * /p/<slug>/favicon, /_next assets, and the API reachable on their domain.
 */
export function middleware(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host"));
  if (isAppHost(host)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(host as string)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/"],
};
