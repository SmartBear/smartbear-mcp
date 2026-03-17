import { describe, expect, it, vi } from "vitest";
import { isSamplingPolyfillResult } from "../../../common/pollyfills";
import type { SmartBearMcpServer } from "../../../common/server";
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
        isSamplingSupported: vi.fn().mockReturnValue(true),
        server: {
          createMessage: vi.fn().mockResolvedValue({
            model: "test-model",
            role: "assistant",
            content: {
              type: "text",
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
        },
      } as unknown as SmartBearMcpServer;

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
        isSamplingSupported: vi.fn().mockReturnValue(true),
        server: {
          createMessage: vi.fn().mockResolvedValue({
            model: "test-model",
            role: "assistant",
            content: {
              type: "text",
              text: "No recommendations",
            },
          }),
        },
      } as unknown as SmartBearMcpServer;

      await expect(
        getOADMatcherRecommendations(openApiSpec, mockServer),
      ).rejects.toThrowError();
    });

    it("returns polyfill result when sampling is not supported", async () => {
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
        isSamplingSupported: vi.fn().mockReturnValue(false),
        server: {
          createMessage: vi.fn(),
        },
      } as unknown as SmartBearMcpServer;

      const result = await getOADMatcherRecommendations(
        openApiSpec,
        mockServer,
      );

      expect(isSamplingPolyfillResult(result)).toBe(true);
      if (isSamplingPolyfillResult(result)) {
        expect(result.requiresPromptExecution).toBe(true);
        expect(result.prompt).toContain("Test API");
        expect(result.instructions).toContain(
          "Please execute the above prompt using your AI capabilities",
        );
      }
      expect(mockServer.server.createMessage).not.toHaveBeenCalled();
    });

    it("returns polyfill result when sampling fails", async () => {
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
        isSamplingSupported: vi.fn().mockReturnValue(true),
        server: {
          createMessage: vi
            .fn()
            .mockRejectedValue(new Error("Sampling failed")),
        },
      } as unknown as SmartBearMcpServer;

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await getOADMatcherRecommendations(
        openApiSpec,
        mockServer,
      );

      expect(isSamplingPolyfillResult(result)).toBe(true);
      if (isSamplingPolyfillResult(result)) {
        expect(result.requiresPromptExecution).toBe(true);
        expect(result.prompt).toContain("Test API");
      }
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
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

    it("returns polyfill result when recommendations is a polyfill", async () => {
      const polyfillRecommendations = {
        requiresPromptExecution: true as const,
        prompt: "Test prompt",
        instructions: "Execute this prompt",
      };

      const mockGetInput = vi.fn();

      const result = await getUserMatcherSelection(
        polyfillRecommendations,
        mockGetInput,
      );

      expect(isSamplingPolyfillResult(result)).toBe(true);
      expect(result).toEqual(polyfillRecommendations);
      expect(mockGetInput).not.toHaveBeenCalled();
    });
  });
});
