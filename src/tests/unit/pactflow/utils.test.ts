import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveOpenAPISpec,
  addOpenAPISpecToSchema,
  getRemoteSpecContents,
} from "../../../pactflow/client/utils.js";
import { OpenApiWithMatcher } from "../../../pactflow/client/ai.js";
import createFetchMock from "vitest-fetch-mock";
import {
  getOADMatcherRecommendations,
  getUserMatcherSelection,
} from "../../../../dist/pactflow/client/prompt-utils.js";

describe("Utility tests", () => {
  const fetchMocker = createFetchMock(vi);

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMocker.enableMocks();
  });

  describe("addOpenAPISpecToSchema tests", () => {
    it("Sets the correct OpenAPI spec if remoteDocument is provided", async () => {
      const input: OpenApiWithMatcher = {
        matcher: {
          path: "/users",
          method: "GET",
        },
        remoteDocument: {
          url: "https://api.example.com/openapi.json",
          authToken: "Bearer token",
        },
      };

      const mockResolvedSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {},
        $$normalized: true,
      };
      fetchMocker.mockOnce(JSON.stringify(mockResolvedSpec));
      const result = await addOpenAPISpecToSchema(input);
      expect(result).toEqual({ ...input, document: mockResolvedSpec });
    });

    it("Sets returns openapi document if remoteDocument is not provided", async () => {
      const input: OpenApiWithMatcher = {
        matcher: {
          path: "/users",
          method: "GET",
        },
        document: {
          openapi: "3.0.0",
          info: {
            title: "Test API",
            version: "1.0.0",
          },
          paths: {},
          $$normalized: true,
        },
      };

      const result = await addOpenAPISpecToSchema(input);
      expect(result).toEqual(input);
    });
  });

  describe("getRemoteSpecContents tests", () => {
    it("fetches the remote OpenAPI spec", async () => {
      const url = "https://api.example.com/openapi.json";
      const authToken = "token";
      const authScheme = "Bearer";

      const mockResponse = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {},
        $$normalized: true,
      };
      fetchMocker.mockOnce(JSON.stringify(mockResponse));

      const result = await getRemoteSpecContents({
        url,
        authToken,
        authScheme,
      });
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/openapi.json",
        {
          headers: {
            Authorization: "Bearer token",
          },
          method: "GET",
        }
      );
    });
  });

  describe("resolveOpenAPISpec tests", () => {
    it("returns the correct OpenAPI spec", async () => {
      const openApiSpec = {
        matcher: {
          path: "/users",
          method: "GET",
        },
        document: {
          openapi: "3.0.0",
          info: {
            title: "Test API",
            version: "1.0.0",
          },
          paths: {},
          $$normalized: true,
        },
      };

      fetchMocker.mockOnce(JSON.stringify(openApiSpec));
      const result = await resolveOpenAPISpec({
        url: "https://api.example.com/openapi.json",
        authToken: "Bearer token",
      });
      expect(result).toEqual(openApiSpec);
    });
  });

  describe("getOADMatcherRecommendations tests", () => {
    it("returns matcher recommendations", async () => {
      const openApiSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "A list of users",
                },
              },
            },
          },
        },
        $$normalized: true,
      };

      const mockServer = {
        createMessage: vi.fn().mockResolvedValue({
          action: "accept",
          content: {
            text: `
            Generated recommendations are:-
            \`\`\`json
            [
              {
                "path": "/users",
                "methods": ["GET"],
                "statusCodes": [200, "2XX"],
                "operationId": "get*"
              },
              {
                "path": "/users/*",
                "methods": ["GET"],
                "statusCodes": ["2XX"],
                "operationId": "*User*"
              },
              {
                "path": "/users",
                "methods": ["GET"],
                "statusCodes": [200],
                "operationId": "getAllUsers"
              },
              {
                "path": "/users/**",
                "methods": ["GET"],
                "statusCodes": ["2XX", 404],
                "operationId": "get*"
              }
            ]
            \`\`\`
            `.trim(),
          },
        }),
      };

      const result = await getOADMatcherRecommendations(
        openApiSpec,
        mockServer as any
      );
      expect(result).toEqual([
        {
          path: "/users",
          methods: ["GET"],
          statusCodes: [200, "2XX"],
          operationId: "get*",
        },
        {
          path: "/users/*",
          methods: ["GET"],
          statusCodes: ["2XX"],
          operationId: "*User*",
        },
        {
          path: "/users",
          methods: ["GET"],
          statusCodes: [200],
          operationId: "getAllUsers",
        },
        {
          path: "/users/**",
          methods: ["GET"],
          statusCodes: ["2XX", 404],
          operationId: "get*",
        },
      ]);
    });
  });

  describe("getUserMatcherSelection tests", () => {
    it("returns user selected matcher", async () => {
      const recommendations = [
        {
          path: "/users",
          methods: ["GET" as const],
          statusCodes: [200],
          operationId: "getAllUsers",
        },
        {
          path: "/users/**",
          methods: ["GET" as const],
          statusCodes: ["2XX", 404],
          operationId: "get*",
        },
      ];

      const mockGetInput = vi.fn().mockResolvedValue({
        action: "accept",
        content: {
          generatedMatchers: "Recommendation 1",
        },
      });
      const result = await getUserMatcherSelection(
        recommendations,
        mockGetInput
      );
      expect(result).toEqual(recommendations[0]);
    });
  });
});
