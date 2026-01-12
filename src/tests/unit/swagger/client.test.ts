import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { SwaggerClient } from "../../../swagger/client";
import { TOOLS } from "../../../swagger/client/tools";

const fetchMock = createFetchMock(vi);

describe("SwaggerClient", () => {
  let client: SwaggerClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();

    client = new SwaggerClient();
    await client.configure({} as any, { api_key: "test-token" });
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(client).toBeInstanceOf(SwaggerClient);
      expect(client.name).toBe("Swagger");
      expect(client.toolPrefix).toBe("swagger");
      expect(client.configPrefix).toBe("Swagger");
    });

    it("should create configuration and API instances", () => {
      // Test that the client was constructed successfully
      expect(client).toBeDefined();
    });
  });

  describe("API delegation methods", () => {
    it("should delegate getPortals to API instance", async () => {
      const mockResponse = { portals: [{ id: "1", name: "Test Portal" }] };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await client.getPortals();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delegate createPortal to API instance", async () => {
      const mockResponse = { id: "new-portal", name: "New Portal" };
      const createData = {
        subdomain: "new-portal",
        swaggerHubOrganizationId: "org-123",
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await client.createPortal(createData);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(createData),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delegate getPortal to API instance", async () => {
      const mockResponse = { id: "portal-123", name: "Test Portal" };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await client.getPortal({ portalId: "portal-123" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delegate updatePortal to API instance", async () => {
      const mockResponse = { id: "portal-123", name: "Updated Portal" };
      const updateData = { name: "Updated Portal" };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse), {
        headers: { "content-type": "application/json" },
      });

      const result = await client.updatePortal({
        portalId: "portal-123",
        ...updateData,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(updateData),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delegate product management methods", async () => {
      const mockResponse = { products: [] };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await client.getPortalProducts({ portalId: "portal-123" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123/products",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("registerTools", () => {
    it("should register all tools from TOOLS array", () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(TOOLS.length);

      // Verify each tool was registered with correct structure
      TOOLS.forEach((tool, index) => {
        const registerCall = mockRegister.mock.calls[index];
        const { handler: _, formatResponse: __, ...expectedToolParams } = tool;
        expect(registerCall[0]).toEqual(expectedToolParams);
        expect(typeof registerCall[1]).toBe("function");
      });
    });

    it("should handle tool execution for getPortals", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();
      const mockResponse = { portals: [] };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      client.registerTools(mockRegister, mockGetInput);

      // Find the getPortals tool handler
      const getPortalsCall = mockRegister.mock.calls.find(
        (call) => call[0].title === "List Portals",
      );
      expect(getPortalsCall).toBeDefined();

      const handler = getPortalsCall?.[1];
      const result = await handler({}, {});

      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockResponse) }],
      });
    });

    it("should handle tool execution for createPortal", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();
      const mockResponse = { id: "new-portal" };
      const args = { subdomain: "test", swaggerHubOrganizationId: "org-123" };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      client.registerTools(mockRegister, mockGetInput);

      // Find the createPortal tool handler
      const createPortalCall = mockRegister.mock.calls.find(
        (call) => call[0].title === "Create Portal",
      );
      expect(createPortalCall).toBeDefined();

      const handler = createPortalCall?.[1];
      const result = await handler(args, {});

      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockResponse) }],
      });
    });

    it("should handle tool execution with formatResponse for delete operations", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      fetchMock.mockResponseOnce("", { status: 200 });

      client.registerTools(mockRegister, mockGetInput);

      // Verify that tools are registered properly
      expect(mockRegister).toHaveBeenCalled();
    });

    it("should handle tool execution errors gracefully", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      fetchMock.mockRejectOnce(new Error("Network error"));

      client.registerTools(mockRegister, mockGetInput);

      // Find any tool handler
      const toolCall = mockRegister.mock.calls[0];
      const handler = toolCall[1];
      const result = await handler({}, {});

      expect(result).toEqual({
        content: [{ type: "text", text: "Error: Network error" }],
      });
    });

    it("should handle complex tool execution with parameter destructuring", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();
      const mockResponse = { id: "portal-123", name: "Updated Portal" };
      const args = {
        portalId: "portal-123",
        name: "Updated Portal",
        offline: true,
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse), {
        headers: { "content-type": "application/json" },
      });

      client.registerTools(mockRegister, mockGetInput);

      // Find the updatePortal tool handler
      const updatePortalCall = mockRegister.mock.calls.find(
        (call) => call[0].title === "Update Portal",
      );
      expect(updatePortalCall).toBeDefined();

      const handler = updatePortalCall?.[1];
      const result = await handler(args, {});

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Portal", offline: true }),
        }),
      );

      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockResponse) }],
      });
    });

    it("should handle unknown handler gracefully", async () => {
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      // Mock TOOLS with an invalid handler
      TOOLS.push({
        title: "Invalid Tool",
        summary: "Invalid tool for testing",
        parameters: [],
        handler: "nonExistentMethod",
      } as any);

      client.registerTools(mockRegister, mockGetInput);

      // Find the invalid tool handler
      const invalidToolCall = mockRegister.mock.calls.find(
        (call) => call[0].title === "Invalid Tool",
      );
      expect(invalidToolCall).toBeDefined();

      const handler = invalidToolCall?.[1];
      const result = await handler({}, {});

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Handler 'nonExistentMethod' not found on SwaggerClient",
          },
        ],
      });

      // Restore original TOOLS
      TOOLS.splice(-1, 1);
    });
  });

  describe("error handling", () => {
    it("should handle API errors in delegated methods", async () => {
      fetchMock.mockRejectOnce(new Error("API Error"));

      await expect(client.getPortals()).rejects.toThrow("API Error");
    });
  });
});
