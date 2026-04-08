import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { PactflowClient } from "../../../pactflow/client";
import { GenerationInputSchema } from "../../../pactflow/client/ai";
import * as toolsModule from "../../../pactflow/client/tools";

const fetchMock = createFetchMock(vi);

// Helper to create and configure a client
async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
  base_url?: string;
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { server: vi.fn() } as any;
  const defaultConfig = {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  };
  await client.configure(mockServer, defaultConfig);
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    // Suppress console.error for error test cases
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("sets correct headers when client is pactflow", async () => {
      client = await createConfiguredClient({ token: "my-token" });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining("Bearer my-token"),
          "Content-Type": expect.stringContaining("application/json"),
        }),
      );
    });

    it("sets correct headers when client is pact_broker", async () => {
      client = await createConfiguredClient({
        username: "user",
        password: "pass",
      });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining(
            `Basic ${Buffer.from("user:pass").toString("base64")}`,
          ),
          "Content-Type": expect.stringContaining("application/json"),
        }),
      );
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();

    it("registers only tools matching the given clientType", async () => {
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

      const client = await createConfiguredClient({ token: "token" });
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0].title).toBe("tool1");
      expect(mockRegister.mock.calls[0][0].summary).toBe("summary1");
    });

    it("registers no tools if none match the clientType", async () => {
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

      const client = await createConfiguredClient({ token: "token" });
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
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

        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.canIDeploy(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service&version=1.0.0&environment=production",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.summary.deployable).toBe(true);
      });

      it("should handle deployment not allowed scenario", async () => {
        const mockResponse = {
          summary: { deployable: false },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.canIDeploy(mockInput);

        expect(result.summary.deployable).toBe(false);
      });

      it("should handle HTTP errors correctly", async () => {
        const errorText = "Pacticipant not found";
        fetchMock.mockResponseOnce(errorText, {
          status: 404,
          statusText: "Not Found",
        });

        await expect(client.canIDeploy(mockInput)).rejects.toThrow(
          "Can-I-Deploy Request Failed - status: 404 Not Found - Pacticipant not found",
        );
      });

      it("should properly encode URL parameters", async () => {
        const inputWithSpecialChars = {
          pacticipant: "my-service@special",
          version: "1.0.0-beta+build.123",
          environment: "test/staging",
        };

        fetchMock.mockResponseOnce(
          JSON.stringify({ summary: { deployable: true } }),
        );

        await client.canIDeploy(inputWithSpecialChars);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service%40special&version=1.0.0-beta%2Bbuild.123&environment=test%2Fstaging",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });
    });

    describe("review", () => {
      const mockReviewInput = {
        pactTests: {
          filename: "pact.test.js",
          body: "describe('Pact test', () => {});",
          language: "javascript",
        },
        language: "javascript",
      };

      const mockStatusResponse = {
        status_url: "https://example.com/api/ai/status/456",
        result_url: "https://example.com/api/ai/result/456",
      };

      const mockReviewResponse = {
        suggestions: ["Improve test coverage", "Add error scenario"],
        refined: true,
      };

      beforeEach(async () => {
        vi.spyOn(client, "pollForCompletion" as any).mockResolvedValue(
          mockReviewResponse,
        );
      });

      it("should successfully review Pact tests", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(mockReviewInput, vi.fn());

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/review",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(mockReviewInput),
          },
        );
        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle review with OpenAPI document and matcher", async () => {
        const inputWithOpenAPI = {
          ...mockReviewInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: {
                    operationId: "getUsers",
                    responses: { "200": { description: "Success" } },
                  },
                },
              },
            },
            matcher: {
              path: "/users",
              methods: ["GET"],
            },
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(inputWithOpenAPI, vi.fn());

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/review",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(inputWithOpenAPI),
          },
        );
        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle OpenAPI document without matcher by prompting user", async () => {
        const mockGetInput = vi.fn().mockResolvedValue({});
        vi.mock("../../../pactflow/client/prompt-utils", () => ({
          getOADMatcherRecommendations: vi.fn().mockResolvedValue({
            recommendations: [{ path: "/users", methods: ["GET"] }],
          }),
          getUserMatcherSelection: vi.fn().mockResolvedValue({
            path: "/users",
            methods: ["GET"],
          }),
        }));

        const inputWithoutMatcher = {
          ...mockReviewInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: {
                    operationId: "getUsers",
                    responses: { "200": { description: "Success" } },
                  },
                },
              },
            },
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(inputWithoutMatcher, mockGetInput);

        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle review with code files", async () => {
        const inputWithCode = {
          ...mockReviewInput,
          code: [
            {
              filename: "user-service.ts",
              body: "export class UserService { async getUsers() { return fetch('/api/users'); } }",
              language: "typescript",
            },
            {
              filename: "user.model.ts",
              body: "export interface User { id: string; name: string; }",
              language: "typescript",
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(inputWithCode, vi.fn());

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/review",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(inputWithCode),
          },
        );
        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle review with additional instructions", async () => {
        const inputWithInstructions = {
          ...mockReviewInput,
          userInstructions:
            "Focus on error scenarios and include authentication headers",
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(inputWithInstructions, vi.fn());

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/review",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(inputWithInstructions),
          },
        );
        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle review with test template", async () => {
        const inputWithTemplate = {
          ...mockReviewInput,
          testTemplate: {
            filename: "template.test.js",
            body: "// Template for Pact tests\nconst { Pact } = require('@pact-foundation/pact');",
            language: "javascript",
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.review(inputWithTemplate, vi.fn());

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/review",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(inputWithTemplate),
          },
        );
        expect(result).toEqual(mockReviewResponse);
      });

      it("should handle HTTP 400 error during review request", async () => {
        const errorText = "Invalid review parameters";
        fetchMock.mockResponseOnce(errorText, {
          status: 400,
          statusText: "Bad Request",
        });

        await expect(client.review(mockReviewInput, vi.fn())).rejects.toThrow(
          "HTTP callback submission to /review Failed - status: 400 Bad Request - Invalid review parameters",
        );
      });

      it("should handle network errors during review request", async () => {
        fetchMock.mockRejectOnce(new Error("Network error"));

        await expect(client.review(mockReviewInput, vi.fn())).rejects.toThrow(
          "Network error",
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
            verificationResult: {
              success: true,
              verifiedAt: "2024-01-01T01:00:00Z",
            },
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
        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        const result = await client.getMatrix(mockMatrixInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvp&limit=100&q[]pacticipant=Example%20API&q[]version=1.0.0&q[]latest=true",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
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

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(multiSelectorInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvpv&q[]pacticipant=Consumer%20App&q[]branch=main&q[]latest=true&q[]pacticipant=Provider%20API&q[]environment=production&q[]tag=v1.0",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
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

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(fullSelectorInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?limit=50&q[]pacticipant=Full%20Service&q[]version=2.1.0&q[]branch=feature%2Fnew-api&q[]environment=staging&q[]latest=false&q[]tag=beta&q[]mainBranch=true",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
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

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(minimalInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Simple%20Service",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
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

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(specialCharsInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Service%40Company%2FAPI&q[]version=1.0.0-beta%2Bbuild.123&q[]branch=feature%2Ffix-bug%23123&q[]environment=test%2Fstaging&q[]tag=v1.0.0-rc.1",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should handle HTTP 400 error with meaningful message", async () => {
        const errorText = "Invalid query parameters";
        fetchMock.mockResponseOnce(errorText, {
          status: 400,
          statusText: "Bad Request",
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 400 Bad Request - Invalid query parameters",
        );
      });

      it("should handle HTTP 404 error when pacticipant not found", async () => {
        const errorText = "Pacticipant not found";
        fetchMock.mockResponseOnce(errorText, {
          status: 404,
          statusText: "Not Found",
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 404 Not Found - Pacticipant not found",
        );
      });
    });

    describe("checkAIEntitlements", () => {
      const mockEntitlement = {
        organizationEntitlements: {
          name: "test-org",
          planAiEnabled: true,
          preferencesAiEnabled: true,
          aiCredits: { total: 1000, used: 100 },
        },
        userEntitlements: {
          aiPermissions: ["ai:generate", "ai:review"],
        },
      };

      it("should successfully retrieve AI status and entitlements", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockEntitlement));
        const result = await client.checkAIEntitlements();
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/entitlement",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.organizationEntitlements.name).toBe("test-org");
        expect(result.organizationEntitlements.aiCredits.total).toBe(1000);
        expect(result.userEntitlements.aiPermissions).toContain("ai:generate");
      });

      it("should handle HTTP errors correctly", async () => {
        const errorText = "Unauthorized";
        fetchMock.mockResponseOnce(errorText, {
          status: 401,
          statusText: "Unauthorized",
        });
        await expect(client.checkAIEntitlements()).rejects.toThrow(
          "PactFlow AI Entitlements Request Failed - status: 401 Unauthorized - Unauthorized",
        );
      });
    });

    describe("generate", () => {
      const mockGenerationInput = {
        language: "javascript",
      };

      const mockStatusResponse = {
        status_url: "https://example.com/api/ai/status/123",
        result_url: "https://example.com/api/ai/result/123",
      };

      const mockGenerationResponse = {
        language: "javascript",
        code: "const { PactV3 } = require('@pact-foundation/pact');",
      };

      beforeEach(async () => {
        vi.spyOn(client, "pollForCompletion" as any).mockResolvedValue(
          mockGenerationResponse,
        );
      });

      it("should successfully generate Pact tests", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          GenerationInputSchema.parse(mockGenerationInput),
          vi.fn(),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/generate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(mockGenerationInput),
          },
        );
        expect(result.language).toBe("javascript");
        expect(result.code).toBeDefined();
      });

      it("should handle generation with OpenAPI document and matcher", async () => {
        const inputWithOpenAPI = {
          ...mockGenerationInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: {
                    operationId: "getUsers",
                    responses: { "200": { description: "Success" } },
                  },
                },
              },
            },
            matcher: {
              path: "/users",
              methods: ["GET"] as const,
            },
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          await GenerationInputSchema.parseAsync(inputWithOpenAPI),
          vi.fn(),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/generate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(
              await GenerationInputSchema.parseAsync(inputWithOpenAPI),
            ),
          },
        );
        expect(result).toEqual(mockGenerationResponse);
      });

      it("should handle OpenAPI document without matcher by prompting user", async () => {
        const mockGetInput = vi.fn().mockResolvedValue({});
        vi.mock("../../../pactflow/client/prompt-utils", () => ({
          getOADMatcherRecommendations: vi.fn().mockResolvedValue({
            recommendations: [{ path: "/users", methods: ["GET"] }],
          }),
          getUserMatcherSelection: vi.fn().mockResolvedValue({
            path: "/users",
            methods: ["GET"],
          }),
        }));

        const inputWithoutMatcher = {
          ...mockGenerationInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: {
                    operationId: "getUsers",
                    responses: { "200": { description: "Success" } },
                  },
                },
              },
            },
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          await GenerationInputSchema.parseAsync(inputWithoutMatcher),
          mockGetInput,
        );

        expect(result).toEqual(mockGenerationResponse);
      });

      it("should handle generation with code files", async () => {
        const inputWithCode = {
          language: "typescript",
          code: [
            {
              filename: "user-service.ts",
              body: "export class UserService { async getUsers() { return fetch('/api/users'); } }",
              language: "typescript",
            },
            {
              filename: "user.model.ts",
              body: "export interface User { id: string; name: string; }",
              language: "typescript",
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          await GenerationInputSchema.parseAsync(inputWithCode),
          vi.fn(),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/generate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(
              await GenerationInputSchema.parseAsync(inputWithCode),
            ),
          },
        );
        expect(result).toEqual(mockGenerationResponse);
      });

      it("should handle generation with additional instructions", async () => {
        const inputWithInstructions = {
          ...mockGenerationInput,
          additionalInstructions:
            "Focus on error scenarios and include authentication headers",
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          await GenerationInputSchema.parseAsync(inputWithInstructions),
          vi.fn(),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/generate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(
              await GenerationInputSchema.parseAsync(inputWithInstructions),
            ),
          },
        );
        expect(result).toEqual(mockGenerationResponse);
      });

      it("should handle generation with test template", async () => {
        const inputWithTemplate = {
          ...mockGenerationInput,
          testTemplate: {
            filename: "template.test.js",
            body: "// Template for Pact tests\nconst { Pact } = require('@pact-foundation/pact');",
            language: "javascript",
          },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        const result = await client.generate(
          await GenerationInputSchema.parseAsync(inputWithTemplate),
          vi.fn(),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/ai/generate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(
              await GenerationInputSchema.parseAsync(inputWithTemplate),
            ),
          },
        );
        expect(result).toEqual(mockGenerationResponse);
      });

      it("should handle HTTP 400 error during generation request", async () => {
        const errorText = "Invalid generation parameters";
        fetchMock.mockResponseOnce(errorText, {
          status: 400,
          statusText: "Bad Request",
        });

        await expect(
          client.generate(
            await GenerationInputSchema.parseAsync(mockGenerationInput),
            vi.fn(),
          ),
        ).rejects.toThrow(
          "HTTP callback submission to /generate Failed - status: 400 Bad Request - Invalid generation parameters",
        );
      });

      it("should handle HTTP 401 error during generation request", async () => {
        const errorText = "Unauthorized access";
        fetchMock.mockResponseOnce(errorText, {
          status: 401,
          statusText: "Unauthorized",
        });

        await expect(
          client.generate(
            await GenerationInputSchema.parseAsync(mockGenerationInput),
            vi.fn(),
          ),
        ).rejects.toThrow(
          "HTTP callback submission to /generate Failed - status: 401 Unauthorized - Unauthorized access",
        );
      });

      it("should handle network errors during generation request", async () => {
        fetchMock.mockRejectOnce(new Error("Network error"));

        await expect(
          client.generate(
            await GenerationInputSchema.parseAsync(mockGenerationInput),
            vi.fn(),
          ),
        ).rejects.toThrow("Network error");
      });

      it("should handle timeout during polling", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        vi.spyOn(client, "pollForCompletion" as any).mockRejectedValue(
          new Error("Generation timed out after 120 seconds"),
        );

        await expect(
          client.generate(
            await GenerationInputSchema.parseAsync(mockGenerationInput),
            vi.fn(),
          ),
        ).rejects.toThrow("Generation timed out after 120 seconds");
      });

      it("should handle generation failure during polling", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockStatusResponse));

        vi.spyOn(client, "pollForCompletion" as any).mockRejectedValue(
          new Error("Generation failed with status: 500"),
        );

        await expect(
          client.generate(
            await GenerationInputSchema.parseAsync(mockGenerationInput),
            vi.fn(),
          ),
        ).rejects.toThrow("Generation failed with status: 500");
      });
    });

    describe("getResult", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should return parsed JSON when response is OK", async () => {
        const mockData = { foo: "bar", value: 42 };
        fetchMock.mockResponseOnce(JSON.stringify(mockData), { status: 200 });
        const result = await client.getResult<typeof mockData>(
          "https://example.com/api/result/1",
        );
        expect(result).toEqual(mockData);
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/result/1",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should throw error if response is not OK", async () => {
        fetchMock.mockResponseOnce("Not found", { status: 404 });
        await expect(
          client.getResult("https://example.com/api/result/404"),
        ).rejects.toThrow("HTTP error! status: 404");
      });
    });

    describe("getStatus", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should return isComplete true for status 200", async () => {
        fetchMock.mockResponseOnce("", { status: 200 });
        const result = await client.getStatus("https://example.com/status/ok");
        expect(result).toEqual({ status: 200, isComplete: true });
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/status/ok",
          {
            method: "HEAD",
            headers: client.requestHeaders,
          },
        );
      });

      it("should return isComplete false for status 202", async () => {
        fetchMock.mockResponseOnce("", { status: 202 });
        const result = await client.getStatus(
          "https://example.com/status/pending",
        );
        expect(result).toEqual({ status: 202, isComplete: false });
      });

      it("should return correct status for other codes", async () => {
        fetchMock.mockResponseOnce("", { status: 500 });
        const result = await client.getStatus(
          "https://example.com/status/error",
        );
        expect(result).toEqual({ status: 500, isComplete: false });
      });
    });

    describe("pollForCompletion", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should resolve when status becomes 200", async () => {
        const status_response = {
          status_url: "https://example.com/status/123",
          result_url: "https://example.com/result/123",
        };

        fetchMock.mockResponses(
          ["", { status: 202 }],
          ["", { status: 200 }],
          [JSON.stringify({ result: "done" }), { status: 200 }],
        );

        const spyGetStatus = vi.spyOn(client, "getStatus");
        spyGetStatus.mockImplementationOnce(async () => ({
          status: 202,
          isComplete: false,
        }));
        spyGetStatus.mockImplementationOnce(async () => ({
          status: 200,
          isComplete: true,
        }));

        const spyGetResult = vi.spyOn(client, "getResult");
        spyGetResult.mockResolvedValue({ result: "done" });
        const result = await (client as any).pollForCompletion(
          status_response as any,
          "TestOp",
        );
        expect(result).toEqual({ result: "done" });
        expect(spyGetStatus).toHaveBeenCalledTimes(2);
        expect(spyGetResult).toHaveBeenCalledWith(
          "https://example.com/result/123",
        );
      });

      it("should throw error if status is not 202 or 200", async () => {
        const status_response = {
          status_url: "https://example.com/status/123",
          result_url: "https://example.com/result/123",
        };
        const spyGetStatus = vi.spyOn(client, "getStatus");
        spyGetStatus.mockResolvedValue({ status: 500, isComplete: false });
        await expect(
          (client as any).pollForCompletion(status_response as any, "TestOp"),
        ).rejects.toThrow("TestOp failed with status: 500");
      });
    });

    describe("getProviderStates", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should return provider states when response is OK", async () => {
        const mockProviderStates = {
          states: [
            { name: "User exists", params: { id: "123" } },
            { name: "No users" },
          ],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockProviderStates), {
          status: 200,
        });
        const result = await client.getProviderStates({
          provider: "UserService",
        });
        expect(result).toEqual(mockProviderStates);
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/UserService/provider-states",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should encode provider name in URL", async () => {
        const mockProviderStates = { states: [] };
        fetchMock.mockResponseOnce(JSON.stringify(mockProviderStates), {
          status: 200,
        });
        await client.getProviderStates({ provider: "Service@Company/API" });
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/Service%40Company%2FAPI/provider-states",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should throw error if response is not OK", async () => {
        fetchMock.mockResponseOnce("Provider not found", { status: 404 });
        await expect(
          client.getProviderStates({ provider: "UnknownService" }),
        ).rejects.toThrow(
          "Get Provider States Failed - status: 404  - Provider not found",
        );
      });
    });

    describe("getMetrics", () => {
      const mockMetricsResponse = {
        interactions: {
          latestInteractionsCount: 42,
          latestMessagesCount: 8,
          latestInteractionsAndMessagesCount: 50,
        },
        pacticipants: {
          count: 15,
          withMainBranchSetCount: 12,
        },
        integrations: { count: 7 },
        pactPublications: { count: 42, last30DaysCount: 15 },
        pactVersions: { count: 38 },
        pactRevisionsPerConsumerVersion: {
          distribution: { "1": 20, "2": 10, "3": 5 },
        },
        verificationResults: {
          count: 1250,
          distinctCount: 1200,
          successCount: 1200,
          failureCount: 50,
        },
        verificationResultsPerPactVersion: {
          distribution: { "1": 800, "2": 300, "3": 150 },
        },
        pacticipantVersions: {
          count: 320,
          withUserCreatedBranchCount: 145,
          withBranchCount: 280,
          withBranchSetCount: 300,
        },
        webhooks: { count: 12 },
        tags: { count: 100, distinctCount: 50 },
        webhookExecutions: { count: 5000 },
        triggeredWebhooks: { count: 4500 },
        secrets: { count: 8 },
        environments: { count: 3 },
        providerContractPublications: { count: 25 },
        providerContractVersions: { count: 22 },
        providerContractSelfVerifications: { count: 200 },
        deployedVersions: { last30DaysCount: 320 },
        releasedVersions: { last30DaysCount: 145 },
      };

      it("should successfully retrieve account-wide metrics", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockMetricsResponse));

        const result = await client.getMetrics();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/metrics", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result.interactions.latestInteractionsCount).toBe(42);
        expect(result.pacticipants.count).toBe(15);
        expect(result.verificationResults.count).toBe(1250);
      });

      it("should handle HTTP 401 error when not authenticated", async () => {
        const errorText = "Unauthorized";
        fetchMock.mockResponseOnce(errorText, {
          status: 401,
          statusText: "Unauthorized",
        });

        await expect(client.getMetrics()).rejects.toThrow(
          "Metrics Request Failed - status: 401 Unauthorized - Unauthorized",
        );
      });

      it("should handle HTTP 500 error gracefully", async () => {
        const errorText = "Internal server error";
        fetchMock.mockResponseOnce(errorText, {
          status: 500,
          statusText: "Internal Server Error",
        });

        await expect(client.getMetrics()).rejects.toThrow(
          "Metrics Request Failed - status: 500 Internal Server Error",
        );
      });

      it("should handle network errors", async () => {
        fetchMock.mockRejectOnce(new Error("Network timeout"));

        await expect(client.getMetrics()).rejects.toThrow("Network timeout");
      });
    });

    describe("getTeamMetrics", () => {
      const mockTeamMetricsResponse = {
        teams: [
          {
            name: "Platform Team",
            metrics: {
              users: {
                activeRegularCount: 8,
                activeSystemCount: 2,
              },
              interactions: {
                latestInteractionsCount: 12,
                latestMessagesCount: 3,
              },
              pacticipants: { count: 10 },
              integrations: { count: 5 },
              pactPublications: { count: 150, last30DaysCount: 45 },
              pactVersions: { count: 140 },
              verificationResults: {
                count: 450,
                successCount: 430,
                failureCount: 20,
              },
              webhooks: { count: 8 },
              webhookExecutions: { count: 1500 },
              triggeredWebhooks: { count: 1400 },
              secrets: { count: 3 },
              environments: { count: 3 },
              providerContractPublications: { count: 10 },
              providerContractVersions: { count: 9 },
              providerContractSelfVerifications: { count: 85 },
              deployedVersions: { last30DaysCount: 85 },
              releasedVersions: { last30DaysCount: 32 },
            },
          },
          {
            name: "API Team",
            metrics: {
              users: {
                activeRegularCount: 6,
                activeSystemCount: 1,
              },
              interactions: {
                latestInteractionsCount: 6,
                latestMessagesCount: 2,
              },
              pacticipants: { count: 5 },
              integrations: { count: 2 },
              pactPublications: { count: 80, last30DaysCount: 20 },
              pactVersions: { count: 75 },
              verificationResults: {
                count: 200,
                successCount: 190,
                failureCount: 10,
              },
              webhooks: { count: 4 },
              webhookExecutions: { count: 800 },
              triggeredWebhooks: { count: 750 },
              secrets: { count: 2 },
              environments: { count: 2 },
              providerContractPublications: { count: 5 },
              providerContractVersions: { count: 4 },
              providerContractSelfVerifications: { count: 40 },
              deployedVersions: { last30DaysCount: 40 },
              releasedVersions: { last30DaysCount: 12 },
            },
          },
        ],
      };

      it("should successfully retrieve metrics for all teams", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockTeamMetricsResponse));

        const result = await client.getTeamMetrics();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/metrics/teams",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.teams).toBeDefined();
        expect(Array.isArray(result.teams)).toBe(true);
        expect(result.teams.length).toBe(2);
        expect(result.teams[0].name).toBe("Platform Team");
        expect(result.teams[0].metrics.users.activeRegularCount).toBe(8);
        expect(result.teams[0].metrics.integrations.count).toBe(5);
      });

      it("should handle HTTP 403 error when user lacks access to teams", async () => {
        const errorText = "Forbidden - You do not have access to these teams";
        fetchMock.mockResponseOnce(errorText, {
          status: 403,
          statusText: "Forbidden",
        });

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Team Metrics Request Failed - status: 403 Forbidden",
        );
      });

      it("should handle HTTP 500 error gracefully", async () => {
        const errorText = "Internal server error";
        fetchMock.mockResponseOnce(errorText, {
          status: 500,
          statusText: "Internal Server Error",
        });

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Team Metrics Request Failed - status: 500 Internal Server Error",
        );
      });

      it("should handle network errors", async () => {
        fetchMock.mockRejectOnce(new Error("Network timeout"));

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Network timeout",
        );
      });
    });

    describe("listPacticipants", () => {
      it("should retrieve pacticipants without params", async () => {
        const mockResponse = { pacticipants: [{ name: "ServiceA" }] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listPacticipants();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.pacticipants).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ pacticipants: [] }));

        await client.listPacticipants({ pageNumber: 2, pageSize: 10 });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants?page=2&size=10",
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        });
        await expect(client.listPacticipants()).rejects.toThrow(
          "List Pacticipants Failed - status: 401 Unauthorized - Unauthorized",
        );
      });
    });

    describe("getPacticipant", () => {
      it("should retrieve a pacticipant by name", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipant({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("ServiceA");
      });

      it("should URL-encode the pacticipant name", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ name: "Service A/B" }));

        await client.getPacticipant({ pacticipantName: "Service A/B" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/Service%20A%2FB",
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("should handle 404 when pacticipant not found", async () => {
        fetchMock.mockResponseOnce("Not found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getPacticipant({ pacticipantName: "Unknown" }),
        ).rejects.toThrow(
          "Get Pacticipant Failed - status: 404 Not Found - Not found",
        );
      });
    });

    describe("listBranches", () => {
      it("should retrieve branches for a pacticipant", async () => {
        const mockResponse = { branches: [{ name: "main" }] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listBranches({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.branches).toHaveLength(1);
      });

      it("should append filter and pagination query params", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ branches: [] }));

        await client.listBranches({
          pacticipantName: "ServiceA",
          q: "feat",
          pageNumber: 1,
          pageSize: 20,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches?q=feat&pageNumber=1&pageSize=20",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("listVersions", () => {
      it("should retrieve versions for a pacticipant", async () => {
        const mockResponse = { versions: [{ number: "1.0.0" }] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listVersions({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.versions).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ versions: [] }));

        await client.listVersions({
          pacticipantName: "ServiceA",
          pageNumber: 2,
          pageSize: 50,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions?page=2&size=50",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getVersion", () => {
      it("should retrieve a specific version", async () => {
        const mockResponse = { number: "1.0.0", branch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.number).toBe("1.0.0");
      });

      it("should URL-encode version number with special characters", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0-beta+build.1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0-beta%2Bbuild.1",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getLatestVersion", () => {
      it("should retrieve the latest version without tag", async () => {
        const mockResponse = { number: "2.0.0" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getLatestVersion({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/latest-version",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.number).toBe("2.0.0");
      });

      it("should retrieve the latest version filtered by tag", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ number: "1.5.0" }));

        await client.getLatestVersion({
          pacticipantName: "ServiceA",
          tag: "prod",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/latest-version/prod",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("listEnvironments", () => {
      it("should retrieve all environments", async () => {
        const mockResponse = {
          environments: [{ name: "production", uuid: "env-1" }],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listEnvironments();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.environments).toHaveLength(1);
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Forbidden", {
          status: 403,
          statusText: "Forbidden",
        });
        await expect(client.listEnvironments()).rejects.toThrow(
          "List Environments Failed - status: 403 Forbidden - Forbidden",
        );
      });
    });

    describe("getEnvironment", () => {
      it("should retrieve an environment by UUID", async () => {
        const mockResponse = {
          name: "production",
          uuid: "env-uuid-1",
          production: true,
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getEnvironment({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("production");
        expect(result.production).toBe(true);
      });
    });

    describe("recordDeployment", () => {
      const baseInput = {
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid-1",
      };

      it("should record a deployment without applicationInstance", async () => {
        const mockResponse = { pacticipant: "ServiceA" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.recordDeployment(baseInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });

      it("should include applicationInstance in the body when provided", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.recordDeployment({
          ...baseInput,
          applicationInstance: "blue",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({ applicationInstance: "blue" }),
          },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Not found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(client.recordDeployment(baseInput)).rejects.toThrow(
          "Record Deployment Failed - status: 404 Not Found - Not found",
        );
      });
    });

    describe("getCurrentlyDeployed", () => {
      it("should retrieve currently deployed versions for an environment", async () => {
        const mockResponse = {
          deployedVersions: [
            { pacticipant: { name: "ServiceA" }, version: { number: "1.0.0" } },
          ],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getCurrentlyDeployed({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1/deployed-versions/currently-deployed",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.deployedVersions).toHaveLength(1);
      });
    });

    describe("recordRelease", () => {
      it("should record a release", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ pacticipant: "ServiceA" }));

        await client.recordRelease({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("getCurrentlySupported", () => {
      it("should retrieve currently supported versions for an environment", async () => {
        const mockResponse = { releasedVersions: [] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getCurrentlySupported({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1/released-versions/currently-supported",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.releasedVersions).toBeDefined();
      });
    });

    describe("publishContracts", () => {
      const mockInput = {
        pacticipantName: "ConsumerApp",
        pacticipantVersionNumber: "1.0.0",
        contracts: [
          {
            consumerName: "ConsumerApp",
            providerName: "ProviderAPI",
            content: "eyJjb25zdW1lciI6IHsibmFtZSI6ICJDb25zdW1lckFwcCJ9fQ==",
            contentType: "application/json" as const,
            specification: "pact" as const,
          },
        ],
        branch: "main",
      };

      it("should publish consumer contracts", async () => {
        const mockResponse = { pacticipantVersionNumber: "1.0.0" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.publishContracts(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/contracts/publish",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(mockInput),
          },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Unprocessable Entity", {
          status: 422,
          statusText: "Unprocessable Entity",
        });
        await expect(client.publishContracts(mockInput)).rejects.toThrow(
          "Publish Consumer Contracts Failed - status: 422 Unprocessable Entity",
        );
      });
    });

    describe("publishProviderContract", () => {
      const mockInput = {
        providerName: "ProviderAPI",
        pacticipantVersionNumber: "2.0.0",
        contract: {
          content: "eyJvcGVuYXBpIjogIjMuMC4wIn0=",
          contentType: "application/json" as const,
          specification: "oas" as const,
          selfVerificationResults: {
            success: true,
            verifier: "dredd",
          },
        },
        branch: "main",
      };

      it("should publish a provider contract", async () => {
        const mockResponse = { success: true };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const { providerName, ...bodyWithoutProvider } = mockInput;
        await client.publishProviderContract(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/provider-contracts/provider/ProviderAPI/publish",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(bodyWithoutProvider),
          },
        );
      });

      it("should URL-encode the provider name", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.publishProviderContract({
          ...mockInput,
          providerName: "Provider API/v2",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/provider-contracts/provider/Provider%20API%2Fv2/publish",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    describe("getPactsForVerification", () => {
      it("should retrieve pacts for verification", async () => {
        const mockInput = {
          providerName: "ProviderAPI",
          consumerVersionSelectors: [{ mainBranch: true }],
          includePendingStatus: true,
        };
        const mockResponse = { pacts: [] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const { providerName, ...bodyWithoutProvider } = mockInput;
        await client.getPactsForVerification(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/ProviderAPI/for-verification",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(bodyWithoutProvider),
          },
        );
      });
    });

    describe("BDCT provider-version methods", () => {
      const bdctInput = {
        providerName: "ProviderAPI",
        providerVersionNumber: "2.0.0",
      };
      const bdctBase =
        "https://example.com/contracts/bi-directional/provider/ProviderAPI/version/2.0.0";

      it("getBiDirectionalProviderContract should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContract(bdctInput);
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContract should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContract(bdctInput);
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalCrossContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalCrossContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/cross-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("BDCT consumer-version methods", () => {
      const bdctConsumerInput = {
        providerName: "ProviderAPI",
        providerVersionNumber: "2.0.0",
        consumerName: "ConsumerApp",
        consumerVersionNumber: "1.0.0",
      };
      const bdctBase =
        "https://example.com/contracts/bi-directional/provider/ProviderAPI/version/2.0.0/consumer/ConsumerApp/version/1.0.0";

      it("getBiDirectionalConsumerContractByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalCrossContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalCrossContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/cross-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("listIntegrations", () => {
      it("should retrieve all integrations", async () => {
        const mockResponse = {
          integrations: [
            {
              consumer: { name: "ConsumerApp" },
              provider: { name: "ProviderAPI" },
            },
          ],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listIntegrations();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/integrations",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.integrations).toHaveLength(1);
      });
    });

    describe("getPacticipantNetwork", () => {
      it("should retrieve the integration network for a pacticipant", async () => {
        const mockResponse = {
          pacticipants: [{ name: "ServiceA" }, { name: "ServiceB" }],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipantNetwork({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipant/ServiceA/network",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.pacticipants).toHaveLength(2);
      });
    });

    describe("listLabels", () => {
      it("should retrieve all labels without params", async () => {
        const mockResponse = { labels: [{ name: "team-a" }] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listLabels();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/labels", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result.labels).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ labels: [] }));

        await client.listLabels({ pageNumber: 1, pageSize: 10 });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/labels?page=1&size=10",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getPacticipantLabel", () => {
      it("should retrieve a specific label for a pacticipant", async () => {
        const mockResponse = { name: "team-a" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipantLabel({
          pacticipantName: "ServiceA",
          labelName: "team-a",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/labels/team-a",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("team-a");
      });

      it("should handle 404 when label not applied", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getPacticipantLabel({
            pacticipantName: "ServiceA",
            labelName: "missing-label",
          }),
        ).rejects.toThrow(
          "Get Pacticipant Label Failed - status: 404 Not Found - Not Found",
        );
      });
    });

    describe("listPacticipantsByLabel", () => {
      it("should retrieve pacticipants with a given label", async () => {
        const mockResponse = {
          pacticipants: [{ name: "ServiceA" }, { name: "ServiceB" }],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listPacticipantsByLabel({
          labelName: "team-a",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/label/team-a",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.pacticipants).toHaveLength(2);
      });
    });

    describe("updatePacticipant", () => {
      it("should send a PUT request to update pacticipant metadata", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updatePacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "main",
          displayName: "Service A",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({
              mainBranch: "main",
              displayName: "Service A",
            }),
          },
        );
      });
    });

    describe("patchPacticipant", () => {
      it("should send a PATCH request to partially update pacticipant metadata", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "develop" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.patchPacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "develop",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          {
            method: "PATCH",
            headers: client.requestHeaders,
            body: JSON.stringify({ mainBranch: "develop" }),
          },
        );
      });
    });

    describe("updateVersion", () => {
      it("should send a PUT request to update a version's build URL", async () => {
        const mockResponse = { number: "1.0.0", buildUrl: "https://ci.com/1" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updateVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          buildUrl: "https://ci.com/1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ buildUrl: "https://ci.com/1" }),
          },
        );
      });
    });

    describe("getBranchVersions", () => {
      it("should retrieve all versions for a branch", async () => {
        const mockResponse = { versions: [{ number: "1.0.0" }] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/main/versions",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.versions).toHaveLength(1);
      });

      it("should append pagination params", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ versions: [] }));

        await client.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
          pageNumber: 2,
          pageSize: 25,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/main/versions?page=2&size=25",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getDeployedVersions", () => {
      it("should retrieve deployment records for a specific version in an environment", async () => {
        const mockResponse = {
          deployedVersions: [{ currentlyDeployed: true }],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getDeployedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.deployedVersions[0].currentlyDeployed).toBe(true);
      });
    });

    describe("getReleasedVersions", () => {
      it("should retrieve release records for a specific version in an environment", async () => {
        const mockResponse = {
          releasedVersions: [{ currentlySupported: true }],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getReleasedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.releasedVersions[0].currentlySupported).toBe(true);
      });
    });

    describe("registerPrompts", () => {
      const mockRegisterPrompt = vi.fn();

      beforeEach(async () => {
        mockRegisterPrompt.mockClear();
      });

      it("should register all prompts from PROMPTS array", async () => {
        client.registerPrompts(mockRegisterPrompt);
        expect(mockRegisterPrompt).toHaveBeenCalledTimes(1);
      });
    });
  });
});
