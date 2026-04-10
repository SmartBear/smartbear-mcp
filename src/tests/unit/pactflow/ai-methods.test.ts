import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { isSamplingPolyfillResult } from "../../../common/pollyfills";
import { PactflowClient } from "../../../pactflow/client";
import {
  GenerationInputSchema,
  type GenerationResponse,
} from "../../../pactflow/client/ai";
import * as promptUtils from "../../../pactflow/client/prompt-utils";

const fetchMock = createFetchMock(vi);

async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { server: vi.fn() } as any;
  await client.configure(mockServer, {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  });
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
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
              methods: ["GET" as const],
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

      it("should return SamplingPolyfillResult when getOADMatcherRecommendations returns polyfill", async () => {
        const polyfillResult = {
          requiresPromptExecution: true as const,
          prompt: "Recommend matchers",
          instructions: "Please execute the above prompt",
        };
        vi.mocked(
          promptUtils.getOADMatcherRecommendations,
        ).mockResolvedValueOnce(polyfillResult);

        const inputWithoutMatcher = {
          ...mockReviewInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: { responses: { "200": { description: "OK" } } },
                },
              },
            },
          },
        };

        const result = await client.review(inputWithoutMatcher, vi.fn());

        expect(isSamplingPolyfillResult(result)).toBe(true);
        expect(result).toEqual(polyfillResult);
      });

      it("should return SamplingPolyfillResult when getUserMatcherSelection returns polyfill", async () => {
        const recommendations = [
          {
            path: "/users",
            methods: ["GET" as const],
            statusCodes: [200],
            operationId: "getUsers",
          },
        ];
        vi.mocked(
          promptUtils.getOADMatcherRecommendations,
        ).mockResolvedValueOnce(recommendations);
        const polyfillResult = {
          requiresPromptExecution: true as const,
          prompt: "Select a matcher",
          instructions: "Please execute the above prompt",
        };
        vi.mocked(promptUtils.getUserMatcherSelection).mockResolvedValueOnce(
          polyfillResult,
        );

        const inputWithoutMatcher = {
          ...mockReviewInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: { responses: { "200": { description: "OK" } } },
                },
              },
            },
          },
        };

        const result = await client.review(inputWithoutMatcher, vi.fn());

        expect(isSamplingPolyfillResult(result)).toBe(true);
        expect(result).toEqual(polyfillResult);
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
        expect((result as GenerationResponse).language).toBe("javascript");
        expect((result as GenerationResponse).code).toBeDefined();
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
              methods: ["GET" as const],
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

      it("should return SamplingPolyfillResult when getOADMatcherRecommendations returns polyfill", async () => {
        const polyfillResult = {
          requiresPromptExecution: true as const,
          prompt: "Recommend matchers",
          instructions: "Please execute the above prompt",
        };
        vi.mocked(
          promptUtils.getOADMatcherRecommendations,
        ).mockResolvedValueOnce(polyfillResult);

        const inputWithoutMatcher = await GenerationInputSchema.parseAsync({
          ...mockGenerationInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: { responses: { "200": { description: "OK" } } },
                },
              },
            },
          },
        });

        const result = await client.generate(inputWithoutMatcher, vi.fn());

        expect(isSamplingPolyfillResult(result)).toBe(true);
        expect(result).toEqual(polyfillResult);
      });

      it("should return SamplingPolyfillResult when getUserMatcherSelection returns polyfill", async () => {
        const recommendations = [
          {
            path: "/users",
            methods: ["GET" as const],
            statusCodes: [200],
            operationId: "getUsers",
          },
        ];
        vi.mocked(
          promptUtils.getOADMatcherRecommendations,
        ).mockResolvedValueOnce(recommendations);
        const polyfillResult = {
          requiresPromptExecution: true as const,
          prompt: "Select a matcher",
          instructions: "Please execute the above prompt",
        };
        vi.mocked(promptUtils.getUserMatcherSelection).mockResolvedValueOnce(
          polyfillResult,
        );

        const inputWithoutMatcher = await GenerationInputSchema.parseAsync({
          ...mockGenerationInput,
          openapi: {
            document: {
              openapi: "3.0.0",
              paths: {
                "/users": {
                  get: { responses: { "200": { description: "OK" } } },
                },
              },
            },
          },
        });

        const result = await client.generate(inputWithoutMatcher, vi.fn());

        expect(isSamplingPolyfillResult(result)).toBe(true);
        expect(result).toEqual(polyfillResult);
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
  });
});
