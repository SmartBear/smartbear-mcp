import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { SwaggerAPI } from "../../../swagger/client/api";
import { SwaggerConfiguration } from "../../../swagger/client/configuration";

const fetchMock = createFetchMock(vi);

describe("SwaggerAPI", () => {
  let api: SwaggerAPI;
  let config: SwaggerConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();

    config = new SwaggerConfiguration({ token: "test-token" });
    api = new SwaggerAPI(config, "SmartBear-MCP/1.0.0");
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("getPortals", () => {
    it("should fetch portals with correct headers", async () => {
      const mockResponse = { portals: [{ id: "1", name: "Test Portal" }] };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.getPortals();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createPortal", () => {
    it("should create portal with correct payload", async () => {
      const mockResponse = { id: "new-portal-id", name: "New Portal" };
      const createData = {
        name: "New Portal",
        subdomain: "new-portal",
        swaggerHubOrganizationId: "org-123",
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.createPortal(createData);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
          body: JSON.stringify(createData),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getPortal", () => {
    it("should fetch specific portal by ID", async () => {
      const mockResponse = { id: "portal-123", name: "Test Portal" };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.getPortal("portal-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updatePortal", () => {
    it("should update portal with patch data", async () => {
      const mockResponse = { id: "portal-123", name: "Updated Portal" };
      const updateData = { name: "Updated Portal", offline: true };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.updatePortal("portal-123", updateData);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123",
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getPortalProducts", () => {
    it("should fetch products for a portal", async () => {
      const mockResponse = { products: [{ id: "prod-1", name: "Product 1" }] };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.getPortalProducts("portal-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123/products",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createPortalProduct", () => {
    it("should create product in portal", async () => {
      const mockResponse = { id: "prod-new", name: "New Product" };
      const createData = {
        type: "new",
        name: "New Product",
        slug: "new-product",
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.createPortalProduct("portal-123", createData);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/portals/portal-123/products",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
          body: JSON.stringify(createData),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getPortalProduct", () => {
    it("should fetch specific product by ID", async () => {
      const mockResponse = { id: "prod-123", name: "Test Product" };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await api.getPortalProduct("prod-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/products/prod-123",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deletePortalProduct", () => {
    it("should delete product by ID", async () => {
      fetchMock.mockResponseOnce("", { status: 200 });

      await api.deletePortalProduct("prod-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/products/prod-123",
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );
    });
  });

  describe("updatePortalProduct", () => {
    it("should update product with patch data", async () => {
      const mockResponse = { id: "prod-123", name: "Updated Product" };
      const updateData = { name: "Updated Product", public: true };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.updatePortalProduct("prod-123", updateData);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.portal.swaggerhub.com/v1/products/prod-123",
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors gracefully", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.getPortals()).rejects.toThrow("Network error");
    });

    it("should throw on non-200 responses", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(api.getPortals()).rejects.toThrow("HTTP 401");
    });

    it("should include detail from application/problem+json error body", async () => {
      const errorBody = {
        code: "SB400-01",
        type: "https://problems-registry.smartbear.com/missing-request-parameter",
        title: "Missing request parameter",
        detail: "The request is missing an expected query parameter",
        status: 400,
      };
      fetchMock.mockResponseOnce(JSON.stringify(errorBody), {
        status: 400,
        statusText: "",
        headers: { "content-type": "application/problem+json" },
      });

      await expect(
        api.updatePortal("portal-123", { name: "Duplicate Name" }),
      ).rejects.toThrow(
        "HTTP 400: The request is missing an expected query parameter",
      );
    });

    it("should include message from JSON error body when details is absent", async () => {
      const errorBody = { message: "Invalid field value" };
      fetchMock.mockResponseOnce(JSON.stringify(errorBody), {
        status: 400,
        statusText: "",
        headers: { "content-type": "application/json" },
      });

      await expect(
        api.updatePortal("portal-123", { name: "Bad Value" }),
      ).rejects.toThrow("HTTP 400: Invalid field value");
    });

    it("should not append a trailing colon when status text is empty", async () => {
      fetchMock.mockResponseOnce("", {
        status: 400,
        statusText: "",
      });

      await expect(
        api.updatePortal("portal-123", { name: "Bad Value" }),
      ).rejects.toThrow(/^HTTP 400$/);
    });
  });

  describe("resolveOrganizationPortal", () => {
    const organizationId = "d36ff595-6406-4a1b-a1d5-90153ac8f334";
    const jsonHeaders = { "content-type": "application/json" };

    it("should return portal details and products for an existing portal", async () => {
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return {
            body: JSON.stringify({
              items: [
                {
                  id: "portal-1",
                  name: "Other Portal",
                  subdomain: "other",
                  swaggerHubOrganizationId:
                    "11111111-1111-1111-1111-111111111111",
                },
                {
                  id: "portal-2",
                  name: "Pet Co.",
                  subdomain: "petco",
                  // Uppercase to verify case-insensitive matching
                  swaggerHubOrganizationId: organizationId.toUpperCase(),
                },
              ],
            }),
            headers: jsonHeaders,
          };
        }
        if (url.includes("/portals/portal-2/products")) {
          return {
            body: JSON.stringify({
              items: [
                { id: "prod-1", name: "Pet API", slug: "pet-api" },
                { id: "prod-2", name: "Store API", slug: "store-api" },
              ],
            }),
            headers: jsonHeaders,
          };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(result).toEqual({
        organizationId,
        portalId: "portal-2",
        subdomain: "petco",
        portalCreated: false,
        products: [
          {
            productId: "prod-1",
            "product-slug": "pet-api",
            "product-name": "Pet API",
          },
          {
            productId: "prod-2",
            "product-slug": "store-api",
            "product-name": "Store API",
          },
        ],
      });
    });

    it("should create a portal when the organization has none", async () => {
      let createBody: any;
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        if (url.includes("/user-management/v1/orgs")) {
          return {
            body: JSON.stringify({
              items: [{ id: organizationId, name: "Acme Corp" }],
              totalCount: 1,
              pageSize: 100,
              page: 0,
            }),
            headers: jsonHeaders,
          };
        }
        if (url.endsWith("/portals") && req.method === "POST") {
          createBody = JSON.parse(await req.text());
          return {
            body: JSON.stringify({ id: "new-portal-id" }),
            status: 201,
            headers: jsonHeaders,
          };
        }
        if (url.includes("/portals/new-portal-id/products")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(createBody).toEqual({
        subdomain: "acme-corp",
        swaggerHubOrganizationId: organizationId,
        name: "Acme Corp",
      });
      expect(result).toEqual({
        organizationId,
        portalId: "new-portal-id",
        subdomain: "acme-corp",
        portalCreated: true,
        products: [],
      });
    });

    it("should fall back to a UUID-derived subdomain when the organization is not found", async () => {
      let createBody: any;
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        if (url.includes("/user-management/v1/orgs")) {
          return {
            body: JSON.stringify({
              items: [],
              totalCount: 0,
              pageSize: 100,
              page: 0,
            }),
            headers: jsonHeaders,
          };
        }
        if (url.endsWith("/portals") && req.method === "POST") {
          createBody = JSON.parse(await req.text());
          return {
            body: JSON.stringify({ id: "new-portal-id" }),
            status: 201,
            headers: jsonHeaders,
          };
        }
        if (url.includes("/portals/new-portal-id/products")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(createBody).toEqual({
        subdomain: "portal-d36ff595",
        swaggerHubOrganizationId: organizationId,
      });
      expect(result.subdomain).toBe("portal-d36ff595");
      expect(result.portalCreated).toBe(true);
    });

    it("should reuse the portal found on re-check after a 409 conflict", async () => {
      let portalListCalls = 0;
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          portalListCalls++;
          // Empty on the first check, present on the re-check after 409
          if (portalListCalls === 1) {
            return {
              body: JSON.stringify({ items: [] }),
              headers: jsonHeaders,
            };
          }
          return {
            body: JSON.stringify({
              items: [
                {
                  id: "existing-portal",
                  name: "Acme Corp",
                  subdomain: "acme-corp",
                  swaggerHubOrganizationId: organizationId,
                },
              ],
            }),
            headers: jsonHeaders,
          };
        }
        if (url.includes("/user-management/v1/orgs")) {
          return {
            body: JSON.stringify({
              items: [{ id: organizationId, name: "Acme Corp" }],
              totalCount: 1,
              pageSize: 100,
              page: 0,
            }),
            headers: jsonHeaders,
          };
        }
        if (url.endsWith("/portals") && req.method === "POST") {
          return {
            body: JSON.stringify({
              detail: "Portal already exists for this organization",
            }),
            status: 409,
            headers: { "content-type": "application/problem+json" },
          };
        }
        if (url.includes("/portals/existing-portal/products")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(result.portalId).toBe("existing-portal");
      expect(result.portalCreated).toBe(false);
    });

    it("should retry with a suffixed subdomain when the subdomain is taken", async () => {
      const createBodies: any[] = [];
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        if (url.includes("/user-management/v1/orgs")) {
          return {
            body: JSON.stringify({
              items: [{ id: organizationId, name: "Acme Corp" }],
              totalCount: 1,
              pageSize: 100,
              page: 0,
            }),
            headers: jsonHeaders,
          };
        }
        if (url.endsWith("/portals") && req.method === "POST") {
          createBodies.push(JSON.parse(await req.text()));
          if (createBodies.length === 1) {
            return {
              body: JSON.stringify({ detail: "Subdomain already taken" }),
              status: 409,
              headers: { "content-type": "application/problem+json" },
            };
          }
          return {
            body: JSON.stringify({ id: "new-portal-id" }),
            status: 201,
            headers: jsonHeaders,
          };
        }
        if (url.includes("/portals/new-portal-id/products")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(createBodies[0].subdomain).toBe("acme-corp");
      expect(createBodies[1].subdomain).toBe("acme-corp-d36f");
      expect(result.subdomain).toBe("acme-corp-d36f");
      expect(result.portalCreated).toBe(true);
    });

    it("should propagate non-conflict errors from portal creation", async () => {
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        if (url.includes("/user-management/v1/orgs")) {
          return {
            body: JSON.stringify({
              items: [{ id: organizationId, name: "Acme Corp" }],
              totalCount: 1,
              pageSize: 100,
              page: 0,
            }),
            headers: jsonHeaders,
          };
        }
        if (url.endsWith("/portals") && req.method === "POST") {
          return {
            body: JSON.stringify({ detail: "Forbidden" }),
            status: 403,
            headers: { "content-type": "application/problem+json" },
          };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      await expect(
        api.resolveOrganizationPortal({ organizationId }),
      ).rejects.toThrow("HTTP 403");
    });
  });
});
