import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clientRegistry } from "../../../common/client-registry.js";
import type { SmartBearMcpServer } from "../../../common/server.js";
import type { Client } from "../../../common/types.js";

describe("ClientRegistry", () => {
  let mockServer: SmartBearMcpServer;
  let mockClient: Client;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Clear the registry before each test
    clientRegistry.clear();

    // Mock server
    mockServer = {
      addClient: vi.fn(),
    } as any;

    // Spy on console.warn to verify warning messages
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Clear environment variables
    delete process.env.MCP_ALLOWED_ENDPOINTS;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /**
   * Helper to create a mock client with all required Client properties
   */
  function createMockClient(
    name: string,
    configSchema: z.ZodObject<any>,
  ): Client {
    return {
      name,
      prefix: name,
      config: configSchema,
      configure: vi.fn().mockResolvedValue(true),
      registerTools: vi.fn(),
    };
  }

  describe("validateAllowedEndpoint", () => {
    describe("with no MCP_ALLOWED_ENDPOINTS set", () => {
      it("should allow any URL when MCP_ALLOWED_ENDPOINTS is not set", async () => {
        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://example.com/api",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalledWith(mockServer, {
          api_url: "https://example.com/api",
        });
      });
    });

    describe("with exact URL matching", () => {
      it("should allow URL that matches exactly", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            base_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.bugsnag.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalledWith(mockServer, {
          base_url: "https://api.bugsnag.com",
        });
      });

      it("should allow URL that matches one of multiple exact endpoints", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "https://api.bugsnag.com,https://api.swaggerhub.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.swaggerhub.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should handle whitespace in MCP_ALLOWED_ENDPOINTS", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "  https://api.bugsnag.com  ,  https://api.swaggerhub.com  ";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.bugsnag.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should throw error when URL does not match any allowed endpoint", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            base_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.configure(mockServer, () => "https://evil.com"),
        ).rejects.toThrow("URL https://evil.com is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });
    });

    describe("with regex patterns", () => {
      it("should allow URL matching simple regex pattern", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/.*\\.bugsnag\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.bugsnag.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should allow URL matching regex with subdomain wildcard", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/.*\\.example\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.example.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should allow URL matching regex with alternatives", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/api\\.(bugsnag|swaggerhub|pactflow)\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            base_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.pactflow.com",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should allow URL matching regex with path pattern", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/api\\.example\\.com\\/v[12]\\/.*$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          () => "https://api.example.com/v2/users",
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should reject URL that doesn't match due to unescaped dots", async () => {
        // Pattern without proper escaping would match any character instead of literal dot
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/api\\.example\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        // This should NOT match because dots are properly escaped
        await expect(
          clientRegistry.configure(mockServer, () => "https://apiaexampleacom"),
        ).rejects.toThrow("URL https://apiaexampleacom is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });

      it("should throw error when URL does not match regex pattern", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/.*\\.bugsnag\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.configure(mockServer, () => "https://evil.com"),
        ).rejects.toThrow("URL https://evil.com is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });

      it("should handle invalid regex pattern gracefully", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "/[invalid(/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.configure(mockServer, () => "https://api.bugsnag.com"),
        ).rejects.toThrow("URL https://api.bugsnag.com is not allowed");

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "Invalid regex pattern in MCP_ALLOWED_ENDPOINTS",
          ),
        );
        expect(mockClient.configure).not.toHaveBeenCalled();
      });
    });

    describe("with mixed exact and regex patterns", () => {
      it("should allow URL matching either exact or regex", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "https://exact-match.com,/^https:\\/\\/.*\\.example\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        // Test exact match
        let result = await clientRegistry.configure(
          mockServer,
          () => "https://exact-match.com",
        );
        expect(result).toBe(1);

        // Reset for next test
        vi.mocked(mockClient.configure).mockClear();
        vi.mocked(mockServer.addClient).mockClear();

        // Test regex match
        result = await clientRegistry.configure(
          mockServer,
          () => "https://api.example.com",
        );
        expect(result).toBe(1);
      });

      it("should throw error when URL matches neither exact nor regex", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "https://exact-match.com,/^https:\\/\\/.*\\.example\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.string().url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.configure(mockServer, () => "https://evil.com"),
        ).rejects.toThrow("URL https://evil.com is not allowed");
      });
    });

    describe("with optional URL fields", () => {
      it("should allow optional URL fields that are not provided", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url().optional(),
            api_key: z.string(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          (client, key) => (key === "api_key" ? "test-key" : null),
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalledWith(mockServer, {
          api_key: "test-key",
        });
      });

      it("should validate optional URL fields when provided", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.string().url().optional(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.configure(mockServer, () => "https://evil.com"),
        ).rejects.toThrow("URL https://evil.com is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });
    });

    describe("with non-URL fields", () => {
      it("should not validate non-URL string fields", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_key: z.string(),
            username: z.string(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.configure(
          mockServer,
          (client, key) => (key === "api_key" ? "test-key" : "test-user"),
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalledWith(mockServer, {
          api_key: "test-key",
          username: "test-user",
        });
      });
    });

    describe("with multiple clients", () => {
      it("should validate URLs independently and skip invalid clients", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        const validClient = createMockClient(
          "valid-client",
          z.object({
            api_url: z.string().url(),
          }),
        );

        const invalidClient = createMockClient(
          "invalid-client",
          z.object({
            base_url: z.string().url(),
          }),
        );

        clientRegistry.register(validClient);
        clientRegistry.register(invalidClient);

        // The configure method will process both clients
        // Valid client should be configured, invalid one should be skipped
        await expect(
          clientRegistry.configure(mockServer, (client) =>
            client.name === "valid-client"
              ? "https://api.bugsnag.com"
              : "https://evil.com",
          ),
        ).rejects.toThrow("URL https://evil.com is not allowed");

        // Valid client should be configured before the error
        expect(validClient.configure).toHaveBeenCalledWith(mockServer, {
          api_url: "https://api.bugsnag.com",
        });
        // Invalid client should not be configured
        expect(invalidClient.configure).not.toHaveBeenCalled();
      });
    });
  });
});
