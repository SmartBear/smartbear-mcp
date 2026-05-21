import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clientRegistry } from "../../../common/client-registry";
import type { SmartBearMcpServer } from "../../../common/server";
import type { Client } from "../../../common/types";

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

    // Spy on console.warn/error to verify warning messages
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
    isConfigured = true,
    hasAuth = true,
  ): Client {
    return {
      name,
      capabilityPrefix: name,
      configPrefix: name,
      config: configSchema,
      configure: vi.fn().mockResolvedValue(void 0),
      registerTools: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(isConfigured),
      hasAuth: vi.fn().mockReturnValue(hasAuth),
    };
  }

  describe("configure", () => {
    it("adds and counts multiple clients correctly", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({ keyA: z.string() }),
      );
      const clientB = createMockClient(
        "client-b",
        z.object({ keyB: z.string() }),
      );
      clientRegistry.register(clientA);
      clientRegistry.register(clientB);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          () => "https://example.com",
          true,
          true,
        ),
      ).resolves.toBe(2);
    });

    it("doesn't count non-configured clients", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({ keyA: z.string() }),
      );
      const clientB = createMockClient(
        "client-b",
        z.object({ keyB: z.string() }),
      );
      clientB.isConfigured = vi.fn().mockReturnValue(false);
      clientRegistry.register(clientA);
      clientRegistry.register(clientB);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          () => "https://example.com",
          true,
          true,
        ),
      ).resolves.toBe(1);
    });

    it("doesn't skip clients missing optional config", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({ keyA: z.string().optional(), keyB: z.number().default(42) }),
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => undefined,
          true,
          true,
        ),
      ).resolves.toBe(1);
      expect(clientA.configure).toHaveBeenCalled();
    });

    it("adds clients missing required config when configure is false", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({ keyA: z.string() }),
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => undefined,
          false,
          false,
        ),
      ).resolves.toBe(1);
      expect(clientA.configure).not.toHaveBeenCalled();
    });

    it("adds multiple clients missing required config when configure is true", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({ keyA: z.string() }),
      );
      const clientB = createMockClient(
        "client-b",
        z.object({ keyB: z.string() }),
      );
      const clientC = createMockClient(
        "client-c",
        z.object({ keyC: z.string() }),
      );
      clientRegistry.register(clientA);
      clientRegistry.register(clientB);
      clientRegistry.register(clientC);
      const getEnvMock = vi
        .fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("value");
      await expect(
        clientRegistry.registerAll(mockServer, getEnvMock, true, false),
      ).resolves.toBe(1);
      expect(clientA.configure).not.toHaveBeenCalled();
      expect(clientB.configure).not.toHaveBeenCalled();
      expect(clientC.configure).toHaveBeenCalled();
    });

    it("handles clients failing to configure", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({}),
        false, // isConfigured
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => undefined,
          true,
          false,
        ),
      ).resolves.toBe(0);
      expect(clientA.configure).toHaveBeenCalledOnce();
      expect(clientA.hasAuth).not.toHaveBeenCalled();
    });

    it("adds clients without authorization if authorization is not required", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({}),
        true, // isConfigured
        false, // hasAuth
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => undefined,
          true,
          false,
        ),
      ).resolves.toBe(1);
      expect(clientA.configure).toHaveBeenCalledOnce();
      expect(clientA.hasAuth).not.toHaveBeenCalled();
    });

    it("handles clients without authorization", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({}),
        true, // isConfigured
        false, // hasAuth
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => undefined,
          true,
          true,
        ),
      ).resolves.toBe(0);
      expect(clientA.configure).toHaveBeenCalledOnce();
      expect(clientA.hasAuth).toHaveBeenCalledOnce();
    });

    it("handles clients passed invalid configuration", async () => {
      const clientA = createMockClient(
        "client-a",
        z.object({
          fieldA: z.boolean(),
        }),
        true, // isConfigured
        false, // hasAuth
      );
      clientRegistry.register(clientA);
      await expect(
        clientRegistry.registerAll(
          mockServer,
          (_, __) => "not a boolean",
          true,
          true,
        ),
      ).resolves.toBe(0);
      expect(clientA.configure).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration for client client-a is invalid"),
      );
    });
  });

  describe("validateAllowedEndpoint", () => {
    describe("with no MCP_ALLOWED_ENDPOINTS set", () => {
      it("should allow any URL when MCP_ALLOWED_ENDPOINTS is not set", async () => {
        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://example.com/api",
          true,
          true,
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
            base_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.bugsnag.com",
          true,
          true,
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
            endpoint: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.swaggerhub.com",
          true,
          true,
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
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.bugsnag.com",
          true,
          true,
        );

        expect(result).toBe(1);
        expect(mockClient.configure).toHaveBeenCalled();
      });

      it("should throw error when URL does not match any allowed endpoint", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            base_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://evil.com",
            true,
            true,
          ),
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
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.bugsnag.com",
          true,
          true,
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
            endpoint: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.example.com",
          true,
          true,
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
            base_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.pactflow.com",
          true,
          true,
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
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.example.com/v2/users",
          true,
          true,
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
            endpoint: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        // This should NOT match because dots are properly escaped
        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://apiaexampleacom",
            true,
            true,
          ),
        ).rejects.toThrow("URL https://apiaexampleacom is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });

      it("should throw error when URL does not match regex pattern", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "/^https:\\/\\/.*\\.bugsnag\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://evil.com",
            true,
            true,
          ),
        ).rejects.toThrow("URL https://evil.com is not allowed");

        expect(mockClient.configure).not.toHaveBeenCalled();
      });

      it("should handle invalid regex pattern gracefully", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "/[invalid(/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://api.bugsnag.com",
            true,
            true,
          ),
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
            api_url: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        // Test exact match
        let result = await clientRegistry.registerAll(
          mockServer,
          () => "https://exact-match.com",
          true,
          true,
        );
        expect(result).toBe(1);

        // Reset for next test
        vi.mocked(mockClient.configure).mockClear();
        vi.mocked(mockServer.addClient).mockClear();

        // Test regex match
        result = await clientRegistry.registerAll(
          mockServer,
          () => "https://api.example.com",
          true,
          true,
        );
        expect(result).toBe(1);
      });

      it("should throw error when URL matches neither exact nor regex", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS =
          "https://exact-match.com,/^https:\\/\\/.*\\.example\\.com$/";

        mockClient = createMockClient(
          "test-client",
          z.object({
            endpoint: z.url(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://evil.com",
            true,
            true,
          ),
        ).rejects.toThrow("URL https://evil.com is not allowed");
      });
    });

    describe("with optional URL fields", () => {
      it("should allow optional URL fields that are not provided", async () => {
        process.env.MCP_ALLOWED_ENDPOINTS = "https://api.bugsnag.com";

        mockClient = createMockClient(
          "test-client",
          z.object({
            api_url: z.url().optional(),
            api_key: z.string(),
          }),
        );

        clientRegistry.register(mockClient);

        const result = await clientRegistry.registerAll(
          mockServer,
          (key, _client) => (key === "api_key" ? "test-key" : undefined),
          true,
          true,
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
            api_url: z.url().optional(),
          }),
        );

        clientRegistry.register(mockClient);

        await expect(
          clientRegistry.registerAll(
            mockServer,
            () => "https://evil.com",
            true,
            true,
          ),
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

        const result = await clientRegistry.registerAll(
          mockServer,
          (key, _client) => (key === "api_key" ? "test-key" : "test-user"),
          true,
          true,
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
            api_url: z.url(),
          }),
        );

        const invalidClient = createMockClient(
          "invalid-client",
          z.object({
            base_url: z.url(),
          }),
        );

        clientRegistry.register(validClient);
        clientRegistry.register(invalidClient);

        // The configure method will process both clients
        // Valid client should be configured, invalid one should be skipped
        await expect(
          clientRegistry.registerAll(
            mockServer,
            (_key, client) =>
              client?.name === "valid-client"
                ? "https://api.bugsnag.com"
                : "https://evil.com",
            true,
            true,
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

  describe("MCP_CLIENTS filtering", () => {
    /**
     * Since ClientRegistry reads MCP_CLIENTS in its constructor and only a
     * singleton is exported, we dynamically re-import the module with the
     * env var set to get a fresh instance for each test.
     */
    async function createRegistryWithMcpClients(value: string | undefined) {
      const prev = process.env.MCP_CLIENTS;
      if (value === undefined) {
        delete process.env.MCP_CLIENTS;
      } else {
        process.env.MCP_CLIENTS = value;
      }

      // Force a fresh module evaluation
      const modulePath = "../../../common/client-registry";
      vi.resetModules();
      const mod = await import(modulePath);

      // Restore original value
      if (prev === undefined) {
        delete process.env.MCP_CLIENTS;
      } else {
        process.env.MCP_CLIENTS = prev;
      }

      return mod.clientRegistry;
    }

    it("should return all clients when MCP_CLIENTS is not set", async () => {
      const registry = await createRegistryWithMcpClients(undefined);

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should return all clients when MCP_CLIENTS is empty", async () => {
      const registry = await createRegistryWithMcpClients("");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should return all clients when MCP_CLIENTS is whitespace only", async () => {
      const registry = await createRegistryWithMcpClients("   ");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should filter to only the specified client", async () => {
      const registry = await createRegistryWithMcpClients("Bugsnag");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      expect(registry.getAll()).toEqual([clientA]);
    });

    it("should filter to multiple specified clients", async () => {
      const registry = await createRegistryWithMcpClients("Bugsnag,Swagger");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      const clientC = createMockClient("Reflect", z.object({}));
      registry.register(clientA);
      registry.register(clientB);
      registry.register(clientC);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should match client names case-insensitively", async () => {
      const registry = await createRegistryWithMcpClients("bugsnag,SWAGGER");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      const clientC = createMockClient("Reflect", z.object({}));
      registry.register(clientA);
      registry.register(clientB);
      registry.register(clientC);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should handle whitespace around client names", async () => {
      const registry = await createRegistryWithMcpClients(
        "  Bugsnag , Swagger  ",
      );

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      const clientC = createMockClient("Reflect", z.object({}));
      registry.register(clientA);
      registry.register(clientB);
      registry.register(clientC);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should return no clients when MCP_CLIENTS contains no matching names", async () => {
      const registry = await createRegistryWithMcpClients("NonExistent");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      expect(registry.getAll()).toEqual([]);
    });

    it("should ignore empty entries from extra commas", async () => {
      const registry = await createRegistryWithMcpClients(",Bugsnag,,Swagger,");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      const clientC = createMockClient("Reflect", z.object({}));
      registry.register(clientA);
      registry.register(clientB);
      registry.register(clientC);

      expect(registry.getAll()).toEqual([clientA, clientB]);
    });

    it("should only register filtered clients via registerAll", async () => {
      const registry = await createRegistryWithMcpClients("Bugsnag");

      const clientA = createMockClient("Bugsnag", z.object({}));
      const clientB = createMockClient("Swagger", z.object({}));
      registry.register(clientA);
      registry.register(clientB);

      const count = await registry.registerAll(
        mockServer,
        () => "value",
        true,
        false,
      );

      expect(count).toBe(1);
      expect(clientA.configure).toHaveBeenCalled();
      expect(clientB.configure).not.toHaveBeenCalled();
    });
  });
});
