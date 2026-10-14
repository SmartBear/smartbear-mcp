import type { HttpClient } from "./http-client";

export type IntegrationStatus = "verified" | "failed" | "unverified";

export interface NetworkEdge {
  consumer: string;
  provider: string;
  status: IntegrationStatus;
  success: number;
  failed: number;
  unknown: number;
  verificationModes: string[];
  consumerVersion?: string;
  consumerBranch?: string;
  providerVersion?: string;
  verifiedAt?: string;
  pactPublishedAt?: string;
  /** Why the latest verification failed (failed edges only). */
  failure?: EdgeFailure;
  /** Provider states the consumer's pact relies on. */
  providerStates?: string[];
  resultUrl?: string;
}

export interface FailureError {
  summary: string;
  interaction?: string;
  location?: string;
  code?: string;
}

export interface EdgeFailure {
  kind: "bdct" | "pact";
  errors: FailureError[];
}

export interface NetworkNode {
  id: string;
  group: string;
  teams: string[];
  labels: string[];
  mainBranch?: string;
  latestVersion?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface IntegrationsNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  summary: {
    pacticipants: number;
    integrations: number;
    verified: number;
    failed: number;
    unverified: number;
    groups: { name: string; count: number }[];
  };
  /** Set when some enrichment calls failed; the graph is still usable. */
  warnings?: string[];
  /** Application the graph is scoped to; the UI opens with it selected. */
  focus?: string;
}

const MAX_NODES = 150;
const MAX_EDGES = 300;
const CONCURRENCY = 8;
const OTHER_GROUP = "Other";

const DOT_EDGE =
  /(?:"([^"]+)"|([A-Za-z0-9_.-]+))\s*->\s*(?:"([^"]+)"|([A-Za-z0-9_.-]+))/g;

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Extracts consumer/provider pairs from a HAL integrations list or a DOT graph. */
export function parseIntegrationPairs(
  raw: unknown,
): { consumer: string; provider: string; verificationModes: string[] }[] {
  if (typeof raw === "string") {
    return [...raw.matchAll(DOT_EDGE)].map((m) => ({
      consumer: m[1] ?? m[2],
      provider: m[3] ?? m[4],
      verificationModes: [],
    }));
  }
  const list =
    (raw as any)?._embedded?.integrations ?? (raw as any)?.integrations;
  if (!Array.isArray(list)) return [];
  return list
    .map((item: any) => ({
      consumer: item?.consumer?.name,
      provider: item?.provider?.name,
      verificationModes: Array.isArray(item?.verificationModes)
        ? item.verificationModes
        : [],
    }))
    .filter((item) => item.consumer && item.provider);
}

/** BDCT cross-contract result -> readable errors. */
export function parseBdctErrors(raw: any): FailureError[] {
  const errors =
    raw?._embedded?.crossContractVerificationResults?.results?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.slice(0, 20).map((e: any) => ({
    summary: String(e?.message ?? e?.code ?? "Incompatible"),
    interaction: e?.mockDetails?.interactionDescription,
    location: e?.specDetails
      ? [e.specDetails.pathMethod?.toUpperCase(), e.specDetails.pathName]
          .filter(Boolean)
          .join(" ")
      : undefined,
    code: e?.code,
  }));
}

/** Pact verification result -> errors for failed interactions. */
export function parsePactFailures(result: any, pact?: any): FailureError[] {
  const names = new Map<string, string>();
  for (const i of pact?.interactions ?? []) {
    const id = i?._id ?? i?.id;
    if (id) names.set(id, i.description);
  }
  const tests = Array.isArray(result?.testResults) ? result.testResults : [];
  return tests
    .filter((t: any) => t && t.success === false)
    .slice(0, 20)
    .map((t: any) => {
      const detail =
        t.mismatches
          ?.map?.((m: any) => m?.mismatch ?? m?.type ?? m)
          .join("; ") ||
        t.exception?.message ||
        t.message;
      return {
        summary: detail ? String(detail) : "Interaction verification failed",
        interaction: names.get(t.interactionId) ?? t.interactionDescription,
      };
    });
}

export function parseProviderStates(raw: any, consumer: string): string[] {
  return (raw?.providerStates ?? [])
    .filter((s: any) => s?.name && (s.consumers ?? []).includes(consumer))
    .map((s: any) => s.name);
}

export function statusFromSummary(summary: any): IntegrationStatus {
  if ((summary?.failed ?? 0) > 0) return "failed";
  if ((summary?.success ?? 0) > 0) return "verified";
  return "unverified";
}

/**
 * Chooses a display group per node: first non-default team, else a shared name
 * prefix (e.g. `pactflow-*`) used by at least two nodes, else "Other".
 */
export function assignGroups(
  nodes: Pick<NetworkNode, "id" | "teams">[],
): Map<string, string> {
  const prefixOf = (id: string) => id.split(/[-_.\s]/)[0].toLowerCase();
  const prefixCounts = new Map<string, number>();
  for (const node of nodes) {
    if (node.teams.length) continue;
    prefixCounts.set(
      prefixOf(node.id),
      (prefixCounts.get(prefixOf(node.id)) ?? 0) + 1,
    );
  }
  const teamByLower = new Map<string, string>();
  for (const node of nodes) {
    for (const team of node.teams) teamByLower.set(team.toLowerCase(), team);
  }
  const groups = new Map<string, string>();
  for (const node of nodes) {
    const prefix = prefixOf(node.id);
    groups.set(
      node.id,
      node.teams[0] ??
        teamByLower.get(prefix) ??
        ((prefixCounts.get(prefix) ?? 0) >= 2 ? prefix : OTHER_GROUP),
    );
  }
  return groups;
}

export function buildNetwork(
  edges: NetworkEdge[],
  details: Map<string, any>,
  warnings: string[] = [],
): IntegrationsNetwork {
  const ids = [
    ...new Set(edges.flatMap((e) => [e.consumer, e.provider])),
  ].sort();
  const partial = ids.map((id) => {
    const p = details.get(id);
    const teams: string[] = (p?._embedded?.teams ?? [])
      .filter((t: any) => t && !t.isDefault && t.name)
      .map((t: any) => t.name);
    return {
      id,
      teams,
      labels: (p?._embedded?.labels ?? [])
        .map((l: any) => l?.name)
        .filter(Boolean),
      mainBranch: p?.mainBranch,
      latestVersion: p?._embedded?.latestVersion?.number,
      updatedAt: p?.updatedAt,
      createdAt: p?.createdAt,
    };
  });
  const groupOf = assignGroups(partial);
  const nodes: NetworkNode[] = partial.map((n) => ({
    ...n,
    group: groupOf.get(n.id) ?? OTHER_GROUP,
  }));
  const groupCounts = new Map<string, number>();
  for (const node of nodes) {
    groupCounts.set(node.group, (groupCounts.get(node.group) ?? 0) + 1);
  }
  const count = (status: IntegrationStatus) =>
    edges.filter((e) => e.status === status).length;
  return {
    nodes,
    edges,
    summary: {
      pacticipants: nodes.length,
      integrations: edges.length,
      verified: count("verified"),
      failed: count("failed"),
      unverified: count("unverified"),
      groups: [...groupCounts]
        .map(([name, n]) => ({ name, count: n }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
    ...(warnings.length ? { warnings } : {}),
  };
}

export async function fetchIntegrationsNetwork(
  http: HttpClient,
  { consumer }: { consumer?: string } = {},
): Promise<IntegrationsNetwork> {
  const raw = await http.fetch<unknown>(`${http.baseUrl}/integrations`, {
    method: "GET",
    headers: { Accept: "application/hal+json" },
    errorContext: "Get Integrations Network",
  });
  let pairs = parseIntegrationPairs(raw);
  const warnings: string[] = [];
  let focus: string | undefined;
  if (consumer) {
    const wanted = consumer.trim().toLowerCase();
    const known = [...new Set(pairs.flatMap((p) => [p.consumer, p.provider]))];
    const partial = known.filter((n) => n.toLowerCase().includes(wanted));
    focus =
      known.find((n) => n.toLowerCase() === wanted) ??
      (partial.length === 1 ? partial[0] : undefined);
    pairs = pairs.filter((p) => p.consumer === focus);
    if (!pairs.length) {
      warnings.push(
        focus
          ? `"${focus}" has no providers (it isn't a consumer of anything).`
          : `No pacticipant named "${consumer}" has integrations.${partial.length ? ` Did you mean: ${partial.slice(0, 5).join(", ")}?` : ""}`,
      );
    }
  }
  if (pairs.length > MAX_EDGES) {
    warnings.push(
      `Showing the first ${MAX_EDGES} of ${pairs.length} integrations.`,
    );
    pairs = pairs.slice(0, MAX_EDGES);
  }

  const names = [...new Set(pairs.flatMap((p) => [p.consumer, p.provider]))];
  const detailNames = names.slice(0, MAX_NODES);
  if (names.length > MAX_NODES) {
    warnings.push(
      `Team and version details were loaded for ${MAX_NODES} of ${names.length} pacticipants.`,
    );
  }

  let firstError = "";
  const note = (e: unknown) => {
    firstError ||= e instanceof Error ? e.message : String(e);
  };
  const [details, matrices] = await Promise.all([
    mapLimit(detailNames, CONCURRENCY, async (name) => {
      try {
        return await http.fetch<any>(
          `${http.baseUrl}/pacticipants/${encodeURIComponent(name)}`,
          { method: "GET", errorContext: "Get Pacticipant" },
        );
      } catch (e) {
        note(e);
        return undefined;
      }
    }),
    mapLimit(pairs, CONCURRENCY, async (pair) => {
      try {
        return await http.fetch<any>(
          `${http.baseUrl}/matrix?q[]pacticipant=${encodeURIComponent(pair.consumer)}&q[]latest=true&q[]pacticipant=${encodeURIComponent(pair.provider)}&latestby=cvp&limit=5`,
          { method: "GET", errorContext: "Get Matrix" },
        );
      } catch (e) {
        note(e);
        return undefined;
      }
    }),
  ]);

  const providers = [...new Set(pairs.map((p) => p.provider))];
  const statesByProvider = new Map<string, any>();
  await mapLimit(providers, CONCURRENCY, async (provider) => {
    try {
      statesByProvider.set(
        provider,
        await http.fetch<any>(
          `${http.baseUrl}/pacts/provider/${encodeURIComponent(provider)}/provider-states`,
          { method: "GET", errorContext: "Get Provider States" },
        ),
      );
    } catch {
      /* states are optional */
    }
  });
  const failures = await mapLimit(pairs, CONCURRENCY, async (pair) => {
    const i = pairs.indexOf(pair);
    const row = (matrices[i]?.matrix ?? []).find(
      (m: any) => m?.verificationResult?.success === false,
    );
    if (statusFromSummary(matrices[i]?.summary) !== "failed") return undefined;
    const href: string | undefined =
      row?.verificationResult?._links?.self?.href;
    if (!href) return undefined;
    try {
      const result = await http.fetch<any>(href, {
        method: "GET",
        errorContext: "Get Verification Result",
      });
      if (href.includes("/contracts/bi-directional/")) {
        return {
          href,
          failure: { kind: "bdct" as const, errors: parseBdctErrors(result) },
        };
      }
      let pact: any;
      const pactHref = row?.pact?._links?.self?.href;
      if (pactHref) {
        pact = await http
          .fetch<any>(pactHref, { method: "GET", errorContext: "Get Pact" })
          .catch(() => undefined);
      }
      return {
        href,
        failure: {
          kind: "pact" as const,
          errors: parsePactFailures(result, pact),
        },
      };
    } catch (e) {
      note(e);
      return { href, failure: undefined };
    }
  });

  const detailMap = new Map<string, any>();
  detailNames.forEach((name, i) => {
    if (details[i]) detailMap.set(name, details[i]);
  });
  const failedDetails = detailNames.length - detailMap.size;
  const failedMatrices = matrices.filter((m) => !m).length;
  if (failedDetails) {
    warnings.push(`Could not load details for ${failedDetails} pacticipants.`);
  }
  if (failedMatrices) {
    warnings.push(
      `Could not load verification status for ${failedMatrices} integrations.`,
    );
  }
  if ((failedDetails || failedMatrices) && firstError) {
    warnings.push(`First error: ${firstError.slice(0, 200)}`);
  }

  const edges: NetworkEdge[] = pairs.map((pair, i) => {
    const summary = matrices[i]?.summary;
    const row = matrices[i]?.matrix?.[0];
    return {
      consumer: pair.consumer,
      provider: pair.provider,
      status: statusFromSummary(summary),
      success: summary?.success ?? 0,
      failed: summary?.failed ?? 0,
      unknown: summary?.unknown ?? 0,
      verificationModes: pair.verificationModes,
      consumerVersion: row?.consumer?.version?.number,
      consumerBranch: row?.consumer?.version?.branch,
      providerVersion: row?.provider?.version?.number,
      verifiedAt: row?.verificationResult?.verifiedAt,
      pactPublishedAt: row?.pact?.createdAt,
      failure: failures[i]?.failure,
      resultUrl:
        failures[i]?.href ?? row?.verificationResult?._links?.self?.href,
      providerStates: parseProviderStates(
        statesByProvider.get(pair.provider),
        pair.consumer,
      ),
    };
  });

  return {
    ...buildNetwork(edges, detailMap, warnings),
    ...(focus && pairs.length ? { focus } : {}),
  };
}
