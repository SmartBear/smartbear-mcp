import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { PactflowClient } from "../../../pactflow/client";
import { GenerationInputSchema } from "../../../pactflow/client/ai";
import * as toolsModule from "../../../pactflow/client/tools";

const fetchMock = createFetchMock(vi);

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("sets correct headers when client is pactflow", () => {
      client = new PactflowClient(
        "my-token",
        "https://example.com",
        "pactflow",
        vi.fn() as any,
      );

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining("Bearer my-token"),
          "Content-Type": expect.stringContaining("application/json"),
        }),
      );
    });

    it("sets correct headers when client is pact_broker", () => {
      client = new PactflowClient(
        { username: "user", password: "pass" },
        "https://example.com",
        "pact_broker",
        vi.fn() as any,
      );

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

    it("registers only tools matching the given clientType", () => {
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

      const client = new PactflowClient(
        "token",
        "https://example.com",
        "pactflow",
        vi.fn() as any,
      );
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

      const client = new PactflowClient(
        "token",
        "https://example.com",
        "pactflow",
        vi.fn() as any,
      );
      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe("API Methods", () => {
    beforeEach(() => {
      client = new PactflowClient(
        "test-token",
        "https://example.com",
        "pactflow",
        vi.fn() as any,
      );
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

      beforeEach(() => {
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
          "HTTP error! status: 400 - Invalid review parameters",
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

      beforeEach(() => {
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
          "HTTP error! status: 400 - Invalid generation parameters",
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
        ).rejects.toThrow("HTTP error! status: 401 - Unauthorized access");
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
      beforeEach(() => {
        client = new PactflowClient(
          "test-token",
          "https://example.com",
          "pactflow",
          vi.fn() as any,
        );
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
      beforeEach(() => {
        client = new PactflowClient(
          "test-token",
          "https://example.com",
          "pactflow",
          vi.fn() as any,
        );
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
      beforeEach(() => {
        client = new PactflowClient(
          "test-token",
          "https://example.com",
          "pactflow",
          vi.fn() as any,
        );
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
        const result = await client["pollForCompletion"](
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
          client["pollForCompletion"](status_response as any, "TestOp"),
        ).rejects.toThrow("TestOp failed with status: 500");
      });
    });

    describe("getProviderStates", () => {
      beforeEach(() => {
        client = new PactflowClient(
          "test-token",
          "https://example.com",
          "pactflow",
          vi.fn() as any,
        );
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
        ).rejects.toThrow("HTTP error! status: 404 - Provider not found");
      });
    });

    describe("registerPrompts", () => {
      const mockRegisterPrompt = vi.fn();

      beforeEach(() => {
        mockRegisterPrompt.mockClear();
      });

      it("should register all prompts from PROMPTS array", () => {
        client.registerPrompts(mockRegisterPrompt);
        expect(mockRegisterPrompt).toHaveBeenCalledTimes(1);
      });
    });
  });
});
