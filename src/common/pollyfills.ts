import { AsyncLocalStorage } from "node:async_hooks";
import type {
  ElicitRequest,
  ElicitRequestFormParams,
  ElicitResult,
  InputRequiredResult,
  RequestOptions,
} from "@modelcontextprotocol/server";
import {
  CLIENT_CAPABILITIES_META_KEY,
  inputRequired,
  inputResponse,
} from "@modelcontextprotocol/server";
import type { SmartBearMcpServer } from "./server";

export interface ElicitationPolyfillResult {
  requiresInputCollection: true;
  inputRequest: ElicitRequest["params"];
  instructions: string;
}

/**
 * Thrown by {@link executeElicitationOrPolyfill} on the modern (2026-07-28)
 * path when the current round carries no answer for the elicitation being
 * made. It short-circuits the rest of the tool's execution; the tool wrapper
 * in `SmartBearMcpServer.addClient` catches it and returns {@link result} as
 * the handler's result, which the SDK encodes as `resultType:
 * "input_required"` (MRTR, SEP-2322). The client collects the input and
 * retries the call with `inputResponses`, re-running the tool from the top.
 */
export class InputRequiredSignal extends Error {
  constructor(readonly result: InputRequiredResult) {
    super("Tool requires client input to continue (multi-round-trip)");
    this.name = "InputRequiredSignal";
    Object.setPrototypeOf(this, InputRequiredSignal.prototype);
  }
}

/**
 * Per-tool-invocation elicitation state.
 *
 * Keys are positional (`input_1`, `input_2`, …): a retried call re-runs the
 * tool from the top with the same arguments, so the Nth elicitation a tool
 * makes receives the same key on every round and can find its answer in
 * {@link responses}.
 */
interface ElicitationScope {
  /** Whether this invocation serves a modern (2026-07-28) request. */
  modern: boolean;
  /**
   * Whether this request's client declared the `elicitation` capability.
   *
   * The SDK refuses to emit an embedded `elicitation/create` for a client
   * that did not declare it, failing the whole tool call with `-32021`. So an
   * undeclared client must be served the instruction polyfill instead, which
   * needs no capability.
   */
  elicitationDeclared: boolean;
  /**
   * Answers accumulated across rounds: prior rounds' responses carried back
   * via `requestState`, merged with this round's `inputResponses` (this
   * round wins on key collision, though keys are round-unique by
   * construction).
   */
  responses: Record<string, unknown>;
  /** How many elicitations this invocation has made so far. */
  issued: number;
}

const elicitationScopeStorage = new AsyncLocalStorage<ElicitationScope>();

/**
 * The slice of the SDK's tool-handler context the elicitation scope reads.
 * Modern (2026-07-28) requests always carry the `_meta` envelope, so its
 * presence doubles as the per-invocation era signal on every transport.
 */
export interface ElicitationScopeContext {
  mcpReq?: {
    envelope?: unknown;
    inputResponses?: Record<string, unknown>;
    requestState?: <T = unknown>() => T | undefined;
  };
}

/**
 * Run one tool invocation with elicitation state derived from its handler
 * context, so the long-lived `getInput` callback handed to product clients at
 * registration time can behave per-request. Wraps every tool call (both
 * eras); on legacy requests the scope only records that MRTR does not apply.
 */
export function runWithElicitationScope<T>(
  ctx: ElicitationScopeContext | undefined,
  fn: () => T,
): T {
  const mcpReq = ctx?.mcpReq;
  const envelope = mcpReq?.envelope as Record<string, unknown> | undefined;
  const capabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY];
  const scope: ElicitationScope = {
    modern: !!envelope,
    elicitationDeclared:
      typeof capabilities === "object" &&
      capabilities !== null &&
      Object.hasOwn(capabilities, "elicitation"),
    responses: {
      ...decodeElicitationState(mcpReq?.requestState?.()),
      ...mcpReq?.inputResponses,
    },
    issued: 0,
  };
  return elicitationScopeStorage.run(scope, fn);
}

const ELICITATION_STATE_VERSION = 1;

/**
 * Serialize the answers seen so far into `requestState` so they survive the
 * next round: a retry only carries responses for the requests in the latest
 * `input_required` result, so earlier answers must ride the state echo.
 *
 * Deliberately NOT integrity-protected: the state holds nothing but the
 * client's own previous responses, so echoing it back grants the client no
 * influence it does not already have over `inputResponses` itself — and
 * elicited values are treated as untrusted user input by every consumer
 * regardless. The MRTR server requirements mandate protection only where
 * state influences authorization, resource access, or business logic; this
 * state does none of those. Revisit if anything server-trusted is ever added.
 */
function encodeElicitationState(responses: Record<string, unknown>): string {
  return JSON.stringify({ v: ELICITATION_STATE_VERSION, responses });
}

/**
 * Upper bound on an echoed `requestState` accepted for decoding. Legitimate
 * state is a small JSON object of prior form answers (well under 1KB even for
 * chatty multi-round flows); anything larger is attacker-shaped and is
 * discarded before `JSON.parse` can spend CPU/memory on it.
 */
const MAX_ELICITATION_STATE_LENGTH = 32_768;

/** Inverse of {@link encodeElicitationState}; malformed state reads as empty. */
function decodeElicitationState(raw: unknown): Record<string, unknown> {
  if (
    typeof raw !== "string" ||
    raw === "" ||
    raw.length > MAX_ELICITATION_STATE_LENGTH
  ) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      parsed.v === ELICITATION_STATE_VERSION &&
      typeof parsed.responses === "object" &&
      parsed.responses !== null &&
      !Array.isArray(parsed.responses)
    ) {
      return parsed.responses as Record<string, unknown>;
    }
  } catch {
    // Attacker-controllable input by design — unusable state is simply
    // discarded and the affected elicitations are re-issued.
  }
  return {};
}

/**
 * Ask the client for user input.
 *
 * Modern (2026-07-28) era — the multi round-trip pattern (MRTR, SEP-2322):
 * if this round already carries the answer (in `inputResponses`, or in the
 * `requestState` echo from an earlier round), it is returned as an
 * {@link ElicitResult}; otherwise an {@link InputRequiredSignal} aborts the
 * invocation so the handler returns `resultType: "input_required"` and the
 * client retries with the collected input.
 *
 * Legacy (2025) era — unchanged: server-initiated `elicitInput` when the
 * client declared the capability, else the instruction polyfill.
 *
 * @param server - The MCP server instance
 * @param params - The elicitation request parameters
 * @param options - Optional request options
 * @returns Either the elicitation result or a polyfill result
 * @throws InputRequiredSignal on the modern path when input is still needed
 */
export async function executeElicitationOrPolyfill(
  server: SmartBearMcpServer,
  params: ElicitRequest["params"],
  options?: RequestOptions,
): Promise<ElicitResult | ElicitationPolyfillResult> {
  const scope = elicitationScopeStorage.getStore();
  if (scope?.modern) {
    // A client that did not declare `elicitation` cannot be sent one: the SDK
    // rejects the embedded request and fails the entire tool call with
    // `-32021`. Degrade to the instruction polyfill, which any client can
    // act on, rather than turning an optional prompt into a hard error.
    if (!scope.elicitationDeclared) {
      return createElicitationPolyfillResult(params);
    }

    scope.issued += 1;
    const key = `input_${scope.issued}`;

    const view = inputResponse(scope.responses, key);
    if (view.kind === "elicit") {
      // The SDK surfaces MRTR content as Record<string, unknown> because the
      // client's values are not re-validated; ElicitResult consumers already
      // treat elicited content as untrusted user input, so the narrowing cast
      // changes nothing about the trust model.
      return view.content !== undefined
        ? {
            action: view.action,
            content: view.content as ElicitResult["content"],
          }
        : { action: view.action };
    }

    // Not answered yet (or the response was malformed and dropped): request
    // it. Answers from earlier rounds ride along in requestState so the
    // re-run still finds them next time.
    throw new InputRequiredSignal(
      inputRequired({
        inputRequests: {
          [key]: inputRequired.elicit(params as ElicitRequestFormParams),
        },
        ...(Object.keys(scope.responses).length > 0
          ? { requestState: encodeElicitationState(scope.responses) }
          : {}),
      }),
    );
  }

  if (!server.isElicitationSupported()) {
    return createElicitationPolyfillResult(params);
  }

  try {
    return await server.server.elicitInput(params, options);
  } catch (error) {
    console.error(error);
    return createElicitationPolyfillResult(params);
  }
}

/**
 * Creates a polyfill result that instructs the host AI application to
 * collect the requested input and re-request the tool.
 *
 * @param params - The elicitation request parameters
 * @returns A polyfill result object
 */
function createElicitationPolyfillResult(
  params: ElicitRequest["params"],
): ElicitationPolyfillResult {
  return {
    requiresInputCollection: true,
    inputRequest: params,
    instructions:
      "Please collect the requested input from the user and re-request this tool with the collected values. " +
      "Include the input results in your next request to continue the operation.",
  };
}

/**
 * Checks if a value is an elicitation polyfill result.
 *
 * @param value - The value to check
 * @returns true if the value is an ElicitationPolyfillResult
 */
export function isElicitationPolyfillResult(
  value: unknown,
): value is ElicitationPolyfillResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresInputCollection" in value &&
    (value as ElicitationPolyfillResult).requiresInputCollection === true
  );
}
