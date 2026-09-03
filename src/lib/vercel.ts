/**
 * Registering client domains with the host.
 *
 * A CNAME pointing at us is only half of what makes a custom domain work.
 * Vercel routes on the Host header and only answers for domains attached to
 * the project — for anything else the TLS handshake fails outright, so the
 * visitor gets a browser security warning rather than a page. It also only
 * issues a certificate for domains it knows about.
 *
 * So when a client saves their domain we add it to the project here, which is
 * what starts certificate issuance. Without a token this degrades to telling
 * the owner to add it by hand rather than silently publishing a dead address.
 */

const API = "https://api.vercel.com";

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

function teamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return team ? `?teamId=${encodeURIComponent(team)}` : "";
}

export type VercelDomainResult = {
  ok: boolean;
  /** True when the domain is attached to the project, including "already was". */
  attached: boolean;
  detail: string;
};

/**
 * Attach one domain to the project.
 *
 * A domain that is already attached is a success, not an error — clients
 * re-save the same address all the time.
 */
export async function addDomainToProject(domain: string): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const project = process.env.VERCEL_PROJECT_ID?.trim();

  if (!token || !project) {
    return {
      ok: false,
      attached: false,
      detail: "Domain automation is not configured, so this domain needs adding to the host by hand.",
    };
  }

  try {
    const res = await fetch(
      `${API}/v10/projects/${encodeURIComponent(project)}/domains${teamQuery()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
        cache: "no-store",
      }
    );

    if (res.ok) {
      return { ok: true, attached: true, detail: `${domain} added to the host.` };
    }

    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    const code = body?.error?.code ?? "";

    // Already ours, on this project or another one we own.
    if (code === "domain_already_in_use" || code === "domain_taken" || res.status === 409) {
      return { ok: true, attached: true, detail: `${domain} is already attached.` };
    }

    return {
      ok: false,
      attached: false,
      detail: body?.error?.message ?? `Host rejected ${domain} (HTTP ${res.status}).`,
    };
  } catch (e) {
    return {
      ok: false,
      attached: false,
      detail: e instanceof Error ? e.message : "Could not reach the host API.",
    };
  }
}

/**
 * Attach both the apex and www, since the instructions ask for records on
 * both and a client who only gets one of them working is still broken.
 */
export async function attachClientDomain(domain: string): Promise<VercelDomainResult> {
  const apex = await addDomainToProject(domain);
  // www is a nice-to-have: if the apex is attached the site works.
  const www = await addDomainToProject(`www.${domain}`);

  if (apex.attached) {
    return {
      ok: true,
      attached: true,
      detail: www.attached ? `${domain} and www added to the host.` : apex.detail,
    };
  }
  return apex;
}
