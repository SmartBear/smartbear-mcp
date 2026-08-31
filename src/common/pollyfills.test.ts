import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ElicitationPolyfillResult,
  executeElicitationOrPolyfill,
  isElicitationPolyfillResult,
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
});
