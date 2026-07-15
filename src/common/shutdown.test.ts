// Real Node EventEmitter/process are required to exercise signal handling and
// environment-variable configuration in these tests.
import { EventEmitter } from "node:events";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShutdownManager } from "./shutdown.ts";

/**
 * Build a fake process.on/off surface so tests can fire signals at the
 * manager without involving the real Node process.
 */
function fakeProcess(): NodeJS.Process {
  const emitter = new EventEmitter();
  const proc: Pick<NodeJS.Process, "on" | "off" | "emit" | "listenerCount"> = {
    on: emitter.on.bind(emitter) as NodeJS.Process["on"],
    off: emitter.off.bind(emitter) as NodeJS.Process["off"],
    emit: emitter.emit.bind(emitter) as NodeJS.Process["emit"],
    listenerCount: emitter.listenerCount.bind(
      emitter,
    ) as NodeJS.Process["listenerCount"],
  };
  return proc as NodeJS.Process;
}

function silentLogger() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

// Shared no-op used throughout as a stand-in `exit`/handler body.
// biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op stub
function noop(): void {}

describe("ShutdownManager.drain", () => {
  it("runs handlers in LIFO order", async () => {
    const order: string[] = [];
    const m = new ShutdownManager({
      logger: silentLogger(),
      exit: noop,
    });
    m.register("first", () => {
      order.push("first");
    });
    m.register("second", () => {
      order.push("second");
    });
    m.register("third", () => {
      order.push("third");
    });

    const result = await m.drain();

    expect(result.status).toBe("clean");
    expect(order).toEqual(["third", "second", "first"]);
  });

  it("awaits async handlers sequentially", async () => {
    const order: string[] = [];
    const m = new ShutdownManager({
      logger: silentLogger(),
      exit: noop,
    });
    m.register("a", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("a-done");
    });
    m.register("b", async () => {
      order.push("b-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("b-done");
    });

    await m.drain();

    // LIFO: b runs first, fully, then a.
    expect(order).toEqual(["b-start", "b-done", "a-done"]);
  });

  it("continues running subsequent handlers when one throws", async () => {
    const ran: string[] = [];
    const logger = silentLogger();
    const m = new ShutdownManager({ logger, exit: noop });
    m.register("good-1", () => {
      ran.push("good-1");
    });
    m.register("bad", () => {
      throw new Error("boom");
    });
    m.register("good-2", () => {
      ran.push("good-2");
    });

    const result = await m.drain();

    expect(result.status).toBe("clean");
    expect(ran).toEqual(["good-2", "good-1"]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Handler "bad" threw'),
      expect.any(Error),
    );
  });

  it("continues when an async handler rejects", async () => {
    const ran: string[] = [];
    const logger = silentLogger();
    const m = new ShutdownManager({ logger, exit: noop });
    m.register("ok", () => {
      ran.push("ok");
    });
    m.register("rejects", () => Promise.reject(new Error("async boom")));

    const result = await m.drain();

    expect(result.status).toBe("clean");
    expect(ran).toEqual(["ok"]);
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns deadline status with names of unfinished handlers", async () => {
    const m = new ShutdownManager({
      timeoutMs: 50,
      logger: silentLogger(),
      exit: noop,
    });
    m.register("fast", noop);
    m.register("hangs", () => new Promise<void>(noop));

    const result = await m.drain();

    expect(result.status).toBe("deadline");
    // LIFO: "hangs" runs first and never finishes, so "hangs" and "fast"
    // are both in the remaining set.
    expect(result.remainingHandlers).toContain("hangs");
    expect(result.remainingHandlers).toContain("fast");
  });

  it("flips isDraining() during drain and getState() through the lifecycle", async () => {
    const m = new ShutdownManager({
      logger: silentLogger(),
      exit: noop,
    });
    expect(m.isDraining()).toBe(false);
    expect(m.getState()).toBe("idle");

    let observedDuringHandler: boolean | undefined;
    m.register("observe", () => {
      observedDuringHandler = m.isDraining();
    });

    await m.drain();

    expect(observedDuringHandler).toBe(true);
    expect(m.isDraining()).toBe(true); // still true once complete (state is "complete", not "idle")
    expect(m.getState()).toBe("complete");
  });

  it("is idempotent: second drain is a no-op", async () => {
    const handler = vi.fn();
    const m = new ShutdownManager({
      logger: silentLogger(),
      exit: noop,
    });
    m.register("once", handler);

    await m.drain();
    await m.drain();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("refuses to register handlers after drain has started", async () => {
    const logger = silentLogger();
    const m = new ShutdownManager({ logger, exit: noop });
    m.register("first", noop);
    const drainPromise = m.drain();
    // Once drain has begun, late registrations are rejected.
    m.register("late", () => {
      throw new Error("should not run");
    });
    await drainPromise;

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Refusing to register handler "late"'),
    );
  });
});

describe("ShutdownManager signal handling", () => {
  let proc: NodeJS.Process;
  let exit: ReturnType<typeof vi.fn>;
  let logger: ReturnType<typeof silentLogger>;

  beforeEach(() => {
    proc = fakeProcess();
    exit = vi.fn();
    logger = silentLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers drain on SIGTERM and exits 0 on clean drain", async () => {
    const handler = vi.fn();
    const m = new ShutdownManager({ process: proc, exit, logger });
    m.register("h", handler);
    m.installSignalHandlers();

    (proc as unknown as EventEmitter).emit("SIGTERM");

    // Drain runs on the microtask queue; flush.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("exits 1 when drain hits the deadline", async () => {
    const m = new ShutdownManager({
      process: proc,
      exit,
      logger,
      timeoutMs: 20,
    });
    m.register("hangs", () => new Promise<void>(noop));
    m.installSignalHandlers();

    (proc as unknown as EventEmitter).emit("SIGTERM");

    // Wait past the deadline.
    await new Promise((r) => setTimeout(r, 60));

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("forces exit(1) on a second signal during drain", async () => {
    const m = new ShutdownManager({
      process: proc,
      exit,
      logger,
      timeoutMs: 5000,
    });
    m.register("slow", () => new Promise((r) => setTimeout(r, 200)));
    m.installSignalHandlers();

    (proc as unknown as EventEmitter).emit("SIGTERM");
    // Yield so drain enters the "draining" state.
    await new Promise((r) => setImmediate(r));
    expect(m.isDraining()).toBe(true);

    (proc as unknown as EventEmitter).emit("SIGTERM");

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Received SIGTERM while draining"),
    );
  });

  it("listens on SIGTERM and SIGINT by default", () => {
    const m = new ShutdownManager({ process: proc, exit, logger });
    m.installSignalHandlers();

    expect((proc as unknown as EventEmitter).listenerCount("SIGTERM")).toBe(1);
    expect((proc as unknown as EventEmitter).listenerCount("SIGINT")).toBe(1);
  });

  it("installSignalHandlers is idempotent", () => {
    const m = new ShutdownManager({ process: proc, exit, logger });
    m.installSignalHandlers();
    m.installSignalHandlers();
    expect((proc as unknown as EventEmitter).listenerCount("SIGTERM")).toBe(1);
  });

  it("uninstallSignalHandlers removes listeners", () => {
    const m = new ShutdownManager({ process: proc, exit, logger });
    m.installSignalHandlers();
    m.uninstallSignalHandlers();
    expect((proc as unknown as EventEmitter).listenerCount("SIGTERM")).toBe(0);
    expect((proc as unknown as EventEmitter).listenerCount("SIGINT")).toBe(0);
  });
});

describe("ShutdownManager configuration", () => {
  it("reads MCP_SHUTDOWN_TIMEOUT_MS for default timeout", async () => {
    const original = process.env.MCP_SHUTDOWN_TIMEOUT_MS;
    process.env.MCP_SHUTDOWN_TIMEOUT_MS = "30";

    const m = new ShutdownManager({ logger: silentLogger(), exit: noop });
    m.register("hangs", () => new Promise<void>(noop));
    const result = await m.drain();

    expect(result.status).toBe("deadline");
    // Should have hit deadline at ~30ms, well under any default.
    expect(result.durationMs).toBeLessThan(500);

    if (original === undefined) {
      delete process.env.MCP_SHUTDOWN_TIMEOUT_MS;
    } else {
      process.env.MCP_SHUTDOWN_TIMEOUT_MS = original;
    }
  });

  it("ignores invalid MCP_SHUTDOWN_TIMEOUT_MS", () => {
    const original = process.env.MCP_SHUTDOWN_TIMEOUT_MS;
    process.env.MCP_SHUTDOWN_TIMEOUT_MS = "not-a-number";

    // Should not throw at construction time.
    expect(
      () => new ShutdownManager({ logger: silentLogger(), exit: noop }),
    ).not.toThrow();

    if (original === undefined) {
      delete process.env.MCP_SHUTDOWN_TIMEOUT_MS;
    } else {
      process.env.MCP_SHUTDOWN_TIMEOUT_MS = original;
    }
  });
});
