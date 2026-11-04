import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ElicitationPolyfillResult,
  type ElicitationScopeContext,
  executeElicitationOrPolyfill,
  InputRequiredSignal,
  isElicitationPolyfillResult,
  runWithElicitationScope,
} from "./pollyfills";
import type { SmartBearMcpServer } from "./server";

describe("Polyfills", () => {
  describe("executeElicitationOrPolyfill", () => {
    let mockServer: SmartBearMcpServer;

    beforeEach(() => {
      mockServer = {
        isElicitationSupported: vi.fn(),
        server: {
          elicitInput: vi.fn(),
        },
      } as unknown as SmartBearMcpServer;
    });

    it("should return polyfill result when elicitation is not supported", async () => {
      vi.mocked(mockServer.isElicitationSupported).mockReturnValue(false);

      const params = {
        message: "Enter your name",
        requestedSchema: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      };

      const result = await executeElicitationOrPolyfill(mockServer, params);

      expect(isElicitationPolyfillResult(result)).toBe(true);
      if (isElicitationPolyfillResult(result)) {
        expect(result.requiresInputCollection).toBe(true);
        expect(result.inputRequest).toBe(params);
        expect(result.instructions).toContain(
          "Please collect the requested input from the user",
        );
      }
      expect(mockServer.server.elicitInput).not.toHaveBeenCalled();
    });

    it("should return elicit result when elicitation succeeds", async () => {
      vi.mocked(mockServer.isElicitationSupported).mockReturnValue(true);

      const params = {
        message: "Enter your name",
        requestedSchema: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      };

      const expectedResult = {
        action: "accept" as const,
        content: { name: "John Doe" },
      };

      vi.mocked(mockServer.server.elicitInput).mockResolvedValue(
        expectedResult,
      );

      const result = await executeElicitationOrPolyfill(mockServer, params);

      expect(result).toBe(expectedResult);
      expect(mockServer.server.elicitInput).toHaveBeenCalledWith(
        params,
        undefined,
      );
    });

    it("should pass options to elicitInput when provided", async () => {
      vi.mocked(mockServer.isElicitationSupported).mockReturnValue(true);

      const params = {
        message: "Enter your name",
        requestedSchema: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      };

      const options = { timeout: 5000 };

      vi.mocked(mockServer.server.elicitInput).mockResolvedValue({
        action: "accept" as const,
        content: {},
      });

      await executeElicitationOrPolyfill(mockServer, params, options);

      expect(mockServer.server.elicitInput).toHaveBeenCalledWith(
        params,
        options,
      );
    });

    it("should return polyfill result when elicitation throws error", async () => {
      vi.mocked(mockServer.isElicitationSupported).mockReturnValue(true);
      vi.mocked(mockServer.server.elicitInput).mockRejectedValue(
        new Error("Elicitation failed"),
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const params = {
        message: "Enter your name",
        requestedSchema: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      };

      const result = await executeElicitationOrPolyfill(mockServer, params);

      expect(isElicitationPolyfillResult(result)).toBe(true);
      if (isElicitationPolyfillResult(result)) {
        expect(result.inputRequest).toBe(params);
      }
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("isElicitationPolyfillResult", () => {
    it("should return true for valid ElicitationPolyfillResult", () => {
      const result: ElicitationPolyfillResult = {
        requiresInputCollection: true,
        inputRequest: {
          message: "Test",
          requestedSchema: {
            type: "object" as const,
            properties: {},
          },
        },
        instructions: "Instructions",
      };

      expect(isElicitationPolyfillResult(result)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isElicitationPolyfillResult(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isElicitationPolyfillResult(undefined)).toBe(false);
    });

    it("should return false for non-object values", () => {
      expect(isElicitationPolyfillResult("string")).toBe(false);
      expect(isElicitationPolyfillResult(123)).toBe(false);
      expect(isElicitationPolyfillResult(true)).toBe(false);
    });

    it("should return false for object without requiresInputCollection", () => {
      expect(
        isElicitationPolyfillResult({
          inputRequest: {},
          instructions: "Test",
        }),
      ).toBe(false);
    });

    it("should return false when requiresInputCollection is false", () => {
      expect(
        isElicitationPolyfillResult({
          requiresInputCollection: false,
          inputRequest: {},
          instructions: "Test",
        }),
      ).toBe(false);
    });

    it("should return false for a differently-shaped polyfill result", () => {
      const result = {
        requiresPromptExecution: true,
        prompt: "Test prompt",
        instructions: "Instructions",
      };

      expect(isElicitationPolyfillResult(result)).toBe(false);
    });
  });

  describe("MRTR elicitation (modern era)", () => {
    let mockServer: SmartBearMcpServer;

    const params = {
      message: "Enter severity",
      requestedSchema: {
        type: "object" as const,
        properties: {
          severity: { type: "string" as const },
        },
        required: ["severity"],
      },
    };

    /**
     * ctx of a modern-era request that declared the `elicitation` capability
     * (required — the SDK refuses embedded elicitations otherwise).
     */
    function modernCtx(
      inputResponses?: Record<string, unknown>,
      requestState?: string,
    ): ElicitationScopeContext {
      return {
        mcpReq: {
          envelope: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {
              elicitation: { form: {} },
            },
          },
          inputResponses,
          requestState: <T>() => requestState as T | undefined,
        },
      };
    }

    /** Extract the InputRequiredSignal thrown for an unanswered elicitation. */
    async function captureSignal(
      ctx: ElicitationScopeContext,
    ): Promise<InputRequiredSignal> {
      return runWithElicitationScope(ctx, async () => {
        try {
          await executeElicitationOrPolyfill(mockServer, params);
        } catch (e) {
          if (e instanceof InputRequiredSignal) return e;
          throw e;
        }
        throw new Error("expected InputRequiredSignal");
      });
    }

    beforeEach(() => {
      mockServer = {
        isElicitationSupported: vi.fn().mockReturnValue(false),
        server: { elicitInput: vi.fn() },
      } as unknown as SmartBearMcpServer;
    });

    it("signals input_required when the round carries no answer", async () => {
      const signal = await captureSignal(modernCtx());

      expect(signal.result.resultType).toBe("input_required");
      const request = signal.result.inputRequests?.input_1 as any;
      expect(request.method).toBe("elicitation/create");
      expect(request.params.message).toBe("Enter severity");
      // First round has no prior answers, so no state needs echoing.
      expect(signal.result.requestState).toBeUndefined();
      // Modern era must never reach the legacy machinery.
      expect(mockServer.isElicitationSupported).not.toHaveBeenCalled();
      expect(mockServer.server.elicitInput).not.toHaveBeenCalled();
    });

    it("returns the answer from this round's inputResponses", async () => {
      const result = await runWithElicitationScope(
        modernCtx({
          input_1: { action: "accept", content: { severity: "warning" } },
        }),
        () => executeElicitationOrPolyfill(mockServer, params),
      );

      expect(result).toEqual({
        action: "accept",
        content: { severity: "warning" },
      });
    });

    it("returns decline/cancel answers without content", async () => {
      const result = await runWithElicitationScope(
        modernCtx({ input_1: { action: "decline" } }),
        () => executeElicitationOrPolyfill(mockServer, params),
      );

      expect(result).toEqual({ action: "decline" });
    });

    it("carries earlier answers through requestState across rounds", async () => {
      // Round 2: input_1 was answered, the tool re-runs and asks a second
      // question. The signal for input_2 must echo input_1's answer in state.
      const answered = {
        input_1: { action: "accept" as const, content: { severity: "info" } },
      };
      const signal = await runWithElicitationScope(
        modernCtx(answered),
        async () => {
          const first = await executeElicitationOrPolyfill(mockServer, params);
          expect(first).toEqual({
            action: "accept",
            content: { severity: "info" },
          });
          try {
            await executeElicitationOrPolyfill(mockServer, params);
          } catch (e) {
            if (e instanceof InputRequiredSignal) return e;
            throw e;
          }
          throw new Error("expected InputRequiredSignal");
        },
      );

      expect(Object.keys(signal.result.inputRequests ?? {})).toEqual([
        "input_2",
      ]);
      expect(signal.result.requestState).toBeDefined();

      // Round 3: the client echoes that state and answers input_2. Both
      // elicitations now resolve and the tool can finish.
      const results = await runWithElicitationScope(
        modernCtx(
          { input_2: { action: "accept", content: { severity: "error" } } },
          signal.result.requestState,
        ),
        async () => [
          await executeElicitationOrPolyfill(mockServer, params),
          await executeElicitationOrPolyfill(mockServer, params),
        ],
      );

      expect(results).toEqual([
        { action: "accept", content: { severity: "info" } },
        { action: "accept", content: { severity: "error" } },
      ]);
    });

    it("discards malformed requestState and re-issues the request", async () => {
      const signal = await captureSignal(
        modernCtx(undefined, "not-valid-json{"),
      );

      expect(signal.result.resultType).toBe("input_required");
      expect(Object.keys(signal.result.inputRequests ?? {})).toEqual([
        "input_1",
      ]);
    });

    it("discards oversized requestState before parsing and re-issues the request", async () => {
      // Valid JSON with a real answer inside — but padded past the size cap.
      // If the cap were not applied, the answer would resolve and no signal
      // would be thrown at all.
      const oversized = JSON.stringify({
        v: 1,
        responses: {
          input_1: { action: "accept", content: { severity: "warning" } },
          padding: "x".repeat(40_000),
        },
      });
      const signal = await captureSignal(modernCtx(undefined, oversized));

      expect(signal.result.resultType).toBe("input_required");
      expect(Object.keys(signal.result.inputRequests ?? {})).toEqual([
        "input_1",
      ]);
    });

    it("honors the same requestState when it is under the size cap", async () => {
      const compact = JSON.stringify({
        v: 1,
        responses: {
          input_1: { action: "accept", content: { severity: "warning" } },
        },
      });
      const result = await runWithElicitationScope(
        modernCtx(undefined, compact),
        () => executeElicitationOrPolyfill(mockServer, params),
      );

      expect(result).toEqual({
        action: "accept",
        content: { severity: "warning" },
      });
    });

    it("re-issues a request whose response was malformed", async () => {
      // A wrapped {method, result} shape is not a bare response; the SDK
      // would drop it, and a nonsense value must not read as an answer.
      const signal = await captureSignal(
        modernCtx({ input_1: { nonsense: true } }),
      );

      expect(Object.keys(signal.result.inputRequests ?? {})).toEqual([
        "input_1",
      ]);
    });

    it("degrades to the polyfill when the client declares no elicitation", async () => {
      // Emitting input_required here would make the SDK fail the whole tool
      // call with -32021; the instruction polyfill needs no capability.
      const result = await runWithElicitationScope(
        {
          mcpReq: {
            envelope: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        },
        () => executeElicitationOrPolyfill(mockServer, params),
      );

      expect(isElicitationPolyfillResult(result)).toBe(true);
    });

    it("keeps the legacy path for legacy-era invocations", async () => {
      const result = await runWithElicitationScope({ mcpReq: {} }, () =>
        executeElicitationOrPolyfill(mockServer, params),
      );

      expect(isElicitationPolyfillResult(result)).toBe(true);
      expect(mockServer.isElicitationSupported).toHaveBeenCalled();
    });

    it("keeps the legacy path outside any scope", async () => {
      const result = await executeElicitationOrPolyfill(mockServer, params);

      expect(isElicitationPolyfillResult(result)).toBe(true);
    });
  });
});
