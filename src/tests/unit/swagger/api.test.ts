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

  describe("publishPortalProduct", () => {
    const headers = {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "User-Agent": "SmartBear-MCP/1.0.0",
    };

    const productId = "prod-123";
    const portalId = "portal-123";
    const productSlug = "test-product";
    const tocId = "toc-1";

    const productResponse = {
      id: productId,
      name: "Test Product",
      slug: productSlug,
      portalId,
    };

    const portalResponse = {
      id: portalId,
      name: "Test Portal",
      subdomain: "testportal",
    };

    const customDomainPortalResponse = {
      id: portalId,
      name: "Test Portal",
      customDomain: "testCustomDomain.portal-testing.com",
    };

    const sectionsResponse = {
      page: {
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
      items: [
        {
          id: "section-1",
          productId,
          title: "Docs",
          slug: "docs",
          tableOfContents: [
            {
              id: tocId,
              slug: "getting-started",
              title: "Getting Started",
              order: 0,
              parentId: null,
              children: [],
              swaggerhubApi: null,
              content: null,
            },
          ],
          order: 0,
        },
      ],
    };

    const previewSectionsResponse = {
      page: {
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
      items: [],
    };

    const publishResponse = { success: true };

    it("should publish product and return resolved liveUrl", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(sectionsResponse))
        .mockResponseOnce(JSON.stringify(portalResponse))
        .mockResponseOnce(JSON.stringify(publishResponse));

      const result = await api.publishPortalProduct(productId, false, tocId);

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `https://api.portal.swaggerhub.com/v1/products/${productId}`,
        {
          method: "GET",
          headers,
        },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `https://api.portal.swaggerhub.com/v1/products/${productId}/sections?embed=tableOfContents&embed=tableOfContents.swaggerhubApi`,
        {
          method: "GET",
          headers,
        },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        `https://api.portal.swaggerhub.com/v1/portals/${portalId}`,
        {
          method: "GET",
          headers,
        },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        `https://api.portal.swaggerhub.com/v1/products/${productId}/published-content?preview=false`,
        {
          method: "PUT",
          headers,
        },
      );

      expect(result).toEqual({
        success: true,
        preview: false,
        liveUrl: `https://testportal.portal.swaggerhub.com/${productSlug}/docs/getting-started`,
        product: {
          id: productResponse.id,
          name: productResponse.name,
          slug: productResponse.slug,
        },
        portal: {
          id: portalResponse.id,
          name: portalResponse.name,
          subdomain: portalResponse.subdomain,
          customDomain: undefined,
        },
        tableOfContentsItem: {
          id: sectionsResponse.items[0].tableOfContents[0].id,
          slug: sectionsResponse.items[0].tableOfContents[0].slug,
          title: sectionsResponse.items[0].tableOfContents[0].title,
          order: sectionsResponse.items[0].tableOfContents[0].order,
          parentId: sectionsResponse.items[0].tableOfContents[0].parentId,
        },
      });
    });

    it("should publish preview product and return previewUrl", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(previewSectionsResponse))
        .mockResponseOnce(JSON.stringify(portalResponse))
        .mockResponseOnce(JSON.stringify(publishResponse));

      const result = await api.publishPortalProduct(productId, true);

      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        `https://api.portal.swaggerhub.com/v1/products/${productId}/published-content?preview=true`,
        {
          method: "PUT",
          headers,
        },
      );

      expect(result).toEqual({
        success: true,
        preview: true,
        previewUrl: `https://testportal.portal.swaggerhub.com/${productSlug}?preview=product`,
        product: {
          id: productResponse.id,
          name: productResponse.name,
          slug: productResponse.slug,
        },
        portal: {
          id: portalResponse.id,
          name: portalResponse.name,
          subdomain: portalResponse.subdomain,
          customDomain: undefined,
        },
      });
    });

    it("should use customDomain as the full host when present", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(sectionsResponse))
        .mockResponseOnce(JSON.stringify(customDomainPortalResponse))
        .mockResponseOnce(JSON.stringify(publishResponse));

      const result = await api.publishPortalProduct(productId, true, tocId);

      expect(result).toEqual({
        success: true,
        preview: true,
        previewUrl:
          "https://testCustomDomain.portal-testing.com/test-product/docs/getting-started?preview=product",
        product: {
          id: productResponse.id,
          name: productResponse.name,
          slug: productResponse.slug,
        },
        portal: {
          id: customDomainPortalResponse.id,
          name: customDomainPortalResponse.name,
          subdomain: undefined,
          customDomain: customDomainPortalResponse.customDomain,
        },
        tableOfContentsItem: {
          id: sectionsResponse.items[0].tableOfContents[0].id,
          slug: sectionsResponse.items[0].tableOfContents[0].slug,
          title: sectionsResponse.items[0].tableOfContents[0].title,
          order: sectionsResponse.items[0].tableOfContents[0].order,
          parentId: sectionsResponse.items[0].tableOfContents[0].parentId,
        },
      });
    });
  });

  describe("createDocumentationPage", () => {
    const BASE = "https://api.portal.swaggerhub.com/v1";
    const headers = {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "User-Agent": "SmartBear-MCP/1.0.0",
    };

    const portalId = "portal-abc";
    const productId = "prod-xyz";
    const sectionId = "section-1";
    const documentId = "doc-111";
    const tocItemId = "toc-222";

    const portalResponse = {
      id: portalId,
      name: "My Portal",
      subdomain: "myportal",
    };

    const productResponse = {
      id: productId,
      name: "My Product",
      slug: "my-product",
      portalId,
    };

    const sectionsResponse = {
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
      items: [
        {
          id: sectionId,
          productId,
          title: "Docs",
          slug: "docs",
          tableOfContents: [],
          order: 0,
        },
      ],
    };

    const sectionsWithEmbedResponse = {
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
      items: [],
    };

    const tocItemResponse = { id: tocItemId, documentId };
    const updateDocumentResponse = { success: true };

    const setupFetchRoutes = () => {
      fetchMock.mockResponse((req) => {
        const { url, method } = req;

        if (url === `${BASE}/portals/${portalId}`) {
          return Promise.resolve(JSON.stringify(portalResponse));
        }
        if (url === `${BASE}/products/${productId}` && method === "GET") {
          return Promise.resolve(JSON.stringify(productResponse));
        }
        if (url === `${BASE}/products/${productId}/sections`) {
          return Promise.resolve(JSON.stringify(sectionsResponse));
        }
        if (url.startsWith(`${BASE}/products/${productId}/sections?`)) {
          return Promise.resolve(JSON.stringify(sectionsWithEmbedResponse));
        }
        if (url === `${BASE}/sections/${sectionId}/table-of-contents`) {
          return Promise.resolve(JSON.stringify(tocItemResponse));
        }
        if (url === `${BASE}/documents/${documentId}`) {
          return Promise.resolve(JSON.stringify(updateDocumentResponse));
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      });
    };

    it("should create a documentation page and return draftUrl", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Getting Started",
        pageContent: "# Hello",
      });

      expect(fetchMock).toHaveBeenCalledWith(`${BASE}/portals/${portalId}`, {
        method: "GET",
        headers,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${BASE}/products/${productId}`, {
        method: "GET",
        headers,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/products/${productId}/sections`,
        { method: "GET", headers },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/sections/${sectionId}/table-of-contents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "new",
            title: "Getting Started",
            slug: "getting-started",
            order: 0,
            parentId: null,
            content: { type: "markdown", source: "internal" },
          }),
        },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/documents/${documentId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ content: "# Hello", type: "markdown" }),
        },
      );

      expect(result).toEqual({
        productId,
        sectionId,
        sectionSlug: "docs",
        pageDetails: {
          tableOfContentsId: tocItemId,
          slug: "getting-started",
          title: "Getting Started",
          content: { type: "markdown", source: "internal", documentId },
        },
        draftUrl:
          "https://myportal.portal.swaggerhub.com/sp-admin/products/my-product/edit/content/toc-222",
      });
    });

    it("should pass order and parentId to createTableOfContents", async () => {
      setupFetchRoutes();

      await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Advanced Guide",
        pageContent: "content",
        order: 3,
        parentId: "parent-toc-id",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/sections/${sectionId}/table-of-contents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "new",
            title: "Advanced Guide",
            slug: "advanced-guide",
            order: 3,
            parentId: "parent-toc-id",
            content: { type: "markdown", source: "internal" },
          }),
        },
      );
    });

    it("should throw ToolError when product has no sections", async () => {
      const emptySections = {
        page: { number: 0, size: 0, totalElements: 0, totalPages: 0 },
        items: [],
      };

      fetchMock.mockResponse((req) => {
        const { url } = req;
        if (url === `${BASE}/portals/${portalId}`) {
          return Promise.resolve(JSON.stringify(portalResponse));
        }
        if (url === `${BASE}/products/${productId}`) {
          return Promise.resolve(JSON.stringify(productResponse));
        }
        if (url === `${BASE}/products/${productId}/sections`) {
          return Promise.resolve(JSON.stringify(emptySections));
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

      await expect(
        api.createDocumentationPage({
          portalId,
          productId,
          pageTitle: "My Page",
          pageContent: "content",
        }),
      ).rejects.toThrow(`Product ${productId} has no sections`);
    });

    it("should normalise page title into a slug", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Hello World! 123",
        pageContent: "content",
      });

      expect(result.pageDetails.slug).toBe("hello-world-123");
      expect(result.draftUrl).toContain(`/edit/content/${tocItemId}`);
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
});
