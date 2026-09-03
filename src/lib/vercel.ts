/**
 * Vercel's project-domain API, which is what makes a client's own domain work.
 *
 * Pointing DNS at us is only half of it. Vercel routes on the Host header and
 * answers only for domains attached to the project; for anything else the TLS
 * handshake fails outright, so the visitor gets a browser security warning
 * rather than a page. It also issues certificates only for domains it knows.
 *
 * The order Vercel documents for a multi-tenant platform, which this follows:
 *
 *   1. POST   /v10/projects/{id}/domains          attach the domain
 *   2. if verified === false, give the client the returned challenge
 *   3. POST   /v9/projects/{id}/domains/{d}/verify   once they have added it
 *   4. GET    /v6/domains/{d}/config              is DNS actually right?
 *   5. DELETE /v9/projects/{id}/domains/{d}       when a client leaves
 *
 * Docs: https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains
 */

const API = "https://api.vercel.com";

export type VerificationChallenge = {
  type: string;
  domain: string;
  value: string;
  reason: string;
};

export type ProjectDomain = {
  name: string;
  apexName: string;
  verified: boolean;
  verification: VerificationChallenge[];
};

export type DomainConfig = {
  /** False means Vercel can serve it and issue a certificate. */
  misconfigured: boolean;
  /** How Vercel sees it resolving: "CNAME", "A", "http", or null when it can't. */
  configuredBy: string | null;
  recommendedIPv4: string[];
  recommendedCNAME: string[];
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; status: number; detail: string };

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

function projectId(): string {
  return process.env.VERCEL_PROJECT_ID?.trim() ?? "";
}

function scope(): string {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return team ? `teamId=${encodeURIComponent(team)}` : "";
}

function withScope(path: string, extra = ""): string {
  const parts = [scope(), extra].filter(Boolean).join("&");
  return `${API}${path}${parts ? `?${parts}` : ""}`;
}

async function call<T>(
  url: string,
  init: RequestInit & { method: string }
): Promise<ApiResult<T>> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token || !projectId()) {
    return {
      ok: false,
      code: "not_configured",
      status: 0,
      detail: "Domain automation is not configured.",
    };
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    const body = (await res.json().catch(() => null)) as
      | (Record<string, unknown> & { error?: { code?: string; message?: string } })
      | null;

    if (res.ok) return { ok: true, data: body as T };

    return {
      ok: false,
      status: res.status,
      code: body?.error?.code ?? `http_${res.status}`,
      detail: body?.error?.message ?? `Vercel returned HTTP ${res.status}.`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      code: "network_error",
      detail: e instanceof Error ? e.message : "Could not reach the Vercel API.",
    };
  }
}

/** Attach one hostname to the project. */
export async function addProjectDomain(name: string): Promise<ApiResult<ProjectDomain>> {
  return call<ProjectDomain>(withScope(`/v10/projects/${encodeURIComponent(projectId())}/domains`), {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getProjectDomain(name: string): Promise<ApiResult<ProjectDomain>> {
  return call<ProjectDomain>(
    withScope(`/v9/projects/${encodeURIComponent(projectId())}/domains/${encodeURIComponent(name)}`),
    { method: "GET" }
  );
}

/** Ask Vercel to re-check a verification challenge the client has now added. */
export async function verifyProjectDomain(name: string): Promise<ApiResult<ProjectDomain>> {
  return call<ProjectDomain>(
    withScope(
      `/v9/projects/${encodeURIComponent(projectId())}/domains/${encodeURIComponent(name)}/verify`
    ),
    { method: "POST" }
  );
}

export async function removeProjectDomain(name: string): Promise<ApiResult<unknown>> {
  return call<unknown>(
    withScope(`/v9/projects/${encodeURIComponent(projectId())}/domains/${encodeURIComponent(name)}`),
    { method: "DELETE" }
  );
}

/**
 * Vercel's own read of the domain's DNS, and the records it wants.
 *
 * Worth preferring over anything hardcoded: the recommended values come from
 * the platform that will actually serve the domain, so they stay correct if
 * Vercel ever changes them.
 */
export async function getDomainConfig(name: string): Promise<ApiResult<DomainConfig>> {
  const res = await call<Record<string, unknown>>(
    withScope(
      `/v6/domains/${encodeURIComponent(name)}/config`,
      `projectIdOrName=${encodeURIComponent(projectId())}`
    ),
    { method: "GET" }
  );
  if (!res.ok) return res;

  // The recommended fields have been both a string and an array historically,
  // and CNAME entries sometimes arrive as objects. Normalise to string[].
  const list = (v: unknown): string[] => {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) {
      return v
        .map((x) =>
          typeof x === "string"
            ? x
            : x && typeof x === "object" && "value" in x
            ? String((x as { value: unknown }).value)
            : ""
        )
        .filter(Boolean);
    }
    return [];
  };

  return {
    ok: true,
    data: {
      misconfigured: Boolean(res.data.misconfigured),
      configuredBy: (res.data.configuredBy as string | null) ?? null,
      recommendedIPv4: list(res.data.recommendedIPv4),
      recommendedCNAME: list(res.data.recommendedCNAME),
    },
  };
}

export type ProvisionResult = {
  /** The hostname is attached to the project. */
  attached: boolean;
  /** Vercel will not serve it until a challenge is completed. */
  needsVerification: boolean;
  challenges: VerificationChallenge[];
  /** Set when the domain belongs to a different Vercel account or project. */
  takenElsewhere: boolean;
  detail: string;
};

/**
 * Attach a hostname, treating the documented failure modes correctly.
 *
 * The status codes matter here and are easy to get backwards:
 *   400 + domain_already_in_use ... already on THIS project, which is fine
 *   409 ......................... on someone else's project, which is not
 */
export async function provisionDomain(name: string): Promise<ProvisionResult> {
  const added = await addProjectDomain(name);

  if (added.ok) {
    return {
      attached: true,
      needsVerification: !added.data.verified,
      challenges: added.data.verification ?? [],
      takenElsewhere: false,
      detail: added.data.verified
        ? `${name} is attached.`
        : `${name} is attached but needs a verification record.`,
    };
  }

  // Already on this project: re-read it rather than treating a repeat save as
  // a failure. Clients press save twice all the time.
  if (added.status === 400) {
    const existing = await getProjectDomain(name);
    if (existing.ok) {
      return {
        attached: true,
        needsVerification: !existing.data.verified,
        challenges: existing.data.verification ?? [],
        takenElsewhere: false,
        detail: `${name} was already attached.`,
      };
    }
  }

  // 409 means somebody else holds it. This is the one case that cannot be
  // resolved by waiting, so say so plainly instead of letting the client
  // re-check a domain that will never come good.
  if (added.status === 409) {
    return {
      attached: false,
      needsVerification: false,
      challenges: [],
      takenElsewhere: true,
      detail:
        `${name} is already set up on another hosting account. It has to be released there first.`,
    };
  }

  return {
    attached: false,
    needsVerification: false,
    challenges: [],
    takenElsewhere: false,
    detail: added.detail,
  };
}
