import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { SwaggerAPI } from "./client/api";
import { SwaggerConfiguration } from "./client/configuration";

const fetchMock = createFetchMock(vi);
const DUMMY_REGISTRY_BASE_PATH = "https://registry.example.test";
const DUMMY_PORTAL_BASE_PATH = "https://api.portal.swaggerhub.com/v1";

describe("SwaggerAPI", () => {
  let api: SwaggerAPI;
  let config: SwaggerConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();

    config = new SwaggerConfiguration({
      token: "test-token",
      registryBasePath: DUMMY_REGISTRY_BASE_PATH,
      portalBasePath: DUMMY_PORTAL_BASE_PATH,
    });
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
        `${config.portalBasePath}/portals`,
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
        `${config.portalBasePath}/portals`,
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
        `${config.portalBasePath}/portals/portal-123`,
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
        `${config.portalBasePath}/portals/portal-123`,
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
        `${config.portalBasePath}/portals/portal-123/products`,
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
        `${config.portalBasePath}/portals/portal-123/products`,
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
        `${config.portalBasePath}/products/prod-123`,
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
        `${config.portalBasePath}/products/prod-123`,
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
    it("should update product with patch data and return URL", async () => {
      const mockProductResponse = {
        id: "prod-123",
        name: "Updated Product",
        slug: "my-product",
        portalId: "portal-456",
      };
      const mockPortalResponse = {
        id: "portal-456",
        subdomain: "my-portal",
        name: "My Portal",
      };
      const updateData = { name: "Updated Product", public: true };

      fetchMock.mockResponseOnce(JSON.stringify(mockProductResponse), {
        headers: { "content-type": "application/json" },
      });

      fetchMock.mockResponseOnce(JSON.stringify(mockPortalResponse), {
        headers: { "content-type": "application/json" },
      });

      const result = await api.updatePortalProduct("prod-123", updateData);

      expect(fetchMock).toHaveBeenCalledWith(
        `${config.portalBasePath}/products/prod-123`,
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

      expect(fetchMock).toHaveBeenCalledWith(
        `${config.portalBasePath}/portals/portal-456`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "SmartBear-MCP/1.0.0",
          },
        },
      );

      expect(result).toEqual({
        ...mockProductResponse,
        url: "https://my-portal.portal.swaggerhub.com/my-product",
      });
    });

    it("should return product without URL when URL generation fails", async () => {
      const mockProductResponse = {
        id: "prod-123",
        name: "Updated Product",
        slug: "my-product",
        portalId: "portal-456",
      };
      const updateData = { name: "Updated Product", public: true };

      fetchMock.mockResponseOnce(JSON.stringify(mockProductResponse), {
        headers: { "content-type": "application/json" },
      });

      fetchMock.mockResponseOnce("Portal not found", { status: 404 });

      const result = await api.updatePortalProduct("prod-123", updateData);

      expect(result).toEqual(mockProductResponse);
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
        `${config.registryBasePath}/apis/orgname/petstore/1.0.0`,
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
        `${config.registryBasePath}/standardization/orgname/scan`,
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

  describe("createApiFromPrompt", () => {
    it("should always send createOnly=true and return operation 'create'", async () => {
      fetchMock.mockResponseOnce("", {
        status: 201,
        headers: { "X-Version": "1.0.0" },
      });

      const result = await api.createApiFromPrompt({
        owner: "orgname",
        apiName: "petstore",
        prompt: "Create a RESTful API for managing a pet store",
        specType: "openapi30x",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${config.registryBasePath}/apis/orgname/petstore/.ai?specType=openapi30x&createOnly=true`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual({
        owner: "orgname",
        apiName: "petstore",
        specType: "openapi30x",
        version: "1.0.0",
        url: "https://app.swaggerhub.com/apis/orgname/petstore/1.0.0",
        operation: "create",
      });
    });

    it("should throw when the generated version already exists (409 Conflict)", async () => {
      fetchMock.mockResponseOnce(
        "API 'petstore' version '1.0.0' already exists",
        {
          status: 409,
          statusText: "Conflict",
        },
      );

      await expect(
        api.createApiFromPrompt({
          owner: "orgname",
          apiName: "petstore",
          prompt: "Create a RESTful API for managing a pet store",
          specType: "openapi30x",
        }),
      ).rejects.toThrow(/createApiFromPrompt failed - status: 409 Conflict/);
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
        `${config.portalBasePath}/products/${productId}/published-content?preview=false`,
        {
          method: "PUT",
          headers,
        },
      );

      // Verify metadata was fetched after publish
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${config.portalBasePath}/products/${productId}`,
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
        `${config.portalBasePath}/products/${productId}/published-content?preview=true`,
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

        if (url === `${DUMMY_PORTAL_BASE_PATH}/portals/${portalId}`) {
          return Promise.resolve(JSON.stringify(portalResponse));
        }
        if (
          url === `${DUMMY_PORTAL_BASE_PATH}/products/${productId}` &&
          method === "GET"
        ) {
          return Promise.resolve(JSON.stringify(productResponse));
        }
        if (
          url === `${DUMMY_PORTAL_BASE_PATH}/products/${productId}/sections`
        ) {
          return Promise.resolve(JSON.stringify(sectionsResponse));
        }
        if (
          url.startsWith(
            `${DUMMY_PORTAL_BASE_PATH}/products/${productId}/sections?`,
          )
        ) {
          return Promise.resolve(JSON.stringify(sectionsWithEmbedResponse));
        }
        if (
          url ===
          `${DUMMY_PORTAL_BASE_PATH}/sections/${sectionId}/table-of-contents`
        ) {
          return Promise.resolve(JSON.stringify(tocItemResponse));
        }
        if (url === `${DUMMY_PORTAL_BASE_PATH}/documents/${documentId}`) {
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

      expect(fetchMock).toHaveBeenCalledWith(
        `${DUMMY_PORTAL_BASE_PATH}/portals/${portalId}`,
        {
          method: "GET",
          headers,
        },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${DUMMY_PORTAL_BASE_PATH}/products/${productId}`,
        {
          method: "GET",
          headers,
        },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${DUMMY_PORTAL_BASE_PATH}/products/${productId}/sections`,
        { method: "GET", headers },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `${DUMMY_PORTAL_BASE_PATH}/sections/${sectionId}/table-of-contents`,
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
        `${DUMMY_PORTAL_BASE_PATH}/documents/${documentId}`,
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
        `${DUMMY_PORTAL_BASE_PATH}/sections/${sectionId}/table-of-contents`,
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
        if (url === `${DUMMY_PORTAL_BASE_PATH}/portals/${portalId}`) {
          return Promise.resolve(JSON.stringify(portalResponse));
        }
        if (url === `${DUMMY_PORTAL_BASE_PATH}/products/${productId}`) {
          return Promise.resolve(JSON.stringify(productResponse));
        }
        if (
          url === `${DUMMY_PORTAL_BASE_PATH}/products/${productId}/sections`
        ) {
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
        `${DUMMY_PORTAL_BASE_PATH}/sections/${sectionId}/table-of-contents`,
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
        `${DUMMY_PORTAL_BASE_PATH}/documents/${documentId}`,
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
        `${DUMMY_PORTAL_BASE_PATH}/sections/${sectionId}/table-of-contents`,
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

    const suffixRandom = 0.123456789;
    const suffixFor = (r: number) =>
      r.toString(36).substring(2, 5).padEnd(3, "0");

    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(suffixRandom);
    });

    afterEach(() => {
      vi.mocked(Math.random).mockRestore();
    });

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

      const expectedSubdomain = `acmecorp-${suffixFor(suffixRandom)}`;
      expect(createBody).toEqual({
        subdomain: expectedSubdomain,
        swaggerHubOrganizationId: organizationId,
        name: "Acme Corp",
      });
      expect(result).toEqual({
        organizationId,
        portalId: "new-portal-id",
        subdomain: expectedSubdomain,
        portalCreated: true,
        products: [],
      });
    });

    it("should pad a missing organization name with random digits", async () => {
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

      const expectedSubdomain = `111-${suffixFor(suffixRandom)}`;
      expect(createBody).toEqual({
        subdomain: expectedSubdomain,
        swaggerHubOrganizationId: organizationId,
      });
      expect(result.subdomain).toBe(expectedSubdomain);
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

    it("should retry with a freshly randomized subdomain when the subdomain is taken", async () => {
      const firstRandom = 0.111111;
      const secondRandom = 0.777777;
      vi.mocked(Math.random)
        .mockReturnValueOnce(firstRandom)
        .mockReturnValueOnce(secondRandom);

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

      expect(createBodies[0].subdomain).toBe(
        `acmecorp-${suffixFor(firstRandom)}`,
      );
      expect(createBodies[1].subdomain).toBe(
        `acmecorp-${suffixFor(secondRandom)}`,
      );
      expect(result.subdomain).toBe(`acmecorp-${suffixFor(secondRandom)}`);
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

  describe("createOrUpdateApi", () => {
    const owner = "orgname";
    const apiName = "petstore";
    const definition = [
      "openapi: 3.0.0",
      "info:",
      "  title: Pets",
      "  version: 1.0.0",
      "paths: {}",
      "",
    ].join("\n");

    it("sends isPrivate=true when creating a new API", async () => {
      fetchMock.mockResponseOnce("", { status: 404 }).mockResponseOnce("", {
        status: 201,
        headers: { "X-Version": "1.0.0" },
      });

      const result = await api.createOrUpdateApi({
        owner,
        apiName,
        definition,
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore`,
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore?isPrivate=true`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.operation).toBe("create");
    });

    it("omits isPrivate when updating an existing API, preserving visibility", async () => {
      fetchMock.mockResponseOnce("", { status: 200 }).mockResponseOnce("", {
        status: 200,
        headers: { "X-Version": "1.0.0" },
      });

      const result = await api.createOrUpdateApi({
        owner,
        apiName,
        definition,
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore`,
        expect.objectContaining({ method: "GET" }),
      );
      // Visibility must not be sent on update, otherwise an existing public
      // API would silently be flipped to private.
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.operation).toBe("update");
    });
  });

  describe("patchApi", () => {
    const owner = "orgname";
    const apiName = "petstore";

    const baseDefinition = [
      "openapi: 3.0.0",
      "info:",
      "  title: Pets",
      "  version: 1.0.0",
      "paths:",
      "  /pets:",
      "    get:",
      "      summary: List all pets",
      "      responses:",
      "        '200':",
      "          description: OK",
      "  /pets/{id}:",
      "    get:",
      "      summary: Get a pet",
      "      responses:",
      "        '200':",
      "          description: OK",
      "",
    ].join("\n");

    it("applies edits, sets info.version, and saves api", async () => {
      fetchMock
        .mockResponseOnce("", { status: 404 })
        .mockResponseOnce(baseDefinition)
        .mockResponseOnce("", { headers: { "X-Version": "1.0.1" } });

      const result = await api.patchApi({
        owner,
        apiName,
        version: "1.0.0",
        newVersion: "1.0.1",
        edits: [
          {
            oldString: "      summary: List all pets",
            replaceString:
              "      operationId: listPets\n      summary: List all pets",
          },
        ],
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore/1.0.1`,
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore/1.0.0`,
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore?version=1.0.1&isPrivate=true`,
        expect.objectContaining({ method: "POST" }),
      );

      expect(result.saved).toBe(true);
      expect(result.failed).toBeUndefined();
      expect(result.operation).toBe("update");
      expect(result.version).toBe("1.0.1");
      expect(result.url).toBe(
        "https://app.swaggerhub.com/apis/orgname/petstore/1.0.1",
      );
    });

    it("rejects a newVersion that already exists without saving", async () => {
      fetchMock.mockResponseOnce(baseDefinition);

      await expect(
        api.patchApi({
          owner,
          apiName,
          version: "1.0.0",
          newVersion: "1.0.1",
          edits: [
            { oldString: "title: Pets", replaceString: "title: Pet Store" },
          ],
        }),
      ).rejects.toThrow(/already exists/i);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("overwrites the base version when newVersion is not provided", async () => {
      fetchMock
        .mockResponseOnce(baseDefinition)
        .mockResponseOnce("", { headers: { "X-Version": "1.0.0" } });

      const result = await api.patchApi({
        owner,
        apiName,
        version: "1.0.0",
        edits: [
          { oldString: "title: Pets", replaceString: "title: Pet Store" },
        ],
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore/1.0.0`,
        expect.objectContaining({ method: "GET" }),
      );
      // Visibility must not be sent for an in-place patch, otherwise the
      // existing version could silently change visibility.
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${DUMMY_REGISTRY_BASE_PATH}/apis/orgname/petstore?version=1.0.0`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.saved).toBe(true);
      expect(result.version).toBe("1.0.0");
    });

    it("reports no_match and ambiguous failures without saving", async () => {
      fetchMock
        .mockResponseOnce("", { status: 404 })
        .mockResponseOnce(baseDefinition);

      const result = await api.patchApi({
        owner,
        apiName,
        version: "1.0.0",
        newVersion: "1.0.1",
        edits: [
          { oldString: "does not exist anywhere", replaceString: "x" },
          { oldString: "  version: 1.0.0\npaths:", replaceString: "y" },
          { oldString: "description: OK", replaceString: "description: OK!" },
        ],
      });

      expect(result.saved).toBe(false);
      expect(result.failed).toEqual([
        {
          index: 0,
          oldString: "does not exist anywhere",
          error: "no_match",
          matchCount: 0,
        },
        {
          index: 2,
          oldString: "description: OK",
          error: "ambiguous",
          matchCount: 2,
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("patches an AsyncAPI definition", async () => {
      const asyncapiDefinition = [
        "asyncapi: 3.0.0",
        "info:",
        "  title: Events",
        "  version: 1.0.0",
        "channels:",
        "  pets:",
        "    address: pets",
      ].join("\n");

      fetchMock
        .mockResponseOnce(asyncapiDefinition)
        .mockResponseOnce("", { headers: { "X-Version": "1.0.0" } });

      const result = await api.patchApi({
        owner,
        apiName,
        version: "1.0.0",
        edits: [
          { oldString: "title: Events", replaceString: "title: Pet Events" },
        ],
      });

      expect(result.saved).toBe(true);
    });

    it("rejects a definition that is neither OpenAPI nor AsyncAPI", async () => {
      fetchMock.mockResponseOnce("foo: bar\nbaz: 1");

      await expect(
        api.patchApi({
          owner,
          apiName,
          version: "1.0.0",
          edits: [{ oldString: "foo: bar", replaceString: "foo: baz" }],
        }),
      ).rejects.toThrow(/invalid format/i);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
