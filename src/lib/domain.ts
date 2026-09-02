import { promises as dns } from "node:dns";

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

export function requiredRecords(domain: string, host: string): DnsRecord[] {
  return [
    {
      type: "CNAME",
      name: "www",
      value: host,
      note: `Makes www.${domain} work.`,
    },
    {
      type: "CNAME",
      name: "@",
      value: host,
      note: "Some registrars call this ALIAS, ANAME, or “root”.",
    },
  ];
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
