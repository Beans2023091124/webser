import { Resolver } from "node:dns/promises";

/**
 * Custom domains.
 *
 * A customer's site is already live on its free address before any of this
 * runs, so nothing here can stop a site working -- the worst outcome is that
 * their own address is not connected yet.
 *
 * There is one question that matters: does the address serve the site? It is
 * answered by fetching the address the way a customer would, rather than by
 * inferring it from DNS records or from what a hosting API believes. DNS is
 * used only to explain a failure, never to declare success, because the two
 * disagree often enough to matter: records can look perfect while the
 * certificate has not been issued, and they can look wrong while the site
 * serves fine.
 */

/**
 * Public resolvers rather than whatever the host inherits.
 *
 * Resolvers disagree while a record is propagating -- a home router and a
 * serverless function can return different answers for the same name minutes
 * apart -- and a check that quietly depends on which one it got will tell a
 * customer their correct records are wrong.
 */
const dns = new Resolver({ timeout: 5000, tries: 2 });
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export type DnsRecord = {
  type: "A" | "TXT";
  name: string;
  value: string;
  note?: string;
};

/** Where client sites are served from. Unset until hosting is configured. */
export function deployHost(): string | null {
  const raw = process.env.WEBSER_DEPLOY_HOST?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "").toLowerCase();
}

/**
 * The address customers point their domain at.
 *
 * Overridable so a change of host does not need a code change. The default is
 * the published address for apex domains on the current host.
 */
export function edgeIp(): string {
  return process.env.WEBSER_APEX_IP?.trim() || "216.198.79.1";
}

/**
 * Tidy whatever the customer typed into a bare domain, or null if it isn't one.
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

  if (!v || v.length > 253 || !v.includes(".")) return null;
  // Labels: alphanumeric and hyphens, not starting or ending with a hyphen.
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v)) {
    return null;
  }
  // A last label made only of digits is an IP address, not a domain.
  if (/\.\d+$/.test(v)) return null;
  return v;
}

/**
 * The records a customer adds at their registrar.
 *
 * Two A records, both to the same address, even though the host's dashboard
 * would rather see a CNAME on www.
 *
 * Registrars manage the root and www as one unit. IONOS creates an A record
 * for www whenever you set one on the root, then disables the pair if you add
 * a CNAME there afterwards -- so the two records the dashboard asks for cannot
 * both exist at once, and a customer following them gets a conflict warning
 * and no working site.
 *
 * A records avoid that and cost nothing: the host routes on the Host header,
 * not the address, so one address serves every customer and a certificate is
 * issued per name. Confirmed against a live customer domain where both the
 * root and www resolve to that single address and return 200 with valid
 * certificates.
 *
 * The root could not be a CNAME regardless: the DNS spec forbids one at a zone
 * apex, since it cannot coexist with the SOA and NS records every zone has.
 */
export function requiredRecords(domain: string, ip = edgeIp()): DnsRecord[] {
  return [
    { type: "A", name: "@", value: ip, note: `Makes ${domain} work on its own.` },
    {
      type: "A",
      name: "www",
      value: ip,
      note: `Makes www.${domain} work. Same address on purpose — if your registrar adds this row for you, leave it.`,
    },
  ];
}

/** Registrar search links for a customer who still needs to buy a domain. */
export function registrarLinks(query: string) {
  return [
    {
      name: "GoDaddy",
      url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(query)}`,
      note: "Best known. Say no to the extras",
    },
    { name: "IONOS", url: "https://www.ionos.com/domains/domain-names", note: "Cheap first year, dearer after" },
    { name: "Squarespace", url: "https://domains.squarespace.com/", note: "Simple, flat pricing" },
  ];
}

export type ServeResult = {
  /** The site is reachable at at least one of the two names. */
  ok: boolean;
  apexOk: boolean;
  wwwOk: boolean;
  /** Wording for the customer, phrased for whichever case this is. */
  detail: string;
};

/** One HTTPS fetch. True only for a success status. */
async function serves(hostname: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://${hostname}/`, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "Webser-domain-check" },
    });
    return res.ok;
  } catch {
    // Almost always a failed TLS handshake, which is how a domain the host has
    // no certificate for looks from outside.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Does the address actually serve the site?
 *
 * Both names are checked because they fail independently, and either one alone
 * is enough to call the domain connected. Plenty of registrars will not let a
 * customer set the root at all -- IONOS blocks it whenever one of their own
 * services is attached -- and refusing a domain that demonstrably works on www
 * would strand someone through no fault of theirs.
 */
export async function checkServes(domain: string): Promise<ServeResult> {
  const [apexOk, wwwOk] = await Promise.all([serves(domain), serves(`www.${domain}`)]);

  if (apexOk && wwwOk) {
    return { ok: true, apexOk, wwwOk, detail: `${domain} is connected and serving your site.` };
  }
  if (apexOk) {
    return {
      ok: true,
      apexOk,
      wwwOk,
      detail: `${domain} is connected. www.${domain} isn't answering yet — add the www row when you can.`,
    };
  }
  if (wwwOk) {
    return {
      ok: true,
      apexOk,
      wwwOk,
      detail: `www.${domain} is connected. ${domain} on its own isn't answering yet — that's the @ row.`,
    };
  }
  return { ok: false, apexOk, wwwOk, detail: "" };
}

/**
 * Why isn't it serving? Used only to explain a failure, never to declare
 * success. Returns wording aimed at the customer.
 *
 * Deliberately does not compare the resolved address against the one we hand
 * out. The host answers on several edge addresses and rotates which it
 * recommends, so "points at the address we asked for" is not the same question
 * as "works" -- an earlier version of this told customers their working records
 * were wrong because they resolved to a different valid edge.
 *
 * When the host API is available its own verdict is used instead, since it is
 * the only authority on whether it can serve the name.
 */
export async function explainFailure(
  domain: string,
  misconfigured?: boolean | null
): Promise<string> {
  const [apex, www] = await Promise.all([
    dns.resolve4(domain).catch(() => [] as string[]),
    dns.resolve4(`www.${domain}`).catch(() => [] as string[]),
  ]);

  if (apex.length === 0 && www.length === 0) {
    return `We can't see any records for ${domain} yet. Add the rows below at your registrar — once saved they can take anywhere from a few minutes to a few hours to spread.`;
  }

  if (misconfigured === true) {
    return `${domain} is answering, but not with the rows below. Check they match exactly at your registrar.`;
  }

  return "The records are showing up. The secure certificate for your address is still being issued — this usually takes a few minutes, so try again shortly.";
}
