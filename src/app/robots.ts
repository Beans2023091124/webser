import type { MetadataRoute } from "next";

/**
 * Crawl rules for every hostname this deployment answers on.
 *
 * The per-page `robots` metadata is what actually decides whether a client's
 * site is indexable; this file keeps crawlers out of the parts of the app that
 * are never worth indexing and would leak work in progress:
 *
 *   - /admin is behind a login, but there is no reason to advertise it.
 *   - /portal/<token> is a client's private page. The token is the only thing
 *     guarding it, so it must never end up in an index.
 *   - /p/<slug> is the preview path. Client sites should rank on their own
 *     domain, which the canonical points at, not on a Webser URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/portal/", "/p/", "/login", "/sites/"],
    },
  };
}
