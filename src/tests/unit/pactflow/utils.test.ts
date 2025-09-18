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
});
