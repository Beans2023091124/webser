import { Resolver } from "node:dns/promises";

/**
 * Public resolvers rather than whatever the host inherits.
 *
 * Resolvers disagree while a record is propagating -- a home router and a
 * serverless function can return different answers for the same name minutes
 * apart -- and a check that quietly depends on which one it got will tell a
 * client their correct records are wrong. Cloudflare and Google both refresh
 * quickly and are the same everywhere this runs.
 */
const dns = new Resolver({ timeout: 5000, tries: 2 });
dns.setServers(["1.1.1.1", "8.8.8.8"]);

/**
 * Custom domains.
 *
 * The client either brings a domain they already own or buys one, then points
 * it at us with a DNS record. We never touch their registrar account — we hand
 * them the exact records and then check DNS ourselves rather than taking their
 * word for it, because "I added it" and "it's actually working" are different
 * things and only one of them should put a site live.
 */

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  note?: string;
};

/** Where client sites are hosted. Unset until deployment is wired up. */
export function deployHost(): string | null {
  const raw = process.env.WEBSER_DEPLOY_HOST?.trim();
  if (!raw) return null;
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

/**
 * The address for the root of a domain.
 *
 * The root of a zone cannot hold a CNAME -- the DNS spec forbids it, because a
 * CNAME cannot coexist with the SOA and NS records every zone root must have.
 * Registrars enforce this, and the ones that appear to allow it are really
 * offering ALIAS/ANAME under a CNAME label. Asking every client for a CNAME on
 * "@" therefore fails outright at a good number of registrars, so the root gets
 * an A record instead, which works everywhere.
 */
export function apexIp(): string {
  return process.env.WEBSER_APEX_IP?.trim() || "76.76.21.21";
}

/**
 * Tidy whatever the client typed into a bare domain, or null if it isn't one.
 * People paste "https://www.example.com/" and mean "example.com".
 */
export function normalizeDomain(raw: string): string | null {
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");

  if (!v || v.length > 253) return null;
  if (!v.includes(".")) return null;
  // Labels: alphanumeric and hyphens, not starting or ending with a hyphen.
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v)) {
    return null;
  }
  // A bare TLD-looking last label made only of digits isn't a real domain.
  if (/\.\d+$/.test(v)) return null;
  return v;
}

export type RecordInputs = {
  /** Apex A-record targets, straight from Vercel when we can ask it. */
  recommendedIPv4?: string[];
  /** www CNAME target, straight from Vercel when we can ask it. */
  recommendedCNAME?: string[];
  /** Ownership challenges Vercel wants before it will serve the domain. */
  challenges?: { type: string; domain: string; value: string }[];
};

/**
 * The records a client has to add at their registrar.
 *
 * These mirror what the host's own dashboard asks for, which matters for two
 * reasons: the domain shows as correctly configured there rather than sitting
 * on a red "Invalid Configuration" badge, and the owner debugging a client's
 * setup sees the same values in both places.
 *
 *   A     @    -> the host's current apex address
 *   CNAME www  -> the per-project target the host issues for this domain
 *   TXT   _vercel -> only when ownership has to be proven
 *
 * The www target is specific to the project and domain, not a shared name, so
 * it has to come from the API. Without the API there is no way to know it, and
 * a second A record to the apex address is used instead -- that serves the site
 * correctly, it just is not what the dashboard would prefer.
 *
 * The root is always an A record. The DNS spec forbids a CNAME at a zone apex,
 * since it cannot coexist with the SOA and NS records every zone must have, and
 * registrars enforce that.
 */
export function requiredRecords(
  domain: string,
  host: string,
  inputs: RecordInputs = {}
): DnsRecord[] {
  const apexTarget = inputs.recommendedIPv4?.[0] || apexIp();
  const wwwCname = inputs.recommendedCNAME?.[0];

  const records: DnsRecord[] = [
    {
      type: "A",
      name: "@",
      value: apexTarget,
      note: `Makes ${domain} work on its own.`,
    },
    wwwCname
      ? {
          type: "CNAME",
          name: "www",
          value: wwwCname,
          note: `Makes www.${domain} work. If your registrar won't accept this, an A record pointing at ${apexTarget} works too.`,
        }
      : {
          type: "A",
          name: "www",
          value: apexTarget,
          note: `Makes www.${domain} work. Same address as the row above — if your registrar fills this in for you, leave it.`,
        },
  ];

  // De-duplicated: Vercel returns the same challenge against both the apex and
  // www, and showing a client the identical TXT row twice invites them to
  // create a second, conflicting record.
  const seen = new Set<string>();
  for (const c of inputs.challenges ?? []) {
    if (c.type?.toUpperCase() !== "TXT") continue;
    const key = `${c.domain}|${c.value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Registrars want the name relative to the zone, not the full hostname.
    const name = c.domain.endsWith(`.${domain}`)
      ? c.domain.slice(0, -(domain.length + 1))
      : c.domain === domain
      ? "@"
      : c.domain;

    records.push({
      type: "TXT",
      name,
      value: c.value,
      note: "Proves the domain is yours. It can be removed once your site is live.",
    });
  }

  return records;
}

/**
 * Is a stored record set still safe to show a client?
 *
 * Records are written when a domain is provisioned and read back later, which
 * means they can outlive the code that produced them. One release wrote the
 * host's recommended addresses without splitting them, so rows went out saying
 *
 *   A  @  ->  216.198.79.1,64.29.17.1
 *
 * which no registrar accepts. Stored values are therefore checked before being
 * trusted, and anything malformed falls back to a freshly generated set rather
 * than being shown to a customer.
 */
export function storedRecordsUsable(records: unknown): records is DnsRecord[] {
  if (!Array.isArray(records) || records.length === 0) return false;

  const hostname = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
  const ipv4 = (v: string) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(v) && v.split(".").every((n) => Number(n) <= 255);

  let hasApexA = false;

  for (const r of records as DnsRecord[]) {
    if (!r || typeof r.type !== "string" || typeof r.name !== "string" || typeof r.value !== "string") {
      return false;
    }
    const value = r.value.trim();
    if (!value || value.includes(",") || /\s/.test(value)) return false;

    switch (r.type.toUpperCase()) {
      case "A":
        if (!ipv4(value)) return false;
        if (r.name === "@") hasApexA = true;
        break;
      case "CNAME":
        if (!hostname.test(value.replace(/\.$/, ""))) return false;
        break;
      case "TXT":
        break;
      default:
        // An unknown type means the format has moved on; regenerate instead.
        return false;
    }
  }

  // The root record is the one that must always be present.
  return hasApexA;
}

/**
 * Registrar search links for a client who still needs to buy a domain.
 *
 * Only GoDaddy takes the name in the URL — IONOS and Squarespace ignore a
 * query string and land on their own search box — so the portal shows the
 * suggested name as copyable text alongside these rather than pretending
 * every link arrives pre-filled.
 */
export function registrarLinks(query: string) {
  return [
    {
      name: "GoDaddy",
      url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(query)}`,
      note: "Best known. Say no to the extras",
    },
    {
      name: "IONOS",
      url: "https://www.ionos.com/domains/domain-names",
      note: "Cheap first year, dearer after",
    },
    {
      name: "Squarespace",
      url: "https://domains.squarespace.com/",
      note: "Simple, flat pricing",
    },
  ];
}

/**
 * Does the domain actually serve the site over HTTPS?
 *
 * DNS resolving to us is necessary but not sufficient. The host only answers
 * for domains attached to the project, and until one is, the TLS handshake
 * fails and the visitor gets a browser security warning. Checking DNS alone
 * and then telling a client "you are live" is how somebody ends up handing out
 * a business card with a dead address on it.
 *
 * A 200 means our app served their site. Our own 404 page returns 404, so a
 * domain the host answers for but we do not recognise is still not ready.
 */
/** One HTTPS fetch, true only if it answered with a success status. */
async function serves(hostname: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://${hostname}/`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "Webser-domain-check" },
    });
    return res.ok;
  } catch {
    // Almost always a failed TLS handshake, which is what a domain that has
    // not been attached to the host looks like from outside.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type ServeCheck = {
  /** True if the site is reachable at either address. */
  ok: boolean;
  apexOk: boolean;
  wwwOk: boolean;
  detail: string;
};

/**
 * Is the site actually reachable over HTTPS, and at which address?
 *
 * Both are checked because they fail independently. Plenty of registrars will
 * not let a customer touch the root of their zone at all -- IONOS blocks it
 * whenever one of their own services is attached to the domain -- and refusing
 * to publish a site that is demonstrably working on www would strand somebody
 * at the last step through no fault of theirs.
 */
export async function checkDomainServes(domain: string): Promise<ServeCheck> {
  const [apexOk, wwwOk] = await Promise.all([serves(domain), serves(`www.${domain}`)]);

  if (apexOk) {
    return { ok: true, apexOk, wwwOk, detail: `${domain} is serving your site over HTTPS.` };
  }

  if (wwwOk) {
    return {
      ok: true,
      apexOk,
      wwwOk,
      detail:
        `www.${domain} is working. ${domain} on its own isn't yet — that's the A record ` +
        `on "@". Your site is live either way; add it when you can.`,
    };
  }

  return {
    ok: false,
    apexOk,
    wwwOk,
    detail:
      "The records look right, but the secure certificate for your address is still being issued. This usually takes a few minutes.",
  };
}

/**
 * Does this domain actually point at us yet?
 *
 * Checked two ways because registrars differ: a plain CNAME on www, or apex
 * records that resolve to the same addresses as our host (what ALIAS/ANAME
 * and flattened CNAMEs end up looking like from outside).
 */
export async function checkDomainPointsToUs(
  domain: string,
  host: string
): Promise<{ ok: boolean; detail: string }> {
  const wanted = host.replace(/\.$/, "").toLowerCase();

  try {
    const cnames = await dns.resolveCname(`www.${domain}`);
    if (cnames.some((c) => c.replace(/\.$/, "").toLowerCase() === wanted)) {
      return { ok: true, detail: `www.${domain} is pointing at your site.` };
    }
  } catch {
    // No CNAME on www — fall through to the apex check.
  }

  const [hostIps, apexIps] = await Promise.all([
    dns.resolve4(wanted).catch(() => [] as string[]),
    dns.resolve4(domain).catch(() => [] as string[]),
  ]);

  // The A record we actually ask for on the root.
  if (apexIps.includes(apexIp())) {
    return { ok: true, detail: `${domain} is pointing at your site.` };
  }

  // A registrar that does support ALIAS/ANAME, or a flattened CNAME, ends up
  // resolving to the same addresses as our host. Accept that too rather than
  // telling someone their working setup is wrong.
  if (hostIps.length > 0 && apexIps.some((ip) => hostIps.includes(ip))) {
    return { ok: true, detail: `${domain} is pointing at your site.` };
  }

  if (apexIps.length > 0) {
    return {
      ok: false,
      detail: `${domain} is registered, but it's still pointing somewhere else. If you've just added the records, give it a little longer.`,
    };
  }

  return {
    ok: false,
    detail: `We can't see the records for ${domain} yet. They can take anywhere from a few minutes to a few hours to spread across the internet.`,
  };
}
