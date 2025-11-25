import { describe, test, expect, beforeEach, vi } from "vitest";
import { AlertSiteClient } from "../../../alertsite/client.js";
import type { SmartBearMcpServer } from "../../../common/server.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("AlertSiteClient", () => {
  let client: AlertSiteClient;
  let mockServer: SmartBearMcpServer;

  beforeEach(() => {
    client = new AlertSiteClient();
    mockServer = {} as SmartBearMcpServer;
    vi.clearAllMocks();
  });

  describe("configuration", () => {
    test("should configure with valid credentials", async () => {
      const config = {
        base_url: "https://api.alertsite.com",
        username: "testuser",
        password: "testpass",
      };

      const result = await client.configure(mockServer, config);
      expect(result).toBe(true);
    });

    test("should validate configuration schema", () => {
      expect(() => {
        client.config.parse({
          base_url: "not-a-url",
          username: "test",
          password: "test",
        });
      }).toThrow();

      expect(() => {
        client.config.parse({
          base_url: "https://api.alertsite.com",
          username: "",
          password: "test",
        });
      }).toThrow();

      // Valid configuration should not throw
      expect(() => {
        client.config.parse({
          base_url: "https://api.alertsite.com",
          username: "validuser",
          password: "validpass",
        });
      }).not.toThrow();
    });
  });

  describe("token management", () => {
    beforeEach(async () => {
      await client.configure(mockServer, {
        base_url: "https://api.alertsite.com",
        username: "testuser",
        password: "testpass",
      });
    });

    test("should get token successfully", async () => {
      const mockTokenResponse = {
        access_token: "test-token-123",
        expires_in: 3600,
        token_type: "Bearer",
      };

      const mockApiResponse = { data: "test" };

      (fetch as any)
        // Token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        // API request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });

      const result = await client.call("/api/test");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.alertsite.com/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "password",
            username: "testuser",
            password: "testpass",
          }),
        }
      );

      expect(result).toEqual(mockApiResponse);
    });

    test("should cache and reuse valid token", async () => {
      const mockTokenResponse = {
        access_token: "test-token-123",
        expires_in: 3600,
        token_type: "Bearer",
      };

      // Mock token request
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        // Mock API call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        // Mock second API call (should reuse token)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      // First call - should get token
      await client.call("/api/test1");
      
      // Second call - should reuse token
      await client.call("/api/test2");

      // Should only call token endpoint once
      expect(fetch).toHaveBeenCalledTimes(3); // 1 token + 2 API calls
    });

    test("should refresh token on 401 response", async () => {
      const mockTokenResponse = {
        access_token: "test-token-123",
        expires_in: 3600,
        token_type: "Bearer",
      };

      const newTokenResponse = {
        access_token: "new-token-456",
        expires_in: 3600,
        token_type: "Bearer",
      };

      (fetch as any)
        // Initial token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        // API call with expired token (401)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized"),
        })
        // New token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newTokenResponse),
        })
        // Retry API call with new token
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const result = await client.call("/api/test");
      expect(result).toEqual({ success: true });
    });
  });

  describe("API calls", () => {
    beforeEach(async () => {
      await client.configure(mockServer, {
        base_url: "https://api.alertsite.com",
        username: "testuser",
        password: "testpass",
      });

      // Mock token response
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: "test-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });
    });

    test("should make GET request with proper headers", async () => {
      const mockApiResponse = { data: "test" };
      
      (fetch as any)
        // Token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: "test-token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        })
        // API request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });

      const result = await client.call("/api/monitors");

      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.alertsite.com/api/monitors",
        {
          method: "GET",
          headers: {
            "Authorization": "Bearer test-token",
            "Content-Type": "application/json",
          },
        }
      );
      expect(result).toEqual(mockApiResponse);
    });

    test("should make POST request with body", async () => {
      const postData = { name: "Test Monitor", url: "https://example.com" };
      const mockApiResponse = { id: "123", success: true };

      (fetch as any)
        // Token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: "test-token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        })
        // API request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });

      const result = await client.call("/api/monitors", "POST", postData);

      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.alertsite.com/api/monitors",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        }
      );
      expect(result).toEqual(mockApiResponse);
    });

    test("should handle API errors", async () => {
      (fetch as any)
        // Token request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: "test-token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        })
        // Failed API request
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        });

      await expect(client.call("/api/monitors")).rejects.toThrow(
        "AlertSite API call failed: 500 - Internal Server Error"
      );
    });
  });

  describe("tool registration", () => {
    test("should register all tools", () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(5);
      
      // Check that all expected tools are registered
      const registeredTools = mockRegister.mock.calls.map(call => call[0].title);
      expect(registeredTools).toContain("Create URL Monitor");
      expect(registeredTools).toContain("Run Test On Demand");
      expect(registeredTools).toContain("Create SLA Report");
      expect(registeredTools).toContain("Add Role-Based User");
      expect(registeredTools).toContain("Delete User");
    });

    test("should validate tool input schemas", () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      client.registerTools(mockRegister, mockGetInput);

      // Test Create URL Monitor schema
      const createMonitorTool = mockRegister.mock.calls.find(
        call => call[0].title === "Create URL Monitor"
      );
      expect(createMonitorTool).toBeDefined();
      
      const schema = createMonitorTool![0].inputSchema;
      expect(() => schema.parse({
        name: "Test Monitor",
        url: "https://example.com",
      })).not.toThrow();

      expect(() => schema.parse({
        name: "Test Monitor",
        url: "invalid-url",
      })).toThrow();
    });
  });

  describe("error handling", () => {
    test("should throw error when not configured", async () => {
      await expect(client.call("/api/test")).rejects.toThrow(
        "AlertSite client not configured"
      );
    });

    test("should handle token request failure", async () => {
      await client.configure(mockServer, {
        base_url: "https://api.alertsite.com",
        username: "testuser",
        password: "testpass",
      });

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid credentials"),
      });

      await expect(client.call("/api/test")).rejects.toThrow(
        "AlertSite token request failed: 401 - Invalid credentials"
      );
    });
  });
});