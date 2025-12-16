import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { OpenApiWithMatcher } from "../../../pactflow/client/ai";
import {
  addOpenAPISpecToSchema,
  getRemoteSpecContents,
  resolveOpenAPISpec,
} from "../../../pactflow/client/utils";

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
        },
      );
    });

    it("fetches the remote OpenAPI spec which is a yaml", async () => {
      const url = "https://api.example.com/openapi.yaml";
      const yamlSpec = `
      openapi: "3.0.0"
      info:
        title: "Test API"
        version: "1.0.0"
      paths: {}
      $$normalized: true
        `;
      const expectedSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {},
        $$normalized: true,
      };

      fetchMocker.mockOnce(yamlSpec);
      const result = await getRemoteSpecContents({ url });
      expect(result).toEqual(expectedSpec);
      expect(fetch).toHaveBeenCalledWith(url, {
        headers: {},
        method: "GET",
      });
    });

    it("Throws an error if remote spec cannot be parsed as JSON or YAML", async () => {
      const url = "https://api.example.com/openapi.invalid";
      const invalidContent = "not: valid: yaml: or: json";
      fetchMocker.mockOnce(invalidContent, {
        headers: { "Content-Type": "text/plain" },
      });

      await expect(getRemoteSpecContents({ url })).rejects.toThrowError();
    });

    it("Throws an error if remote spec file doesn't have a url", async () => {
      await expect(getRemoteSpecContents({})).rejects.toThrowError();
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

    it("Throws an error if passed invalid remoteOpenAPI document", async () => {
      await expect(
        resolveOpenAPISpec({ url: "www.example.com" }),
      ).rejects.toThrowError();
    });

    it("Throws an error if resolved spec contains errors", async () => {
      const mockResponse = {
        openapi: "3.0.0",
        info: {
          title: "Example API",
          version: "1.0.0",
        },
        paths: {
          "/user": {
            get: {
              summary: "Get user",
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "./schemas/user.json",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          parameters: {
            UserId: {
              $ref: "./schemas/parameters.json#/UserId",
            },
          },
        },
      };

      fetchMocker.mockOnce(JSON.stringify(mockResponse));
      await expect(
        resolveOpenAPISpec({
          url: "https://api.example.com/openapi.json",
          authToken: "Bearer token",
        }),
      ).rejects.toThrowError();
    });
  });
});
