/**
 * Graceful shutdown coordination.
 *
 * Owns SIGTERM / SIGINT handling and runs registered cleanup callbacks in
 * LIFO order with a deadline. Designed so each transport / subsystem can
 * register its own teardown without knowing about the others.
 *
 * Lifecycle:
 *   idle      -> initial state
 *   draining  -> first signal received; isDraining() returns true so
 *                readiness probes can flip to 503 and tools can refuse new
 *                work if they choose to. Handlers are running.
 *   complete  -> handlers finished or deadline hit; process is about to exit.
 *
 * Double-signal escalation: a second SIGTERM/SIGINT during drain forces an
 * immediate exit(1) without waiting for outstanding handlers.
 *
 * Exit codes:
 *   0  clean drain
 *   1  deadline exceeded, or forced exit via second signal
 */

export type ShutdownHandler = () => Promise<void> | void;

interface RegisteredHandler {
  name: string;
  fn: ShutdownHandler;
}

export interface ShutdownManagerOptions {
  /** Signals to listen for. Defaults to ['SIGTERM', 'SIGINT']. */
  signals?: NodeJS.Signals[];
  /** Drain deadline in milliseconds. Defaults to MCP_SHUTDOWN_TIMEOUT_MS or 25000. */
  timeoutMs?: number;
  /** Process to attach handlers to. Injectable for tests. */
  process?: NodeJS.Process;
  /** Exit function. Injectable for tests. */
  exit?: (code: number) => void;
  /** Logger. Injectable for tests. */
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface DrainResult {
  status: "clean" | "deadline";
  durationMs: number;
  /** Names of handlers that did not complete before the deadline. */
  remainingHandlers: string[];
}

const DEFAULT_TIMEOUT_MS = 25_000;

function defaultTimeout(): number {
  const fromEnv = process.env.MCP_SHUTDOWN_TIMEOUT_MS;
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TIMEOUT_MS;
}

export class ShutdownManager {
  private handlers: RegisteredHandler[] = [];
  private state: "idle" | "draining" | "complete" = "idle";
  private signalsInstalled = false;
  private installedSignalListeners: Array<{
    signal: NodeJS.Signals;
    listener: NodeJS.SignalsListener;
  }> = [];

  private readonly signals: NodeJS.Signals[];
  private readonly timeoutMs: number;
  private readonly proc: NodeJS.Process;
  private readonly exitFn: (code: number) => void;
  private readonly logger: Pick<Console, "log" | "warn" | "error">;

  constructor(options: ShutdownManagerOptions = {}) {
    this.signals = options.signals ?? ["SIGTERM", "SIGINT"];
    this.timeoutMs = options.timeoutMs ?? defaultTimeout();
    this.proc = options.process ?? process;
    this.exitFn = options.exit ?? ((code: number) => process.exit(code));
    this.logger = options.logger ?? console;
  }

  /**
   * Register a cleanup handler. Handlers run in LIFO order on shutdown,
   * so subsystems registered later (closer to where they are used) tear
   * down before subsystems registered earlier (closer to startup).
   */
  register(name: string, fn: ShutdownHandler): void {
    if (this.state !== "idle") {
      this.logger.warn(
        `[MCP][shutdown] Refusing to register handler "${name}" — already ${this.state}`,
      );
      return;
    }
    this.handlers.push({ name, fn });
  }

  /** True from the moment the first shutdown signal is received. */
  isDraining(): boolean {
    return this.state !== "idle";
  }

  /**
   * Wire SIGTERM / SIGINT listeners. Idempotent — calling more than once
   * is a no-op.
   */
  installSignalHandlers(): void {
    if (this.signalsInstalled) return;
    this.signalsInstalled = true;

    for (const signal of this.signals) {
      const listener: NodeJS.SignalsListener = () => {
        this.handleSignal(signal);
      };
      this.proc.on(signal, listener);
      this.installedSignalListeners.push({ signal, listener });
    }
  }

  /** Tear down installed signal listeners (test-only). */
  uninstallSignalHandlers(): void {
    for (const { signal, listener } of this.installedSignalListeners) {
      this.proc.off(signal, listener);
    }
    this.installedSignalListeners = [];
    this.signalsInstalled = false;
  }

  /**
   * Run all registered handlers in LIFO order with the configured deadline.
   * Returns the drain result without exiting the process — exposed for tests
   * and for callers that want to log / report before exiting.
   */
  async drain(): Promise<DrainResult> {
    if (this.state === "complete") {
      return { status: "clean", durationMs: 0, remainingHandlers: [] };
    }
    this.state = "draining";

    const start = Date.now();
    const reversed = [...this.handlers].reverse();
    const remaining = new Set(reversed.map((h) => h.name));

    this.logger.log(
      `[MCP][shutdown] Draining ${reversed.length} handler(s), deadline ${this.timeoutMs}ms`,
    );

    let timeoutHandle: NodeJS.Timeout | undefined;
    const drainPromise = (async () => {
      for (const h of reversed) {
        try {
          await h.fn();
        } catch (err) {
          // Errors in one handler must not prevent others from running.
          this.logger.error(
            `[MCP][shutdown] Handler "${h.name}" threw during drain:`,
            err,
          );
        }
        remaining.delete(h.name);
      }
    })();

    const timeoutPromise = new Promise<"deadline">((resolve) => {
      timeoutHandle = setTimeout(() => resolve("deadline"), this.timeoutMs);
      // Don't keep the event loop alive solely for the deadline timer.
      timeoutHandle.unref?.();
    });

    const winner = await Promise.race([
      drainPromise.then(() => "clean" as const),
      timeoutPromise,
    ]);

    if (timeoutHandle) clearTimeout(timeoutHandle);
    this.state = "complete";

    const durationMs = Date.now() - start;
    const remainingHandlers = [...remaining];

    if (winner === "clean") {
      this.logger.log(`[MCP][shutdown] Drained cleanly in ${durationMs}ms`);
    } else {
      this.logger.error(
        `[MCP][shutdown] Deadline exceeded after ${durationMs}ms, ${remainingHandlers.length} handler(s) outstanding: ${remainingHandlers.join(", ") || "(none)"}`,
      );
    }
    return { status: winner, durationMs, remainingHandlers };
  }

  /** Exposed for tests; not part of the production call path. */
  getState(): "idle" | "draining" | "complete" {
    return this.state;
  }

  private handleSignal(signal: NodeJS.Signals): void {
    if (this.state === "draining") {
      // Second signal during drain — operator has lost patience; force exit.
      this.logger.warn(
        `[MCP][shutdown] Received ${signal} while draining — forcing immediate exit(1)`,
      );
      this.exitFn(1);
      return;
    }
    if (this.state === "complete") {
      // Already finished draining; just exit.
      this.exitFn(0);
      return;
    }

    this.logger.log(`[MCP][shutdown] Received ${signal}, starting drain`);
    this.drain()
      .then((result) => {
        this.exitFn(result.status === "clean" ? 0 : 1);
      })
      .catch((err) => {
        // drain() catches per-handler errors; this branch should not happen.
        this.logger.error(
          "[MCP][shutdown] Unexpected error from drain():",
          err,
        );
        this.exitFn(1);
      });
  }
}

/**
 * Singleton shutdown manager for the running process.
 * Tests should construct their own ShutdownManager rather than using this.
 */
export const shutdownManager = new ShutdownManager();

/** Convenience: register a handler on the singleton. */
export function registerShutdownHandler(
  name: string,
  fn: ShutdownHandler,
): void {
  shutdownManager.register(name, fn);
}

/** Convenience: install signal handlers on the singleton. */
export function installSignalHandlers(): void {
  shutdownManager.installSignalHandlers();
}

/** Convenience: query draining state on the singleton. */
export function isDraining(): boolean {
  return shutdownManager.isDraining();
}
