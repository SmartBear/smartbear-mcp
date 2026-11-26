/**
 * QMetry API Error Handling Utilities
 *
 * Every failed QMetry call (non-2xx response or network failure) is
 * thrown as a {@link QMetryApiError}. It is a ToolError, so the common tool
 * wrapper returns it to the model as an `isError: true` result instead of
 * reporting it to BugSnag as a bug.
 *
 * The message is kept short and model-readable: the HTTP status, QMetry's own
 * `code` and `message` from the response body, and a hint only where one
 * actually applies (bad credentials, connectivity, server errors, or a known
 * QMetry error code). An invalid request gets no generic troubleshooting.
 */

import { ToolError } from "../../../common/tools";

/** How much of an unexpected response body to quote back to the model. */
const SNIPPET_LENGTH = 200;

export type QMetryErrorKind = "auth" | "client" | "server" | "network";

export interface QMetryErrorDetails {
  kind: QMetryErrorKind;
  /** Full request URL (never contains the API key, which is sent as a header). */
  url: string;
  /** HTTP status; absent for network failures. */
  status?: number;
  /** QMetry error code from the response body, e.g. `CO.INVALID_PROJECT_ID`. */
  code?: string;
  /** QMetry's message, or the readable part of a non-JSON body. */
  detail?: string;
  hint?: string;
}

/** Where the failure happened, added by the tool registration layer. */
export interface QMetryErrorContext {
  /** Public MCP tool name, e.g. `qmetry_create_test_case`. */
  tool?: string;
  /** Relevant, non-secret tool inputs (IDs, keys) as `name=value` pairs. */
  inputs?: Record<string, string>;
  /** What the tool was doing when the call failed, if not the main request. */
  step?: string;
  /** Close matches for an invalid value, shown as "Did you mean: …". */
  suggestion?: string;
}

/**
 * Hints for QMetry error codes seen in practice. Only add a code here once it
 * has been observed from the real API — never guess codes.
 */
const KNOWN_CODE_HINTS: Record<string, string> = {
  "CO.INVALID_PROJECT_ID":
    "Invalid project key: call qmetry_fetch_qmetry_list_projects to see valid keys.",
  "CO.CREATE_ENTITY_IS_NOT_ALLOWED_AS_SELECTED_FOLDER_DOES_NOT_EXIST":
    "The folder ID does not exist: omit it to use the root folder, or get folder IDs from qmetry_fetch_qmetry_project_info.",
};

const AUTH_HINT =
  "Check that the QMetry API key is valid and not expired, and that its user has permission for this project and operation.";
const SERVER_HINT =
  "This is a QMetry server error; retrying the request may succeed.";
const SSL_HINT =
  "The TLS certificate could not be verified; a corporate proxy may be intercepting HTTPS traffic to QMetry.";

/**
 * A failed QMetry API call. Immutable: {@link withContext} returns a new error
 * so callers higher up can add the tool name and inputs.
 */
export class QMetryApiError extends ToolError {
  readonly details: QMetryErrorDetails;
  readonly context: QMetryErrorContext;

  constructor(
    details: QMetryErrorDetails,
    context: QMetryErrorContext = {},
    options?: ErrorOptions,
  ) {
    super(formatQMetryError(details, context), options);
    this.name = "QMetryApiError";
    this.details = details;
    this.context = context;
    Object.setPrototypeOf(this, QMetryApiError.prototype);
  }

  get status(): number | undefined {
    return this.details.status;
  }

  get code(): string | undefined {
    return this.details.code;
  }

  /** Returns a copy of this error with `context` merged over the existing one. */
  withContext(context: QMetryErrorContext): QMetryApiError {
    return new QMetryApiError(
      this.details,
      {
        ...this.context,
        ...context,
        inputs: { ...this.context.inputs, ...context.inputs },
      },
      { cause: this.cause },
    );
  }
}

function formatQMetryError(
  details: QMetryErrorDetails,
  context: QMetryErrorContext,
): string {
  const { kind, url, status, code, detail, hint } = details;
  let headline: string;
  switch (kind) {
    case "network":
      headline = `Could not reach QMetry at ${url}${detail ? `: ${detail}` : ""}`;
      break;
    default: {
      const label = [`QMetry API error ${status}`, code]
        .filter(Boolean)
        .join(" ");
      headline = `${label}: ${detail || `HTTP ${status}`}`;
    }
  }

  const lines = [headline];
  if (context.tool) lines.push(`Tool: ${context.tool}`);
  const inputs = Object.entries(context.inputs ?? {});
  if (inputs.length > 0) {
    lines.push(`Inputs: ${inputs.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }
  if (context.step) lines.push(`Step: ${context.step}`);
  if (kind !== "network" && status !== undefined) {
    // Network headlines already carry the URL; for HTTP errors it is
    // useful to know which endpoint failed when a tool makes several calls.
    lines.push(`Request: ${url}`);
  }
  if (hint) lines.push(`Hint: ${hint}`);
  if (context.suggestion) lines.push(`Did you mean: ${context.suggestion}`);
  return lines.join("\n");
}

/** Collapses whitespace (and strips markup from HTML) and caps the length. */
function readableSnippet(body: string, looksLikeHtml: boolean): string {
  const readable = (looksLikeHtml ? body.replace(/<[^>]*>/g, " ") : body)
    .replace(/\s+/g, " ")
    .trim();
  return readable.length > SNIPPET_LENGTH
    ? `${readable.slice(0, SNIPPET_LENGTH)}…`
    : readable;
}

function classifyStatus(status: number, code?: string): QMetryErrorKind {
  if (status === 401 || status === 403 || code === "CO.INVALID_API_KEY") {
    return "auth";
  }
  if (status >= 500) return "server";
  return "client";
}

function hintFor(kind: QMetryErrorKind, code?: string): string | undefined {
  switch (kind) {
    case "auth":
      return AUTH_HINT;
    case "server":
      return SERVER_HINT;
    case "client":
      return code ? KNOWN_CODE_HINTS[code] : undefined;
    default:
      return undefined;
  }
}

/**
 * Builds the error for a non-2xx QMetry response from its status and raw body.
 * The body is parsed as JSON for QMetry's `code`/`message`; anything else is
 * quoted as readable text. Never throws.
 */
export function createQMetryApiError(
  status: number,
  rawBody: string,
  url: string,
  contentType?: string | null,
): QMetryApiError {
  let code: string | undefined;
  let detail: string | undefined;

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    data = undefined;
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.code === "string" && obj.code) code = obj.code;
    const message = [obj.message, obj.errorMessage, obj.error].find(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    );
    detail = message ?? readableSnippet(rawBody, false);
  } else if (rawBody.trim() !== "") {
    const looksLikeHtml =
      (contentType ?? "").toLowerCase().includes("html") ||
      /^\s*</.test(rawBody);
    detail = readableSnippet(rawBody, looksLikeHtml);
  }

  const kind = classifyStatus(status, code);
  return new QMetryApiError({
    kind,
    url,
    status,
    code,
    detail,
    hint: hintFor(kind, code),
  });
}

/**
 * Throws a {@link QMetryApiError} for a failed (non-2xx) QMetry response.
 * The body is read once: a failed json() would consume the stream and a
 * follow-up text() would throw "Body is unusable", masking the real error.
 */
export async function handleQMetryApiError(
  response: Response,
  url: string,
): Promise<never> {
  let rawBody = "";
  try {
    rawBody = await response.text();
  } catch {
    // Body could not be read (e.g. connection dropped); fall back to status
  }
  throw createQMetryApiError(
    response.status,
    rawBody,
    url,
    response.headers?.get?.("content-type"),
  );
}

const SSL_INDICATORS = [
  "certificate",
  "unable_to_get_issuer_cert",
  "cert_untrusted",
  "cert_authority_invalid",
  "self_signed_cert",
  "self-signed",
  "ssl",
];

/**
 * Builds the error for a QMetry request that got no response at all: a
 * network failure (DNS, refused connection, TLS).
 */
export function createQMetryFetchError(
  error: unknown,
  url: string,
  baseUrl: string,
): QMetryApiError {
  const options = { cause: error };
  const err = error instanceof Error ? error : new Error(String(error));
  const cause = err.cause as { message?: unknown; code?: unknown } | undefined;
  const parts = [err.message || String(error)];
  if (cause && typeof cause === "object") {
    if (typeof cause.code === "string") parts.push(cause.code);
    if (typeof cause.message === "string" && cause.message !== err.message) {
      parts.push(cause.message);
    }
  }
  const detail = parts.join(" — ");
  const lower = detail.toLowerCase();
  const isSsl = SSL_INDICATORS.some((s) => lower.includes(s));

  return new QMetryApiError(
    {
      kind: "network",
      url,
      detail,
      hint:
        `Check the QMetry instance URL (${baseUrl}) and network connectivity.` +
        (isSsl ? ` ${SSL_HINT}` : ""),
    },
    {},
    options,
  );
}

/** Throws {@link createQMetryFetchError}. */
export function handleQMetryFetchError(
  error: unknown,
  url: string,
  baseUrl: string,
): never {
  throw createQMetryFetchError(error, url, baseUrl);
}

export interface QMetryNonJsonResponseContext {
  status: number;
  contentType: string | null;
  body: string;
  url: string;
}

/**
 * Builds the error for a successful (2xx) QMetry response whose body is not
 * JSON. That is an environment problem, not a bug: typically a sign-in page
 * (SSO gateway, expired session), a corporate proxy notice, a maintenance page,
 * or a base URL pointing at a web app that answers every path with HTML.
 */
export function createNonJsonResponseError(
  context: QMetryNonJsonResponseContext,
): ToolError {
  const { status, contentType, body, url } = context;
  const looksLikeHtml =
    (contentType ?? "").toLowerCase().includes("html") || /^\s*</.test(body);
  const snippet = readableSnippet(body, looksLikeHtml);

  return new ToolError(
    `QMetry returned a non-JSON response (HTTP ${status}${contentType ? `, ${contentType}` : ""}) for ${url}.\n\n` +
      (looksLikeHtml
        ? `The response is an HTML page, not the QMetry API. This is usually a sign-in page (SSO gateway or expired session), a corporate proxy or firewall notice, or a maintenance page.\n\n`
        : `The response could not be read as JSON.\n\n`) +
      `To resolve:\n` +
      `1. Check that the QMetry base URL points at your QMetry instance (not a web app, portal or proxy address)\n` +
      `2. Check that your API key or sign-in session is still valid\n` +
      `3. Check whether a corporate proxy or firewall is intercepting requests to QMetry\n` +
      `4. Try the same URL in a browser or REST client to see what it returns\n\n` +
      `Response starts with: ${snippet || "(no readable text)"}`,
  );
}

/**
 * Reads the body of a successful (2xx) QMetry response.
 *
 * - An empty body (e.g. 204 No Content) is a success with nothing to return,
 *   reported as `{ success: true }`.
 * - A body that is not JSON throws a ToolError with troubleshooting guidance
 *   (see {@link createNonJsonResponseError}), instead of a raw `SyntaxError`
 *   that would be treated as a server bug.
 */
export async function readQMetryJson<T>(
  response: Response,
  url: string,
): Promise<T> {
  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    throw new ToolError(
      `Failed to read the QMetry response from ${url}: ${error instanceof Error ? error.message : String(error)}. ` +
        `The connection may have been interrupted; please retry.`,
    );
  }

  if (body.trim() === "") {
    return { success: true } as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw createNonJsonResponseError({
      status: response.status,
      contentType: response.headers?.get?.("content-type") ?? null,
      body,
      url,
    });
  }
}
