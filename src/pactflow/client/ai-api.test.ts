import { describe, it, expect, beforeEach } from "vitest";
import { AIApi } from "./ai-api";
import { createMockHttpClient } from "./test-helpers";
import type { StatusResponse, GenerationResponse, RefineResponse, Entitlement } from "./ai";

describe("AIApi", () => {
  let api: AIApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;
  const aiBaseUrl = "https://ai.test.example.com";

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new AIApi(mockHttp, aiBaseUrl);
  });

  describe("checkAIEntitlements", () => {
    it("calls http.fetch with the correct entitlement URL", async () => {
      const mockEntitlement: Entitlement = {
        organizationEntitlements: {
          name: "test-org",
          planAiEnabled: true,
          preferencesAiEnabled: true,
          aiCredits: { total: 100, used: 10 },
        },
        userEntitlements: {
          aiPermissions: ["generate", "review"],
        },
        aiEnabled: true,
      };
      (mockHttp.fetch as ReturnType<typeof import("vitest").vi.fn>).mockResolvedValueOnce(mockEntitlement);

      const result = await api.checkAIEntitlements();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `${aiBaseUrl}/entitlement`,
        {
          method: "GET",
          errorContext: "PactFlow AI Entitlements Request",
        },
      );
      expect(result).toEqual(mockEntitlement);
    });

    it("returns null when aiBaseUrl is undefined", async () => {
      const apiWithNoUrl = new AIApi(mockHttp, undefined);
      const result = await apiWithNoUrl.checkAIEntitlements();
      expect(result).toBeNull();
      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });
  });

  describe("generate", () => {
    it("polls for completion and returns result", async () => {
      const mockStatusResponse: StatusResponse = {
        status: "accepted",
        session_id: "session-123",
        submitted_at: new Date().toISOString(),
        status_url: `${aiBaseUrl}/status/123`,
        result_url: `${aiBaseUrl}/result/123`,
      };
      const mockGenerationResult: GenerationResponse = {
        code: "test code",
        language: "typescript",
      };

      // First call: submitHttpCallback returns StatusResponse
      (mockHttp.fetch as ReturnType<typeof import("vitest").vi.fn>)
        .mockResolvedValueOnce(mockStatusResponse)
        // Second call: getResult returns the typed result
        .mockResolvedValueOnce(mockGenerationResult);

      // getStatus HEAD returns 200 (complete)
      (mockHttp.fetchRaw as ReturnType<typeof import("vitest").vi.fn>)
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const result = await api.generate({ language: "typescript" }, async () => ({}));

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `${aiBaseUrl}/generate`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockHttp.fetchRaw).toHaveBeenCalledWith(
        mockStatusResponse.status_url,
        { method: "HEAD" },
      );
      expect(mockHttp.fetch).toHaveBeenCalledWith(mockStatusResponse.result_url);
      expect(result).toEqual(mockGenerationResult);
    });

    it("propagates error when http.fetch rejects on submission", async () => {
      (mockHttp.fetch as ReturnType<typeof import("vitest").vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(
        api.generate({ language: "typescript" }, async () => ({})),
      ).rejects.toThrow("Network error");
    });
  });

  describe("review", () => {
    it("polls for completion and returns result", async () => {
      const mockStatusResponse: StatusResponse = {
        status: "accepted",
        session_id: "session-456",
        submitted_at: new Date().toISOString(),
        status_url: `${aiBaseUrl}/status/456`,
        result_url: `${aiBaseUrl}/result/456`,
      };
      const mockRefineResult: RefineResponse = {
        recommendations: [{ recommendation: "Add more assertions" }],
      };

      (mockHttp.fetch as ReturnType<typeof import("vitest").vi.fn>)
        .mockResolvedValueOnce(mockStatusResponse)
        .mockResolvedValueOnce(mockRefineResult);

      (mockHttp.fetchRaw as ReturnType<typeof import("vitest").vi.fn>)
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const result = await api.review(
        { pactTests: { body: "test content" } },
        async () => ({}),
      );

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `${aiBaseUrl}/review`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(mockRefineResult);
    });
  });

  describe("handlers", () => {
    it("exposes all 3 handler keys", () => {
      const handlers = api.handlers;
      expect(handlers).toHaveProperty("generate");
      expect(handlers).toHaveProperty("review");
      expect(handlers).toHaveProperty("checkAIEntitlements");
      expect(typeof handlers.generate).toBe("function");
      expect(typeof handlers.review).toBe("function");
      expect(typeof handlers.checkAIEntitlements).toBe("function");
    });
  });
});
