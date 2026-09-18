/**
 * Usage analytics for the remote (HTTP) MCP server, reported to the shared
 * SmartBear Amplitude project.
 *
 * Design constraints (see the Amplitude naming conventions):
 *   - Event names are Title Case, passive voice, verb + object.
 *   - Property names are snake_case.
 *   - Every event carries `app_name`, `organization`, `analytics_id`,
 *     `source` and `user_agent`. `source` is fixed to "MCP" here; the other
 *     two identity fields and `app_name` are read from the product's bearer
 *     JWT as declared on its client (see {@link Client.analytics}) and are
 *     omitted, never invented, when unresolvable. Products whose credential
 *     arrives in a product-specific header rather than `Authorization` name
 *     it via `analytics.tokenHeader`.
 *   - `analytics_id` is `sha256(email.toLowerCase())` when the token carries
 *     an `email` claim (SmartBear ID's formula, so it joins across systems);
 *     otherwise `sha256("<integration>:<user id>")` from the declared claim,
 *     unique within MCP analytics only.
 *
 * Everything in here degrades silently: no API key means no tracking, and a
 * tracking failure can never surface to a tool call. Nothing customer-owned
 * (tool arguments, results, credentials, raw email or ids) is ever sent.
 *
 * The module is inert until {@link initAnalytics} is called, which only the
 * HTTP transport does — stdio usage is out of scope.
 */

import { createHash, randomUUID } from "node:crypto";
import { createInstance, Types } from "@amplitude/analytics-node";
import type { McpClientIdentity } from "./client-identity";
import { getUserAgent, MCP_SERVER_VERSION } from "./info";
import { firstClaim, getClaim, requestBearerClaims } from "./jwt";
import type { SmartBearMcpServer } from "./server";
import type { Client } from "./types";

/** Environment variable holding the Amplitude API key for the shared project. */
export const ANALYTICS_API_KEY_ENV = "MCP_SERVER_AMPLITUDE_API_KEY";

/** Fixed `source` property for every event emitted by this server. */
export const ANALYTICS_SOURCE = "MCP";

/** Upper bound on how long a flush may hold up session teardown or shutdown. */
const FLUSH_TIMEOUT_MS = 5_000;

export const AnalyticsEvent = {
  SERVER_INITIALIZED: "Server Initialized",
  SESSION_STARTED: "Session Started",
  SESSION_ENDED: "Session Ended",
  TOOL_CALLED: "Tool Called",
  TOOLS_LISTED: "Tools Listed",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type SessionTransport = "streamable-http" | "sse";

export type SessionEndReason = "client_disconnected" | "server_shutdown";

/**
 * The five required properties after identity resolution, in the shape they
 * are sent. Unresolvable fields are `undefined` and stripped before sending.
 */
export interface ResolvedAnalyticsIdentity {
  analytics_id?: string;
  organization?: string;
  app_name?: string;
}

type AmplitudeClient = ReturnType<typeof createInstance>;

let amplitude: AmplitudeClient | undefined;

/**
 * Stable anonymous device id for events that have neither a resolved user nor
 * a session to attach to (modern-era sessionless requests). Never combined
 * with a `user_id`, so it can never cause Amplitude to merge two real users.
 */
const processDeviceId = randomUUID();

/**
 * `analytics_id` exactly as SmartBear ID (Auth0) computes it, so it joins
 * with every other SmartBear system for the same user.
 */
export function analyticsIdFromEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

/**
 * `analytics_id` for a product-specific user id. Prefixed with the
 * integration so equal ids from different products never collide.
 */
export function analyticsIdFromUserId(
  integration: string,
  userId: string,
): string {
  return sha256(`${integration}:${userId.trim()}`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Initialise the Amplitude client from the environment. Idempotent. Returns
 * whether tracking is enabled. Without an API key nothing is configured and
 * every other function in this module is a silent no-op.
 */
export function initAnalytics(env: NodeJS.ProcessEnv = process.env): boolean {
  if (amplitude) {
    return true;
  }
  const apiKey = env[ANALYTICS_API_KEY_ENV]?.trim();
  if (!apiKey) {
    return false;
  }
  try {
    const instance = createInstance();
    instance.init(apiKey, {
      // The SDK must never write to the MCP process's stdout/stderr on our
      // behalf; failures are swallowed by design.
      logLevel: Types.LogLevel.None,
    });
    amplitude = instance;
    return true;
  } catch {
    amplitude = undefined;
    return false;
  }
}

export function isAnalyticsEnabled(): boolean {
  return amplitude !== undefined;
}

/** Drop the client so the next {@link initAnalytics} starts fresh. Test-only. */
export function resetAnalyticsForTests(): void {
  amplitude = undefined;
  flushing = undefined;
  flushAgain = false;
}

/**
 * Resolve the identity for one integration from the current request's bearer
 * JWT and the client's {@link Client.analytics} declaration. An `email`
 * claim always wins over a declared user id.
 */
export function resolveClientIdentity(
  client: Client,
): ResolvedAnalyticsIdentity {
  const {
    appName,
    userId: userIdPaths,
    organizationId,
    tokenHeader,
  } = client.analytics ?? {};
  const claims = requestBearerClaims(tokenHeader);
  const email = getClaim(claims, "email");
  const userId = email ? undefined : firstClaim(claims, userIdPaths);
  return {
    analytics_id: email
      ? analyticsIdFromEmail(email)
      : userId
        ? analyticsIdFromUserId(client.capabilityPrefix, userId)
        : undefined,
    organization: firstClaim(claims, organizationId),
    app_name: appName?.trim() || undefined,
  };
}

/**
 * Resolve the identity for session-level events, which are not tied to one
 * tool. Remote deployments serve a single product, so this is normally the
 * one configured client; with several, the first to yield an identity wins,
 * and its `app_name` is used alongside it.
 */
export function resolveSessionIdentity(
  clients: Client[],
): ResolvedAnalyticsIdentity {
  let fallback: ResolvedAnalyticsIdentity = {};
  for (const client of clients) {
    const resolved = resolveClientIdentity(client);
    if (resolved.analytics_id || resolved.organization) {
      return resolved;
    }
    if (!fallback.app_name && resolved.app_name) {
      fallback = resolved;
    }
  }
  return fallback;
}

/**
 * The MCP client attribution carried by every per-request event, as explicit
 * properties rather than text inside `user_agent`, so Amplitude can group on
 * them directly. `protocol_version` is the only place the protocol revision
 * is recorded, which is what shows how far clients have migrated.
 */
export function mcpClientProperties(
  identity: McpClientIdentity,
): Record<string, string | null> {
  return {
    mcp_client_name: identity.name ?? null,
    mcp_client_version: identity.version ?? null,
    protocol_version: identity.protocolVersion ?? null,
  };
}

/**
 * Whether a JSON-RPC message (or batch) is a `tools/list` request. Used to
 * emit `Tools Listed`, the closest thing to a "client connected" signal on
 * the sessionless 2026-07-28 protocol.
 */
export function isToolsListRequest(message: unknown): boolean {
  if (Array.isArray(message)) {
    return message.some((entry) => isToolsListRequest(entry));
  }
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { method?: unknown }).method === "tools/list"
  );
}

interface EventContext {
  /** MCP session id; doubles as the Amplitude device id for the session. */
  sessionId?: string;
  /** Session start (epoch ms), used as Amplitude's numeric `session_id`. */
  sessionStartedAt?: number;
  /** Pre-captured User-Agent; defaults to {@link getUserAgent} at send time. */
  userAgent?: string;
}

/**
 * Queue one event. Synchronous and non-blocking (the SDK batches in memory);
 * silently does nothing when tracking is disabled or the SDK throws.
 */
export function trackEvent(
  eventType: AnalyticsEventName,
  identity: ResolvedAnalyticsIdentity,
  properties: Record<string, unknown>,
  context: EventContext = {},
): void {
  if (!amplitude) {
    return;
  }
  try {
    const eventProperties = stripUndefined({
      app_name: identity.app_name,
      organization: identity.organization,
      analytics_id: identity.analytics_id,
      source: ANALYTICS_SOURCE,
      user_agent: context.userAgent ?? getUserAgent(),
      ...properties,
    });
    amplitude.track(eventType, eventProperties, {
      user_id: identity.analytics_id,
      // A session-scoped device id lets a session's anonymous and identified
      // events resolve to the same Amplitude user without ever sharing a
      // device id between two real users.
      device_id:
        context.sessionId ??
        (identity.analytics_id ? undefined : processDeviceId),
      session_id: context.sessionStartedAt,
      time: Date.now(),
      insert_id: randomUUID(),
      app_version: MCP_SERVER_VERSION,
    });
  } catch {
    // Analytics must never affect the caller.
  }
}

let flushing: Promise<void> | undefined;
let flushAgain = false;

/**
 * Push buffered events to Amplitude. Concurrent callers share the in-flight
 * flush and trigger one follow-up pass, so an awaiting caller (the shutdown
 * handler) never resolves while another flush is still sending. Never
 * rejects; each pass gives up after {@link FLUSH_TIMEOUT_MS}.
 */
export function flushAnalytics(): Promise<void> {
  if (!amplitude) {
    return Promise.resolve();
  }
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      await flushOnce();
    } while (flushAgain);
    flushing = undefined;
  })();
  return flushing;
}

async function flushOnce(): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      amplitude?.flush().promise,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, FLUSH_TIMEOUT_MS);
        timer.unref?.();
      }),
    ]);
  } catch {
    // Swallowed by design.
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** The outcome of one tool invocation, as seen by the dispatch wrapper. */
export interface ToolCallOutcome {
  client: Client;
  toolName: string;
  success: boolean;
  durationMs: number;
  /** Error class name (never a message); `null` on success. */
  errorType: string | null;
  /** The MCP client making the call, resolved for the current request. */
  mcpClient: McpClientIdentity;
  /** The HTTP session this call belongs to, if any (none on modern-era requests). */
  session?: AnalyticsSession;
}

/**
 * Record a completed tool invocation. Identity comes from the integration that
 * owns the tool, resolved inside the current request context. Never throws.
 */
export function trackToolCalled(outcome: ToolCallOutcome): void {
  if (!amplitude) {
    return;
  }
  try {
    outcome.session?.recordToolCall();
    trackEvent(
      AnalyticsEvent.TOOL_CALLED,
      resolveClientIdentity(outcome.client),
      {
        session_id: outcome.session?.sessionId ?? null,
        tool_name: outcome.toolName,
        integration: outcome.client.capabilityPrefix,
        success: outcome.success,
        duration_ms: outcome.durationMs,
        error_type: outcome.errorType,
        ...mcpClientProperties(outcome.mcpClient),
      },
      {
        sessionId: outcome.session?.sessionId,
        sessionStartedAt: outcome.session?.startedAt,
      },
    );
  } catch {
    // Analytics must never affect the caller.
  }
}

/**
 * Record a `tools/list` request. Fires on both protocols so the event has one
 * shape; on the 2026-07-28 protocol, where there is no session, it is the
 * nearest "client connected" signal and shows clients that discovered the
 * server but never called a tool. Over-counts when clients refresh their tool
 * list. Must run inside the request context. Never throws.
 */
export function trackToolsListed(server: SmartBearMcpServer): void {
  if (!amplitude) {
    return;
  }
  try {
    const session = server.getAnalyticsSession();
    trackEvent(
      AnalyticsEvent.TOOLS_LISTED,
      resolveSessionIdentity(server.getClients()),
      {
        session_id: session?.sessionId ?? null,
        ...mcpClientProperties(server.getMcpClientIdentity()),
      },
      {
        sessionId: session?.sessionId,
        sessionStartedAt: session?.startedAt,
      },
    );
  } catch {
    // Analytics must never affect the caller.
  }
}

/** Classify a thrown value as an `error_type` without leaking its message. */
export function errorTypeOf(error: unknown): string {
  if (error instanceof Error) {
    return error.constructor?.name || error.name || "Error";
  }
  return "UnknownError";
}

export interface AnalyticsSessionOptions {
  sessionId: string;
  transport: SessionTransport;
  server: SmartBearMcpServer;
  /**
   * Every integration enabled for this deployment (capability prefixes), so
   * the not-configured set can be reported alongside the configured one.
   */
  integrations: string[];
}

/**
 * Per-HTTP-session analytics state. Created when the transport allocates a
 * session id, fed by the `initialize` handshake, and closed when the
 * transport closes. One instance per {@link SmartBearMcpServer} in HTTP mode.
 */
export class AnalyticsSession {
  readonly sessionId: string;
  readonly startedAt = Date.now();
  private readonly transport: SessionTransport;
  private readonly server: SmartBearMcpServer;
  private readonly integrations: string[];
  private identity: ResolvedAnalyticsIdentity = {};
  private userAgent: string | undefined;
  private toolCallCount = 0;
  private started = false;
  private ended = false;

  constructor(options: AnalyticsSessionOptions) {
    this.sessionId = options.sessionId;
    this.transport = options.transport;
    this.server = options.server;
    this.integrations = options.integrations;
  }

  /**
   * Called once the `initialize` request has been applied to the server, i.e.
   * with the client identity known and inside the request context that
   * carries the caller's credential. Emits `Session Started` then
   * `Server Initialized`. Subsequent calls are ignored.
   */
  onInitialized(): void {
    if (this.started || !amplitude) {
      return;
    }
    this.started = true;
    try {
      const mcpClient: McpClientIdentity = this.server.getMcpClientIdentity();
      const clients = this.server.getClients();
      this.identity = resolveSessionIdentity(clients);
      this.userAgent = getUserAgent();

      const configured = clients
        .filter((client) => isConfiguredWithAuth(client))
        .map((client) => client.capabilityPrefix);
      const notConfigured = this.integrations.filter(
        (integration) => !configured.includes(integration),
      );

      trackEvent(
        AnalyticsEvent.SESSION_STARTED,
        this.identity,
        {
          session_id: this.sessionId,
          transport: this.transport,
          ...mcpClientProperties(mcpClient),
          enabled_toolsets: this.server.getEnabledToolsets() ?? null,
          enabled_integrations: this.integrations,
          configured_integrations: configured,
          not_configured_integrations: notConfigured,
        },
        this.context(),
      );
      trackEvent(
        AnalyticsEvent.SERVER_INITIALIZED,
        this.identity,
        {
          transport: this.transport,
          ...mcpClientProperties(mcpClient),
          server_version: MCP_SERVER_VERSION,
        },
        this.context(),
      );
    } catch {
      // Analytics must never affect the caller.
    }
  }

  recordToolCall(): void {
    this.toolCallCount++;
  }

  /**
   * Emit `Session Ended` and kick off a flush so the event is not stranded in
   * the SDK's buffer when the session's transport goes away. No-op for a
   * session that never completed `initialize`, and idempotent.
   */
  end(reason: SessionEndReason): void {
    if (!this.started || this.ended || !amplitude) {
      return;
    }
    this.ended = true;
    try {
      trackEvent(
        AnalyticsEvent.SESSION_ENDED,
        this.identity,
        {
          session_id: this.sessionId,
          duration_ms: Date.now() - this.startedAt,
          tool_call_count: this.toolCallCount,
          end_reason: reason,
        },
        this.context(),
      );
    } catch {
      // Analytics must never affect the caller.
    }
    void flushAnalytics();
  }

  private context(): EventContext {
    return {
      sessionId: this.sessionId,
      sessionStartedAt: this.startedAt,
      userAgent: this.userAgent,
    };
  }
}

/**
 * Create the per-session analytics state, or `undefined` when tracking is
 * disabled so the server carries no analytics overhead at all.
 */
export function createAnalyticsSession(
  options: AnalyticsSessionOptions,
): AnalyticsSession | undefined {
  return amplitude ? new AnalyticsSession(options) : undefined;
}

/**
 * "Configured" for analytics purposes means the integration will actually
 * serve tool calls on this session: it configured successfully and, if it
 * resolves credentials per request, one is present.
 */
function isConfiguredWithAuth(client: Client): boolean {
  try {
    if (!client.isConfigured()) {
      return false;
    }
    return client.getAuthToken ? client.getAuthToken() !== null : true;
  } catch {
    return false;
  }
}

function stripUndefined(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}
