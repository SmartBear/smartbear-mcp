import { describe, it, expect, vi, beforeEach } from "vitest";
import { PactflowClient } from "../../../pactflow/client.js";
import * as toolsModule from "../../../pactflow/client/tools.js";
import createFetchMock from "vitest-fetch-mock";
import { afterEach } from "node:test";

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      client = new PactflowClient("test-token", "https://example.com", "pactflow");
      expect(client).toBeInstanceOf(PactflowClient);
      expect(client["baseUrl"]).toBe("https://example.com");
      expect(client["clientType"]).toBe("pactflow");
    });

    it("sets correct headers when client is pactflow", () => {
      client = new PactflowClient("my-token", "https://example.com", "pactflow");

      expect(client["headers"]).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining("Bearer my-token"),
          "Content-Type": expect.stringContaining("application/json"),
        })
      );
    });

    it("sets correct headers when client is pact_broker", () => {
      client = new PactflowClient(
        { username: "user", password: "pass" },
        "https://example.com",
        "pact_broker"
      );

      expect(client["headers"]).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining(
            `Basic ${Buffer.from("user:pass").toString("base64")}`
          ),
          "Content-Type": expect.stringContaining("application/json"),
        })
      );
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();

    it("registers only tools matching the given clientType", () => {
      // Arrange — mock TOOLS with multiple client types
      const fakeTools = [
        {
          title: "tool1",
          summary: "summary1",
          purpose: "purpose1",
          parameters: [],
          handler: "generate",
          clients: ["pactflow"], // should be registered
        },
        {
          title: "tool2",
          summary: "summary2",
          purpose: "purpose2",
          parameters: [],
          handler: "generate",
          clients: ["pact_broker"], // should NOT be registered
        },
      ];
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue(fakeTools as any);

      const client = new PactflowClient("token", "https://example.com", "pactflow");
      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0].title).toBe("tool1");
      expect(mockRegister.mock.calls[0][0].summary).toBe("summary1");
    });

    it("registers no tools if none match the clientType", () => {
      const fakeTools = [
        {
          title: "tool2",
          summary: "summary2",
          purpose: "purpose2",
          parameters: [],
          handler: "generate",
          clients: ["pact_broker"],
        },
      ];
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue(fakeTools as any);

      const client = new PactflowClient("token", "https://example.com", "pactflow");
      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe("API Methods", () => {
    beforeEach(() => {
      client = new PactflowClient("test-token", "https://example.com", "pactflow");
      global.fetch = vi.fn();
    });

    describe("canIDeploy", () => {
      const mockInput = {
        pacticipant: "my-service",
        version: "1.0.0",
        environment: "production",
      };

      it("should successfully check if deployment is allowed", async () => {
        const mockResponse = {
          summary: { deployable: true, failed: 0 },
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await client.canIDeploy(mockInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service&version=1.0.0&environment=production",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
        expect(result.summary.deployable).toBe(true);
      });

      it("should handle deployment not allowed scenario", async () => {
        const mockResponse = {
          summary: { deployable: false },
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await client.canIDeploy(mockInput);

        expect(result.summary.deployable).toBe(false);
      });

      it("should handle HTTP errors correctly", async () => {
        const errorText = "Pacticipant not found";
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: vi.fn().mockResolvedValueOnce(errorText),
        });

        await expect(client.canIDeploy(mockInput)).rejects.toThrow(
          "Can-I-Deploy Request Failed - status: 404 Not Found - Pacticipant not found"
        );
      });

      it("should properly encode URL parameters", async () => {
        const inputWithSpecialChars = {
          pacticipant: "my-service@special",
          version: "1.0.0-beta+build.123",
          environment: "test/staging",
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ summary: { deployable: true } }),
        });

        await client.canIDeploy(inputWithSpecialChars);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service%40special&version=1.0.0-beta%2Bbuild.123&environment=test%2Fstaging",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
      });
    });
  });
});
