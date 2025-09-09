import { describe, it, expect, vi, beforeEach } from "vitest";
import { PactflowClient } from "../../../pactflow/client.js";
import * as toolsModule from "../../../pactflow/client/tools.js";

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

    describe("getMatrix", () => {
      const mockMatrixInput = {
        latestby: "cvp",
        limit: 100,
        q: [
          {
            pacticipant: "Example API",
            version: "1.0.0",
            latest: true,
          },
        ],
      };

      const mockMatrixResponse = {
        matrix: [
          {
            consumer: { name: "Consumer App", version: { number: "1.0.0" } },
            provider: { name: "Example API", version: { number: "1.0.0" } },
            pact: { createdAt: "2024-01-01T00:00:00Z" },
            verificationResult: { success: true, verifiedAt: "2024-01-01T01:00:00Z" },
          },
        ],
        notices: [
          {
            text: "All verification results are successful",
            type: "success",
          },
        ],
        summary: {
          deployable: true,
          failed: 0,
          success: 1,
          unknown: 0,
          reason: "All pacts are verified",
        },
      };

      it("should successfully retrieve matrix with basic parameters", async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockMatrixResponse),
        });

        const result = await client.getMatrix(mockMatrixInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvp&limit=100&q[]pacticipant=Example%20API&q[]version=1.0.0&q[]latest=true",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
        expect(result.summary.deployable).toBe(true);
        expect(result.matrix).toHaveLength(1);
      });

      it("should handle matrix with multiple selectors", async () => {
        const multiSelectorInput = {
          latestby: "cvpv",
          q: [
            {
              pacticipant: "Consumer App",
              branch: "main",
              latest: true,
            },
            {
              pacticipant: "Provider API",
              environment: "production",
              tag: "v1.0",
            },
          ],
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockMatrixResponse),
        });

        await client.getMatrix(multiSelectorInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvpv&q[]pacticipant=Consumer%20App&q[]branch=main&q[]latest=true&q[]pacticipant=Provider%20API&q[]environment=production&q[]tag=v1.0",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
      });

      it("should handle matrix with all optional selector parameters", async () => {
        const fullSelectorInput = {
          limit: 50,
          q: [
            {
              pacticipant: "Full Service",
              version: "2.1.0",
              branch: "feature/new-api",
              environment: "staging",
              latest: false,
              tag: "beta",
              mainBranch: true,
            },
          ],
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockMatrixResponse),
        });

        await client.getMatrix(fullSelectorInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/matrix?limit=50&q[]pacticipant=Full%20Service&q[]version=2.1.0&q[]branch=feature%2Fnew-api&q[]environment=staging&q[]latest=false&q[]tag=beta&q[]mainBranch=true",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
      });

      it("should handle matrix with minimal parameters", async () => {
        const minimalInput = {
          q: [
            {
              pacticipant: "Simple Service",
            },
          ],
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockMatrixResponse),
        });

        await client.getMatrix(minimalInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Simple%20Service",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
      });

      it("should properly encode special characters in parameters", async () => {
        const specialCharsInput = {
          q: [
            {
              pacticipant: "Service@Company/API",
              version: "1.0.0-beta+build.123",
              branch: "feature/fix-bug#123",
              environment: "test/staging",
              tag: "v1.0.0-rc.1",
            },
          ],
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValueOnce(mockMatrixResponse),
        });

        await client.getMatrix(specialCharsInput);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Service%40Company%2FAPI&q[]version=1.0.0-beta%2Bbuild.123&q[]branch=feature%2Ffix-bug%23123&q[]environment=test%2Fstaging&q[]tag=v1.0.0-rc.1",
          {
            method: "GET",
            headers: client["headers"],
          }
        );
      });

      it("should handle HTTP 400 error with meaningful message", async () => {
        const errorText = "Invalid query parameters";
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          text: vi.fn().mockResolvedValueOnce(errorText),
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 400 Bad Request - Invalid query parameters"
        );
      });

      it("should handle HTTP 404 error when pacticipant not found", async () => {
        const errorText = "Pacticipant not found";
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: vi.fn().mockResolvedValueOnce(errorText),
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 404 Not Found - Pacticipant not found"
        );
      });

    });
  });
});
