import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { SwaggerAPI } from "./client/api";
import { SwaggerConfiguration } from "./client/configuration";

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

  describe("scanStandardization", () => {
    it("should return validation errors with count and countsBySeverity", async () => {
      const validation = [
        { severity: "Critical", description: "Missing info", line: 1 },
        { severity: "Warning", description: "Deprecated field", line: 5 },
        { severity: "Critical", description: "Invalid type", line: 10 },
      ];
      fetchMock.mockResponseOnce(JSON.stringify({ validation }), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.scanStandardization({
        orgName: "orgname",
        definition: JSON.stringify({ openapi: "3.0.0" }),
      });

      expect(result).toEqual({
        validation,
        count: 3,
        countsBySeverity: { Critical: 2, Warning: 1 },
      });
    });

    it("should return count 0 and empty countsBySeverity when validation is empty", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ validation: [] }), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.scanStandardization({
        orgName: "orgname",
        definition: JSON.stringify({ openapi: "3.0.0" }),
      });

      expect(result).toEqual({
        validation: [],
        count: 0,
        countsBySeverity: {},
      });
    });

    it("should throw when the scan endpoint returns 400 Bad Request", async () => {
      fetchMock.mockResponseOnce("Bad Request", {
        status: 400,
        statusText: "Bad Request",
      });

      await expect(
        api.scanStandardization({
          orgName: "orgname",
          definition: JSON.stringify({ openapi: "3.0.0" }),
        }),
      ).rejects.toThrow(/scanStandardization failed - status: 400 Bad Request/);
    });
  });

  describe("scanApiStandardizationFromRegistry", () => {
    const definition = { openapi: "3.0.0", info: { title: "Pets" } };

    it("should fetch the definition then scan it and return results extended with the api url", async () => {
      const validation = [
        { severity: "Critical", description: "a", line: 1 },
        { severity: "Warning", description: "c", line: 3 },
      ];
      fetchMock.mockResponseOnce(JSON.stringify(definition), {
        headers: { "content-type": "text/plain" },
      });
      fetchMock.mockResponseOnce(JSON.stringify({ validation }), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.scanApiStandardizationFromRegistry({
        orgName: "orgname",
        apiName: "petstore",
        version: "1.0.0",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.swaggerhub.com/apis/orgname/petstore/1.0.0",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
            Accept: "text/plain",
          },
        },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.swaggerhub.com/standardization/orgname/scan",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(definition),
        }),
      );

      expect(result).toEqual({
        url: "https://app.swaggerhub.com/apis/orgname/petstore/1.0.0",
        validation,
        count: 2,
        countsBySeverity: { Critical: 1, Warning: 1 },
      });
    });

    it("should surface a clear error when the API is not found", async () => {
      fetchMock.mockResponseOnce("", {
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        api.scanApiStandardizationFromRegistry({
          orgName: "orgname",
          apiName: "missing",
          version: "1.0.0",
        }),
      ).rejects.toThrow(/getApiDefinition failed - status: 404 Not Found/);
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

    const emptySectionsResponse = {
      page: {
        number: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      },
      items: [],
    };

    const publishResponse = { success: true };

    it("should publish live product and return full metadata with liveUrl", async () => {
      // Publish happens first, then metadata fetching
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse)) // 1. PUT publish
        .mockResponseOnce(JSON.stringify(productResponse)) // 2. GET product
        .mockResponseOnce(JSON.stringify(portalResponse)) // 3. GET portal
        .mockResponseOnce(JSON.stringify(sectionsResponse)); // 4. GET sections

      const result = await api.publishPortalProduct(productId, false, tocId);

      // Verify publish was called first
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `https://api.portal.swaggerhub.com/v1/products/${productId}/published-content?preview=false`,
        {
          method: "PUT",
          headers,
        },
      );

      // Verify metadata was fetched after publish
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `https://api.portal.swaggerhub.com/v1/products/${productId}`,
        {
          method: "GET",
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

    it("should publish preview product and return previewUrl without tableOfContents", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(portalResponse))
        .mockResponseOnce(JSON.stringify(emptySectionsResponse));

      const result = await api.publishPortalProduct(productId, true);

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
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

    it("should use customDomain when present in portal", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(customDomainPortalResponse))
        .mockResponseOnce(JSON.stringify(sectionsResponse));

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

    it("should succeed with warning when product fetch fails (live mode)", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });

      const result = await api.publishPortalProduct(productId, false);

      expect(result).toEqual({
        success: true,
        preview: false,
        liveUrl: null,
        warning: {
          code: "METADATA_FETCH_FAILED",
          step: "product",
          message:
            "Product published in live mode successfully, but failed to fetch product details for URL generation",
        },
      });
    });

    it("should succeed with warning when product fetch fails (preview mode)", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });

      const result = await api.publishPortalProduct(productId, true);

      expect(result).toEqual({
        success: true,
        preview: true,
        previewUrl: null,
        warning: {
          code: "METADATA_FETCH_FAILED",
          step: "product",
          message:
            "Product published in preview mode successfully, but failed to fetch product details for URL generation",
        },
      });
    });

    it("should succeed with warning when portal fetch fails", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });

      const result = await api.publishPortalProduct(productId, false);

      expect(result).toEqual({
        success: true,
        preview: false,
        liveUrl: null,
        product: {
          id: productResponse.id,
          name: productResponse.name,
          slug: productResponse.slug,
        },
        warning: {
          code: "METADATA_FETCH_FAILED",
          step: "portal",
          message:
            "Product published in live mode successfully, but failed to fetch portal details for URL generation",
        },
      });
    });

    it("should succeed even when sections fetch fails (sections are optional)", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify(productResponse))
        .mockResponseOnce(JSON.stringify(portalResponse))
        .mockResponseOnce(JSON.stringify({ error: "Server error" }), {
          status: 500,
        });

      const result = await api.publishPortalProduct(productId, false);

      // Should still build URL without section/toc
      expect(result).toEqual({
        success: true,
        preview: false,
        liveUrl: `https://testportal.portal.swaggerhub.com/${productSlug}`,
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

    it("should handle product without portalId", async () => {
      const productWithoutPortal = {
        id: productId,
        name: "Orphan Product",
        slug: productSlug,
        portalId: null,
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(publishResponse))
        .mockResponseOnce(JSON.stringify(productWithoutPortal));

      const result = await api.publishPortalProduct(productId, false);

      expect(result).toEqual({
        success: true,
        preview: false,
        liveUrl: null,
        product: {
          id: productWithoutPortal.id,
          name: productWithoutPortal.name,
          slug: productWithoutPortal.slug,
        },
        warning: {
          code: "METADATA_FETCH_FAILED",
          step: "portal",
          message:
            "Product published in live mode successfully, but failed to fetch portal details for URL generation",
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

    it("should throw ToolError for html + internal with content", async () => {
      await expect(
        api.createDocumentationPage({
          portalId,
          productId,
          pageTitle: "My Page",
          pageContent: "<h1>Hello</h1>",
          contentType: "html",
          source: "internal",
        }),
      ).rejects.toThrow(
        "Cannot create an html + internal page with content via API",
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

    it("should create an html + external documentation page", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "API Reference",
        pageContent: "<h1>API Reference</h1>",
        contentType: "html",
        source: "external",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/sections/${sectionId}/table-of-contents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "new",
            title: "API Reference",
            slug: "api-reference",
            order: 0,
            parentId: null,
            content: { type: "html", source: "external" },
          }),
        },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/documents/${documentId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            content: "<h1>API Reference</h1>",
            type: "html",
          }),
        },
      );
      expect(result.pageDetails.content).toEqual({
        type: "html",
        source: "external",
        documentId,
      });
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

    it("should use provided slug instead of generating one from title", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Hello World! 123",
        pageContent: "content",
        pageSlug: "my-custom-slug",
      });

      expect(result.pageDetails.slug).toBe("my-custom-slug");
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/sections/${sectionId}/table-of-contents`,
        expect.objectContaining({
          body: expect.stringContaining('"slug":"my-custom-slug"'),
        }),
      );
    });

    it("should fall back to title-derived slug when pageSlug is undefined", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Hello World! 123",
        pageContent: "content",
        pageSlug: undefined,
      });

      expect(result.pageDetails.slug).toBe("hello-world-123");
    });

    it("should fall back to title-derived slug when pageSlug is empty string", async () => {
      setupFetchRoutes();

      const result = await api.createDocumentationPage({
        portalId,
        productId,
        pageTitle: "Hello World! 123",
        pageContent: "content",
        pageSlug: "",
      });

      expect(result.pageDetails.slug).toBe("hello-world-123");
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
            productSlug: "pet-api",
            productName: "Pet API",
          },
          {
            productId: "prod-2",
            productSlug: "store-api",
            productName: "Store API",
          },
        ],
      });
    });

    it("should include customDomain when the existing portal has one", async () => {
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        if (url.includes("/portals?page=1")) {
          return {
            body: JSON.stringify({
              items: [
                {
                  id: "portal-2",
                  name: "Pet Co.",
                  subdomain: "petco",
                  customDomain: "docs.petco.com",
                  swaggerHubOrganizationId: organizationId,
                },
              ],
            }),
            headers: jsonHeaders,
          };
        }
        if (url.includes("/portals/portal-2/products")) {
          return { body: JSON.stringify({ items: [] }), headers: jsonHeaders };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      const result = await api.resolveOrganizationPortal({ organizationId });

      expect(result).toEqual({
        organizationId,
        portalId: "portal-2",
        subdomain: "petco",
        customDomain: "docs.petco.com",
        portalCreated: false,
        products: [],
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

    it("should surface an access error when a portal exists for the organization but is not visible to the caller", async () => {
      const createCalls: any[] = [];
      fetchMock.mockResponse(async (req) => {
        const url = req.url;
        // A consumer-role user cannot see the organization's portal, so the
        // list is always empty for them.
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
          createCalls.push(JSON.parse(await req.text()));
          return {
            body: JSON.stringify({
              detail:
                "A portal already exists for this SwaggerHub organization ID",
            }),
            status: 409,
            headers: { "content-type": "application/problem+json" },
          };
        }
        throw new Error(`Unexpected request: ${url}`);
      });

      await expect(
        api.resolveOrganizationPortal({ organizationId }),
      ).rejects.toThrow("Access denied");

      // The org-level conflict must short-circuit instead of retrying other
      // subdomain candidates.
      expect(createCalls).toHaveLength(1);
    });
  });
});
