import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { describe, expect, it, vi } from "vitest";
import {
  getOADMatcherRecommendations,
  getUserMatcherSelection,
} from "../../../pactflow/client/prompt-utils";

describe("Prompt Utils", () => {
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
      } satisfies Pick<Server, "createMessage">;

      const result = await getOADMatcherRecommendations(
        openApiSpec,
        mockServer,
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

    it("Should throw an error if json is not found", async () => {
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
            text: "No recommendations",
          },
        }),
      } satisfies Pick<Server, "createMessage">;

      await expect(
        getOADMatcherRecommendations(openApiSpec, mockServer),
      ).rejects.toThrowError();
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
        mockGetInput,
      );
      expect(result).toEqual(recommendations[0]);
    });

    it("Asks user to enter if user doesn't accept recommendations", async () => {
      const recommendations = [
        {
          path: "/users",
          methods: ["GET" as const],
          statusCodes: [200],
          operationId: "getAllUsers",
        },
      ];

      const mockGetInput = vi
        .fn()
        .mockResolvedValueOnce({
          action: "reject",
        })
        .mockResolvedValue({
          action: "accept",
          content: {
            enteredMatchers: "{}",
          },
        });
      const result = await getUserMatcherSelection(
        recommendations,
        mockGetInput,
      );
      expect(result).toEqual({});
    });

    it("returns empty object if user doesn't enter any value", async () => {
      const recommendations = [
        {
          path: "/users",
          methods: ["GET" as const],
          statusCodes: [200],
          operationId: "getAllUsers",
        },
      ];

      const mockGetInput = vi
        .fn()
        .mockResolvedValueOnce({
          action: "reject",
        })
        .mockResolvedValue({
          action: "reject",
        });
      const result = await getUserMatcherSelection(
        recommendations,
        mockGetInput,
      );
      expect(result).toEqual({});
    });
  });
});
