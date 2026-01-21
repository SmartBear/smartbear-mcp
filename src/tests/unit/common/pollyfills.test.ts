import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ElicitationPolyfillResult,
  executeElicitationOrPolyfill,
  executeSamplingOrPolyfill,
  isElicitationPolyfillResult,
  isSamplingPolyfillResult,
  type SamplingPolyfillResult,
} from "../../../common/pollyfills";
import type { SmartBearMcpServer } from "../../../common/server";

describe("Polyfills", () => {
  describe("executeSamplingOrPolyfill", () => {
    let mockServer: SmartBearMcpServer;

    beforeEach(() => {
      mockServer = {
        isSamplingSupported: vi.fn(),
        server: {
          createMessage: vi.fn(),
        },
      } as unknown as SmartBearMcpServer;
    });

    it("should return polyfill result when sampling is not supported", async () => {
      vi.mocked(mockServer.isSamplingSupported).mockReturnValue(false);

      const prompt = "Test prompt";
      const result = await executeSamplingOrPolyfill(mockServer, prompt);

      expect(isSamplingPolyfillResult(result)).toBe(true);
      if (isSamplingPolyfillResult(result)) {
        expect(result.requiresPromptExecution).toBe(true);
        expect(result.prompt).toBe(prompt);
        expect(result.instructions).toContain(
          "Please execute the above prompt using your AI capabilities",
        );
      }
      expect(mockServer.server.createMessage).not.toHaveBeenCalled();
    });

    it("should return text response when sampling succeeds", async () => {
      vi.mocked(mockServer.isSamplingSupported).mockReturnValue(true);
      const expectedText = "Sampled response";
      vi.mocked(mockServer.server.createMessage).mockResolvedValue({
        model: "test-model",
        role: "assistant",
        content: {
          type: "text",
          text: expectedText,
        },
      });

      const prompt = "Test prompt";
      const result = await executeSamplingOrPolyfill(mockServer, prompt);

      expect(result).toBe(expectedText);
      expect(mockServer.server.createMessage).toHaveBeenCalledWith({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: prompt,
            },
          },
        ],
        maxTokens: 1000,
      });
    });

    it("should use custom maxTokens when provided", async () => {
      vi.mocked(mockServer.isSamplingSupported).mockReturnValue(true);
      vi.mocked(mockServer.server.createMessage).mockResolvedValue({
        model: "test-model",
        role: "assistant",
        content: {
          type: "text",
          text: "Response",
        },
      });

      const customMaxTokens = 2000;
      await executeSamplingOrPolyfill(
        mockServer,
        "Test prompt",
        customMaxTokens,
      );

      expect(mockServer.server.createMessage).toHaveBeenCalledWith({
        messages: expect.any(Array),
        maxTokens: customMaxTokens,
      });
    });

    it("should return polyfill result when response type is not text", async () => {
      vi.mocked(mockServer.isSamplingSupported).mockReturnValue(true);
      vi.mocked(mockServer.server.createMessage).mockResolvedValue({
        model: "test-model",
        role: "assistant",
        content: {
          type: "image",
          data: "...",
        },
      } as any);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const prompt = "Test prompt";
      const result = await executeSamplingOrPolyfill(mockServer, prompt);

      // Should fall back to polyfill when response type is unexpected
      expect(isSamplingPolyfillResult(result)).toBe(true);
      if (isSamplingPolyfillResult(result)) {
        expect(result.prompt).toBe(prompt);
      }
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return polyfill result when sampling throws error", async () => {
      vi.mocked(mockServer.isSamplingSupported).mockReturnValue(true);
      vi.mocked(mockServer.server.createMessage).mockRejectedValue(
        new Error("Sampling failed"),
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const prompt = "Test prompt";
      const result = await executeSamplingOrPolyfill(mockServer, prompt);

      expect(isSamplingPolyfillResult(result)).toBe(true);
      if (isSamplingPolyfillResult(result)) {
        expect(result.prompt).toBe(prompt);
      }
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("isSamplingPolyfillResult", () => {
    it("should return true for valid SamplingPolyfillResult", () => {
      const result: SamplingPolyfillResult = {
        requiresPromptExecution: true,
        prompt: "Test prompt",
        instructions: "Instructions",
      };

      expect(isSamplingPolyfillResult(result)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isSamplingPolyfillResult(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isSamplingPolyfillResult(undefined)).toBe(false);
    });

    it("should return false for non-object values", () => {
      expect(isSamplingPolyfillResult("string")).toBe(false);
      expect(isSamplingPolyfillResult(123)).toBe(false);
      expect(isSamplingPolyfillResult(true)).toBe(false);
    });

    it("should return false for object without requiresPromptExecution", () => {
      expect(
        isSamplingPolyfillResult({
          prompt: "Test",
          instructions: "Test",
        }),
      ).toBe(false);
    });

    it("should return false when requiresPromptExecution is false", () => {
      expect(
        isSamplingPolyfillResult({
          requiresPromptExecution: false,
          prompt: "Test",
          instructions: "Test",
        }),
      ).toBe(false);
    });

    it("should return false for ElicitationPolyfillResult", () => {
      const result: ElicitationPolyfillResult = {
        requiresInputCollection: true,
        inputRequest: { message: "Test", requestedSchema: {} as any },
        instructions: "Instructions",
      };

      expect(isSamplingPolyfillResult(result)).toBe(false);
    });
  });

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

    it("should return false for SamplingPolyfillResult", () => {
      const result: SamplingPolyfillResult = {
        requiresPromptExecution: true,
        prompt: "Test prompt",
        instructions: "Instructions",
      };

      expect(isElicitationPolyfillResult(result)).toBe(false);
    });
  });
});
