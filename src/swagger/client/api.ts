import { appendClientIdentity } from "../../common/info";
import { ToolError } from "../../common/tools";
import type { SwaggerConfiguration } from "./configuration";
import type {
  CreateDocumentationPageArgs,
  CreateDocumentationPageResult,
  CreatePortalArgs,
  CreateProductBody,
  CreateTableOfContentsBody,
  CreateTableOfContentsItemResponse,
  DeleteTableOfContentsArgs,
  Document,
  FallbackResponse,
  GetDocumentArgs,
  GetProductSectionsArgs,
  GetTableOfContentsArgs,
  Portal,
  PortalsListResponse,
  Product,
  ProductsListResponse,
  PublishPortalProductResponse,
  ResolvedPortalProduct,
  ResolveOrganizationPortalArgs,
  ResolveOrganizationPortalResponse,
  SectionsListResponse,
  SuccessResponse,
  TableOfContentsItem,
  TableOfContentsListResponse,
  UpdateDocumentArgs,
  UpdatePortalBody,
  UpdateProductBody,
} from "./portal-types";
import {
  buildPortalName,
  buildSubdomainCandidate,
  buildSuffixedSubdomain,
  isConflictError,
  isOrganizationPortalConflict,
} from "./portal-utils";
import type {
  ApiDefinitionParams,
  ApiProperty,
  ApiSearchParams,
  ApiSearchResponse,
  ApiSpecification,
  ApisJsonResponse,
  CreateApiFromPromptParams,
  CreateApiFromPromptResponse,
  CreateApiParams,
  CreateApiResponse,
  ScanApiStandardizationFromRegistryParams,
  ScanApiStandardizationFromRegistryResult,
  ScanStandardizationParams,
  StandardizationResult,
  StandardizationScanApiResponse,
  StandardizeApiParams,
  StandardizeApiResponse,
} from "./registry-types";
import type {
  Organization,
  OrganizationsListResponse,
  OrganizationsQueryParams,
} from "./user-management-types";
import {
  buildPortalLiveUrl,
  findTableOfContentsItem,
  normalizeSlug,
} from "./utils";

// Regex to extract owner, name, and version from SwaggerHub URLs.
// Matches /apis/owner/name/version, /domains/owner/name/version, or /templates/owner/name/version
// Example: /apis/acme/petstore/1.0.0
//   - group 1: type (apis|domains|templates)
//   - group 2: owner
//   - group 3: name
//   - group 4: version
const SWAGGER_URL_REGEX =
  /\/(apis|domains|templates)\/([^/]+)\/([^/]+)\/([^/]+)/;

/**
 * Type guard to check if a value has an 'id' property
 */
function hasId(
  value: unknown,
): value is { id: string } & Record<string, unknown> {
  return typeof value === "object" && value !== null && "id" in value;
}

/**
 * Type guard to check if a value has a 'message' property
 */
function hasMessage(
  value: unknown,
): value is { message: string } & Record<string, unknown> {
  return typeof value === "object" && value !== null && "message" in value;
}

/**
 * Type guard to check if a value has an 'errorsFound' property
 */
function hasErrorsFound(
  value: unknown,
): value is { errorsFound: number } & Record<string, unknown> {
  return typeof value === "object" && value !== null && "errorsFound" in value;
}

/**
 * Type guard to check if a value is a StandardizationScanApiResponse
 */
function isStandardizationResult(
  value: unknown,
): value is StandardizationScanApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "validation" in value &&
    Array.isArray((value as StandardizationScanApiResponse).validation)
  );
}

export class SwaggerAPI {
  private config: SwaggerConfiguration;
  private userAgent: string;

  constructor(config: SwaggerConfiguration, userAgent: string) {
    this.config = config;
    this.userAgent = userAgent;
  }

  private get headers(): Record<string, string> {
    return this.config.getHeaders(appendClientIdentity(this.userAgent));
  }

  /**
   * Core response parsing logic shared between different response handlers.
   * Handles 204 No Content, empty responses, JSON parsing, and text fallbacks.
   * @template T - Expected JSON response data type
   * @template D - Default return type for empty responses
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */
  private async parseResponse<T = unknown, D = Record<string, never>>(
    response: Response,
    defaultReturn: D = {} as D,
  ): Promise<T | D | FallbackResponse> {
    // Handle 204 No Content responses
    if (response.status === 204) {
      return defaultReturn;
    }

    // Check if response has content-length of 0 (empty body)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0") {
      return defaultReturn;
    }

    // Check if response is JSON (including application/problem+json)
    const contentType = response.headers.get("content-type");
    if (
      contentType?.includes("application/json") ||
      contentType?.includes("application/problem+json")
    ) {
      try {
        return (await response.json()) as T;
      } catch (error) {
        console.warn("Failed to parse JSON response (declared JSON):", error);
        return defaultReturn;
      }
    }

    // Fallback: read text and attempt heuristic JSON parse
    const text = await response.text();
    if (!text) return defaultReturn;
    const trimmed = text.trim();
    const firstChar = trimmed[0];
    if (firstChar === "{" || firstChar === "[") {
      try {
        return JSON.parse(trimmed) as T;
      } catch (error) {
        console.warn("Heuristic JSON parse failed:", error);
        return { message: text };
      }
    }
    return { message: text };
  }

  /**
   * Handles HTTP responses with smart JSON parsing and fallback handling.
   * Includes HTTP error checking before parsing.
   * @template T - Expected response data type
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */
  private async handleResponse<T = unknown>(
    response: Response,
    defaultReturn: T | Record<string, never> = {} as T,
  ): Promise<T | FallbackResponse> {
    if (!response.ok) {
      const errorBody = await this.parseResponse<Record<string, unknown>>(
        response,
        {},
      );
      const detail =
        (typeof errorBody === "object" &&
          errorBody !== null &&
          String(
            (errorBody as Record<string, unknown>).detail ??
              (errorBody as Record<string, unknown>).message ??
              "",
          )) ||
        response.statusText;
      throw new ToolError(
        `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        undefined,
        new Map([["status", response.status]]),
      );
    }

    return this.parseResponse<T, T | Record<string, never>>(
      response,
      defaultReturn,
    );
  }

  async getPortals(): Promise<PortalsListResponse> {
    const response = await fetch(`${this.config.portalBasePath}/portals`, {
      method: "GET",
      headers: this.headers,
    });
    const result = await this.handleResponse<PortalsListResponse>(
      response,
      [] as unknown as PortalsListResponse,
    );
    return result as PortalsListResponse;
  }

  async getOrganizations(
    params?: OrganizationsQueryParams,
  ): Promise<OrganizationsListResponse> {
    // Build query string if parameters are provided
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append("q", params.q);
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.page !== undefined)
      searchParams.append("page", params.page.toString());
    if (params?.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${this.config.userManagementBasePath}/orgs${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const defaultResponse: OrganizationsListResponse = {
      items: [],
      totalCount: 0,
      pageSize: 50,
      page: 0,
    };

    const result = await this.handleResponse<OrganizationsListResponse>(
      response,
      defaultResponse,
    );
    return result as OrganizationsListResponse;
  }

  async createPortal(body: CreatePortalArgs): Promise<Portal> {
    const response = await fetch(`${this.config.portalBasePath}/portals`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const result = await this.handleResponse<Portal>(response);
    if (!hasId(result)) {
      throw new Error("Unexpected empty response creating portal");
    }
    return result as Portal;
  }

  async getPortal(portalId: string): Promise<Portal> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<Portal>(response);
    if (!hasId(result)) {
      throw new ToolError("Portal not found or empty response");
    }
    return result as Portal;
  }

  async updatePortal(
    portalId: string,
    body: UpdatePortalBody,
  ): Promise<Portal | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return this.handleResponse<Portal>(response);
  }

  /**
   * Resolve portal details and product list for a Swagger organization.
   * Finds the portal mapped to the organization, creating one if it does not
   * exist yet, and returns the portal ID, subdomain, and products.
   * @param params Parameters containing the organization UUID
   * @returns Portal details and product list for the organization
   */
  async resolveOrganizationPortal(
    params: ResolveOrganizationPortalArgs,
  ): Promise<ResolveOrganizationPortalResponse> {
    const { organizationId } = params;

    let portal = await this.findPortalByOrganizationId(organizationId);
    let portalCreated = false;

    if (!portal) {
      const created = await this.createPortalForOrganization(organizationId);
      portal = created.portal;
      portalCreated = created.created;
    }

    const products = this.extractListItems<Product>(
      await this.getPortalProducts(portal.id),
    );

    const customDomain =
      typeof portal.customDomain === "string" && portal.customDomain.length > 0
        ? portal.customDomain
        : undefined;

    return {
      organizationId,
      portalId: portal.id,
      subdomain: typeof portal.subdomain === "string" ? portal.subdomain : "",
      ...(customDomain ? { customDomain } : {}),
      portalCreated,
      products: products.map(
        (product): ResolvedPortalProduct => ({
          productId: product.id,
          productSlug: typeof product.slug === "string" ? product.slug : "",
          productName: product.name,
        }),
      ),
    };
  }

  /**
   * Extract item arrays from list responses that may be returned either as a
   * plain array or as a paginated object with an 'items' property.
   */
  private extractListItems<T>(result: unknown): T[] {
    if (Array.isArray(result)) {
      return result as T[];
    }
    if (
      typeof result === "object" &&
      result !== null &&
      Array.isArray((result as { items?: unknown }).items)
    ) {
      return (result as { items: T[] }).items;
    }
    return [];
  }

  /**
   * Find the portal mapped to a Swagger organization. The Portal API does not
   * support filtering by organization, so pages are scanned client-side.
   *
   * Permission/role problems surface as thrown errors: handleResponse throws on
   * any non-2xx status (e.g. 401/403), so a lack of access never masquerades as
   * an empty result. An empty list therefore means the user can see portals but
   * none is mapped to this organization, in which case a new portal is created.
   */
  private async findPortalByOrganizationId(
    organizationId: string,
  ): Promise<Portal | undefined> {
    const size = 100;
    const maxPages = 20;
    const target = organizationId.toLowerCase();

    for (let page = 1; page <= maxPages; page++) {
      const response = await fetch(
        `${this.config.portalBasePath}/portals?page=${page}&size=${size}`,
        {
          method: "GET",
          headers: this.headers,
        },
      );
      const result = await this.handleResponse<unknown>(response, []);
      const portals = this.extractListItems<Portal>(result);

      const match = portals.find(
        (portal) =>
          typeof portal.swaggerHubOrganizationId === "string" &&
          portal.swaggerHubOrganizationId.toLowerCase() === target,
      );
      if (match) {
        return match;
      }
      if (portals.length < size) {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Find an organization by UUID using the User Management API, which only
   * supports listing the user's organizations (no lookup by ID).
   */
  private async findOrganizationById(
    organizationId: string,
  ): Promise<Organization | undefined> {
    const pageSize = 100;
    const maxPages = 10;
    const target = organizationId.toLowerCase();

    for (let page = 0; page < maxPages; page++) {
      const result = await this.getOrganizations({ page, pageSize });
      const items = result.items ?? [];

      const match = items.find((org) => org.id?.toLowerCase() === target);
      if (match) {
        return match;
      }
      if (items.length < pageSize) {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Create a portal for an organization that has none yet. The subdomain is
   * derived from the organization name; on a subdomain conflict a candidate
   * suffixed with part of the organization UUID is retried.
   */
  private async createPortalForOrganization(
    organizationId: string,
  ): Promise<{ portal: Portal; created: boolean }> {
    const organization = await this.findOrganizationById(organizationId);
    const baseSubdomain = buildSubdomainCandidate(
      organizationId,
      organization?.name,
    );
    const candidates = [
      baseSubdomain,
      buildSuffixedSubdomain(baseSubdomain, organizationId),
    ];

    const portalName = buildPortalName(organization?.name);

    let lastError: unknown;
    for (const subdomain of candidates) {
      try {
        const created = await this.createPortal({
          subdomain,
          swaggerHubOrganizationId: organizationId,
          ...(portalName ? { name: portalName } : {}),
        });
        return {
          portal: { ...created, subdomain: created.subdomain ?? subdomain },
          created: true,
        };
      } catch (error) {
        if (!isConflictError(error)) {
          throw error;
        }
        lastError = error;
        // HTTP 409 can mean either the subdomain is taken or a portal was
        // mapped to the organization concurrently - re-check before retrying
        const existing = await this.findPortalByOrganizationId(organizationId);
        if (existing) {
          return { portal: existing, created: false };
        }
        // The conflict says a portal already exists for the organization, yet
        // listing portals did not surface it. This happens when the caller
        // lacks permission to view the organization's portal (e.g. a
        // consumer-role user); retrying other subdomains only repeats the same
        // 409, so surface a clear access error instead of the misleading
        // "portal already exists" conflict.
        if (isOrganizationPortalConflict(error)) {
          throw new ToolError(
            `Access denied: a portal already exists for organization ${organizationId}, but you do not have permission to view it. A portal owner or designer role is required.`,
          );
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new ToolError(
          `Failed to create portal for organization ${organizationId}`,
        );
  }

  async getPortalProducts(portalId: string): Promise<ProductsListResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}/products`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<ProductsListResponse>(
      response,
      [] as unknown as ProductsListResponse,
    );
    return result as ProductsListResponse;
  }

  async createPortalProduct(
    portalId: string,
    body: CreateProductBody,
  ): Promise<Product> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}/products`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );
    const result = await this.handleResponse<Product>(response);
    if (!hasId(result)) {
      throw new Error("Unexpected empty response creating product");
    }
    return result as Product;
  }

  async getPortalProduct(productId: string): Promise<Product> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<Product>(response);
    if (!hasId(result)) {
      throw new ToolError("Product not found or empty response");
    }
    return result as Product;
  }

  async deletePortalProduct(
    productId: string,
  ): Promise<Record<string, never> | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "DELETE",
        headers: this.headers,
      },
    );
    return this.handleResponse(response);
  }

  async updatePortalProduct(
    productId: string,
    body: UpdateProductBody,
  ): Promise<Product | SuccessResponse | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );
    return this.handleResponse<Product | SuccessResponse>(response, {
      success: true,
    } as SuccessResponse);
  }

  /**
   * Prepare publication metadata and URL for a portal product and page.
   * Fetches product, portal, and section details step-by-step, gracefully handling failures.
   * Product and portal details are essential for URL generation; sections are optional.
   * @param productId - ID of the product to publish
   * @param preview - Whether this is a preview publish
   * @param tableOfContentsId - Optional table of contents UUID or identifier
   * @returns Publication metadata with optional fields based on what could be fetched
   */
  private async preparePublicationMetadata(
    productId: string,
    preview: boolean,
    tableOfContentsId: string | null,
  ): Promise<{
    publicationUrl: string | null;
    product?: Pick<Product, "id" | "name" | "slug">;
    portal?: Pick<Portal, "id" | "name" | "subdomain" | "customDomain">;
    tableOfContentsItem?: Pick<
      TableOfContentsItem,
      "id" | "slug" | "title" | "order" | "parentId"
    >;
    warning?: {
      step: string;
      message: string;
    };
  }> {
    // Step 1: Fetch product details (required for URL generation)
    let productDetails: Product | null = null;
    try {
      productDetails = await this.getPortalProduct(productId);
    } catch (error) {
      console.warn("Failed to fetch product details:", error);
      return {
        publicationUrl: null,
        warning: {
          step: "product",
          message: `Product published ${preview ? "in preview mode" : "in live mode"} successfully, but failed to fetch product details for URL generation`,
        },
      };
    }

    // Step 2: Fetch portal details (required for URL generation)
    let portalDetails: Portal | null = null;
    if (productDetails?.portalId) {
      try {
        portalDetails = await this.getPortal(String(productDetails.portalId));
      } catch (error) {
        console.warn("Failed to fetch portal details:", error);
      }
    }

    // If we don't have both product and portal, return empty URL only
    if (!portalDetails) {
      return {
        publicationUrl: null,
        product: productDetails
          ? {
              id: productDetails.id,
              name: productDetails.name,
              slug: productDetails.slug,
            }
          : undefined,
        warning: {
          step: "portal",
          message: `Product published ${preview ? "in preview mode" : "in live mode"} successfully, but failed to fetch portal details for URL generation`,
        },
      };
    }

    // Step 3: Fetch sections (optional, for page-specific URLs)
    let sections: SectionsListResponse | null = null;
    try {
      sections = await this.getPortalProductSections(productId, {
        embed: ["tableOfContents", "tableOfContents.swaggerhubApi"],
      });
    } catch (error) {
      console.warn("Failed to fetch sections:", error);
    }

    const targetSection = sections?.items[0] ?? null;

    const targetTocItem =
      tableOfContentsId && targetSection
        ? findTableOfContentsItem(
            targetSection.tableOfContents ?? [],
            tableOfContentsId,
          )
        : null;

    // Build URL with available data (product + portal required, section + toc optional)
    const publicationUrl = buildPortalLiveUrl(
      this.config,
      portalDetails,
      productDetails.slug,
      targetSection,
      targetTocItem,
      preview,
    );

    return {
      publicationUrl,
      product: {
        id: productDetails.id,
        name: productDetails.name,
        slug: productDetails.slug,
      },
      portal: {
        id: portalDetails.id,
        name: portalDetails.name,
        subdomain: portalDetails.subdomain,
        customDomain: portalDetails.customDomain,
      },
      ...(targetTocItem
        ? {
            tableOfContentsItem: {
              id: targetTocItem.id,
              slug: targetTocItem.slug,
              title: targetTocItem.title,
              order: targetTocItem.order,
              parentId: targetTocItem.parentId,
            },
          }
        : {}),
    };
  }

  /**
   * Publish a portal product and generate a published URL with environment-specific domain.
   * The publish operation always succeeds if the API call succeeds. URL generation is done separately and may fail gracefully.
   * Returns `liveUrl` for live publishes and `previewUrl` for preview publishes (null if URL building fails).
   * When metadata/URL building fails, response includes `success: true` (publish succeeded), `liveUrl/previewUrl: null`,
   * and a `warning` object explaining which step failed (product/portal fetch or URL building).
   * @param productId - ID of the product to publish
   * @param preview - Whether to publish in preview mode (default: false)
   * @param tableOfContentsId - Optional table of contents UUID, or identifier in the format 'portal-subdomain:product-slug:section-slug:table-of-contents-slug'
   * @returns Complete publish response with `success: true`, optional URL/metadata, and optional warning details
   */
  async publishPortalProduct(
    productId: string,
    preview: boolean = false,
    tableOfContentsId: string | null = null,
  ): Promise<PublishPortalProductResponse | FallbackResponse> {
    // Execute the publish operation first (primary action)
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}/published-content?preview=${preview}`,
      {
        method: "PUT",
        headers: this.headers,
      },
    );

    const result = await this.handleResponse<SuccessResponse>(response, {
      success: true,
    } as SuccessResponse);

    // Attempt to build metadata and URLs
    try {
      const metadata = await this.preparePublicationMetadata(
        productId,
        preview,
        tableOfContentsId,
      );

      // Build complete response with metadata
      return {
        ...result,
        preview,
        [preview ? "previewUrl" : "liveUrl"]: metadata.publicationUrl,
        ...(metadata.product ? { product: metadata.product } : {}),
        ...(metadata.portal ? { portal: metadata.portal } : {}),
        ...(metadata.tableOfContentsItem
          ? { tableOfContentsItem: metadata.tableOfContentsItem }
          : {}),
        ...(metadata.warning
          ? {
              warning: {
                code: "METADATA_FETCH_FAILED",
                step: metadata.warning.step,
                message: metadata.warning.message,
              },
            }
          : {}),
      } as PublishPortalProductResponse;
    } catch (error) {
      console.warn(
        "Failed to build publication metadata — returning publish success with empty URL:",
        error,
      );

      // Return publish success with null URL field and warning details
      return {
        ...result,
        preview,
        [preview ? "previewUrl" : "liveUrl"]: null,
        warning: {
          code: "METADATA_BUILD_FAILED",
          step: "url_build",
          message: `Product published ${preview ? "in preview mode" : "in live mode"} successfully, but failed to build publication URL`,
        },
      } as PublishPortalProductResponse;
    }
  }

  async getPortalProductSections(
    productId: string,
    params: Omit<GetProductSectionsArgs, "productId">,
  ): Promise<SectionsListResponse> {
    const queryParameters = new URLSearchParams();

    if (params.embed) {
      for (const item of params.embed) {
        queryParameters.append("embed", item);
      }
    }
    if (params.page !== undefined) {
      queryParameters.append("page", params.page.toString());
    }
    if (params.size !== undefined) {
      queryParameters.append("size", params.size.toString());
    }

    const url = `${this.config.portalBasePath}/products/${productId}/sections${queryParameters.toString() ? `?${queryParameters.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const defaultResponse: SectionsListResponse = {
      page: {
        number: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
      },
      items: [],
    };

    const result = await this.handleResponse<SectionsListResponse>(
      response,
      defaultResponse,
    );
    return result as SectionsListResponse;
  }

  /**
   * Create a new table of contents item in a portal product section
   * @param sectionId - Section ID where the table of contents item will be created
   * @param body - Table of contents creation parameters
   * @returns Created table of contents item with metadata
   */
  async createTableOfContents(
    sectionId: string,
    body: CreateTableOfContentsBody,
  ): Promise<CreateTableOfContentsItemResponse> {
    const url = `${this.config.portalBasePath}/sections/${sectionId}/table-of-contents`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub createTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();
    return result as CreateTableOfContentsItemResponse;
  }

  /**
   * Get table of contents for a section
   * @param args - Parameters for retrieving table of contents
   * @returns List of table of contents items
   */
  async getTableOfContents(
    args: GetTableOfContentsArgs,
  ): Promise<TableOfContentsListResponse> {
    const { sectionId, embed, page, size } = args;

    const searchParams = new URLSearchParams();
    if (embed) {
      for (const item of embed) {
        searchParams.append("embed", item);
      }
    }
    if (page !== undefined) {
      searchParams.set("page", page.toString());
    }
    if (size !== undefined) {
      searchParams.set("size", size.toString());
    }

    const url = `${this.config.portalBasePath}/sections/${sectionId}/table-of-contents${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub getTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();

    // The API may return either a raw array or a paginated response with an items array.
    if (Array.isArray(result)) {
      return result as TableOfContentsListResponse;
    }

    return (result.items ?? []) as TableOfContentsListResponse;
  }

  /**
   * Get document content and metadata
   * @param args - Parameters for retrieving document
   * @returns Document with content and metadata
   */
  async getDocument(args: GetDocumentArgs): Promise<Document> {
    const { documentId } = args;

    const url = `${this.config.portalBasePath}/documents/${documentId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub getDocument failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();

    return result as Document;
  }

  /**
   * Update document content
   * @param args - Parameters for updating document
   * @returns Success response
   */
  async updateDocument(args: UpdateDocumentArgs): Promise<SuccessResponse> {
    const { documentId, ...body } = args;

    const url = `${this.config.portalBasePath}/documents/${documentId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub updateDocument failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    return { success: true };
  }

  async createDocumentationPage(
    args: CreateDocumentationPageArgs,
  ): Promise<CreateDocumentationPageResult> {
    const {
      portalId,
      productId,
      pageTitle,
      pageContent,
      contentType = "markdown",
      source = "internal",
      order = 0,
      parentId = null,
    } = args;

    if (
      contentType === "html" &&
      source === "internal" &&
      pageContent !== undefined
    ) {
      throw new ToolError(
        "Cannot create an html + internal page with content via API. Use 'external' source for html, or 'markdown' with 'internal' source.",
      );
    }

    const portal = await this.getPortal(portalId);
    const product = await this.getPortalProduct(productId);
    const productSlug = (product as Record<string, unknown>)?.slug as string;

    const sections = await this.getPortalProductSections(productId, {});

    if (sections.items.length === 0) {
      throw new ToolError(
        `Product ${productId} has no sections. Create a section first before adding documentation pages.`,
      );
    }
    const section = sections.items[0];

    const pageSlug = normalizeSlug(pageTitle);
    const normalizedTitle = pageTitle.slice(0, 255);

    const tocItem = await this.createTableOfContents(section.id, {
      type: "new",
      title: normalizedTitle,
      slug: pageSlug,
      order,
      parentId,
      content: {
        type: contentType,
        source,
      },
    });
    const documentId = tocItem.documentId;

    if (pageContent !== undefined) {
      await this.updateDocument({
        documentId,
        content: pageContent,
        type: contentType,
      });
    }

    const host = portal?.customDomain ?? portal?.subdomain;
    const portalUiDomain = portal?.customDomain
      ? ""
      : this.config.getPortalUiDomainSuffix();
    const draftUrl = `https://${host}${portalUiDomain}/sp-admin/products/${productSlug}/edit/content/${tocItem.id}`;

    return {
      productId,
      sectionId: section.id,
      sectionSlug: section.slug,
      pageDetails: {
        tableOfContentsId: tocItem.id,
        slug: pageSlug,
        title: normalizedTitle,
        content: {
          type: contentType,
          source,
          documentId,
        },
      },
      draftUrl,
    };
  }

  /**
   * Delete table of contents entry
   * @param args - Parameters for deleting table of contents entry
   * @returns Success response
   */
  async deleteTableOfContents(
    args: DeleteTableOfContentsArgs,
  ): Promise<SuccessResponse> {
    const { tableOfContentsId, recursive } = args;

    const searchParams = new URLSearchParams();
    if (recursive !== undefined) {
      searchParams.set("recursive", recursive.toString());
    }

    const url = `${this.config.portalBasePath}/table-of-contents/${tableOfContentsId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub deleteTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    return { success: true };
  }

  /**
   * Helper method for handling responses when error checking is already done.
   * Delegates to parseResponse for the actual parsing logic.
   * @template T - Expected response data type
   * @template D - Default return type
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */

  // Registry API methods for SwaggerHub Design functionality

  /**
   * Search APIs and Domains in SwaggerHub Registry using /specs endpoint
   * @param params Search parameters
   * @returns Array of processed API metadata
   */
  async searchApis(params: ApiSearchParams = {}): Promise<ApiSearchResponse> {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append("query", params.query);
    if (params.state) searchParams.append("state", params.state);
    if (params.tag) searchParams.append("tag", params.tag);
    if (params.offset !== undefined)
      searchParams.append("offset", params.offset.toString());
    if (params.limit !== undefined)
      searchParams.append("limit", params.limit.toString());
    if (params.sort) searchParams.append("sort", params.sort);
    if (params.order) searchParams.append("order", params.order);
    if (params.owner) searchParams.append("owner", params.owner);
    if (params.specType) searchParams.append("specType", params.specType);

    const url = `${this.config.registryBasePath}/specs${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ToolError(
        `SwaggerHub Registry API searchApis failed - status: ${response.status} ${response.statusText}`,
      );
    }

    const apisJsonResponse = (await response.json()) as ApisJsonResponse;

    // Transform APIs.json response to our ApiMetadata format
    return this.transformApisJsonToMetadata(apisJsonResponse.apis);
  }

  /**
   * Transform APIs.json specifications to our ApiMetadata format
   * @param specs Array of API specifications from APIs.json
   * @returns Array of processed API metadata
   */
  private transformApisJsonToMetadata(
    specs: ApiSpecification[],
  ): ApiSearchResponse {
    return specs.map((spec) => {
      // Extract useful properties from the properties array
      const properties = spec.properties || [];
      const getProperty = (type: string) => {
        const property = properties.find((p: ApiProperty) => p.type === type);
        return property?.value || property?.url;
      };

      // Extract owner, name, and version from the Swagger URL using the regex constant
      const swaggerUrl = getProperty("Swagger") || "";
      const urlMatch = RegExp(SWAGGER_URL_REGEX).exec(swaggerUrl);

      return {
        owner: urlMatch?.[2] || "",
        name: spec.name || "",
        description: spec.description || "",
        summary: spec.summary || "",
        version: getProperty("X-Version") || urlMatch?.[4] || "",
        specification: getProperty("X-Specification") || "",
        created: getProperty("X-Created"),
        modified: getProperty("X-Modified"),
        published: getProperty("X-Published"),
        private: getProperty("X-Private"),
        oasVersion: getProperty("X-OASVersion"),
        url: swaggerUrl,
      };
    });
  }

  /**
   * Get API definition from SwaggerHub Registry
   * @param params Parameters including owner, api name, version, and options
   * @param options Optional transport options
   * @returns API definition (OpenAPI/Swagger specification)
   */
  async getApiDefinition(
    params: ApiDefinitionParams,
    options?: { accept?: "text/plain" | "application/json" },
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();

    if (params.resolved !== undefined)
      searchParams.append("resolved", params.resolved.toString());
    if (params.flatten !== undefined)
      searchParams.append("flatten", params.flatten.toString());

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.api)}/${encodeURIComponent(params.version)}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: options?.accept
        ? { ...this.headers, Accept: options.accept }
        : this.headers,
    });

    if (!response.ok) {
      throw new ToolError(
        `SwaggerHub Registry API getApiDefinition failed - status: ${response.status} ${response.statusText}`,
      );
    }

    // Return the raw API definition (could be JSON or YAML)
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    } else {
      return response.text();
    }
  }

  /**
   * Create or Update API in SwaggerHub Registry
   * @param params Parameters for creating or updating the API including owner, name, version, specification, and definition
   * @returns Created or updated API metadata with URL. HTTP 201 indicates creation, HTTP 200 indicates update
   */
  async createOrUpdateApi(params: CreateApiParams): Promise<CreateApiResponse> {
    // Determine the format of the definition
    let contentType: string;
    let requestBody: string;

    // Auto-detect format from the definition content
    const format = this.detectDefinitionFormat(params.definition);

    if (format === "yaml") {
      contentType = "application/yaml";
      requestBody = params.definition; // Send YAML as-is
    } else {
      contentType = "application/json";
      // For JSON, parse and stringify to ensure valid JSON
      try {
        const parsedDefinition = JSON.parse(params.definition);
        requestBody = JSON.stringify(parsedDefinition);
      } catch (error) {
        throw new ToolError(
          `Invalid JSON format in definition: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    // Construct the URL with query parameters
    // Fixed values: visibility=private, automock=false, version=1.0.0
    const searchParams = new URLSearchParams();
    searchParams.append("isPrivate", "true");

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(
      params.owner,
    )}/${encodeURIComponent(params.apiName)}?${searchParams.toString()}`;

    // Use POST method with the appropriate content type
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": contentType,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API createOrUpdateApi failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    // Determine operation type based on HTTP status code
    const operation = response.status === 201 ? "create" : "update";

    // Extract version from X-Version header
    const version = response.headers.get("X-Version") || "1.0.0";

    // Return formatted response with the required fields
    return {
      owner: params.owner,
      apiName: params.apiName,
      version: version,
      url: `${this.config.uiBasePath}/apis/${params.owner}/${params.apiName}/${version}`,
      operation,
    };
  }

  /**
   * Create API from Prompt using SmartBear AI
   * @param params Parameters for creating API from prompt including owner, api name, prompt, and specification type
   * @returns Created API metadata with URL. HTTP 201 indicates creation, HTTP 200 for update, HTTP 205 for reload
   */
  async createApiFromPrompt(
    params: CreateApiFromPromptParams,
  ): Promise<CreateApiFromPromptResponse> {
    // Construct the URL with query parameters
    const searchParams = new URLSearchParams();
    const specType = params.specType ?? "openapi30x";
    searchParams.append("specType", specType);

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(
      params.owner,
    )}/${encodeURIComponent(params.apiName)}/.ai?${searchParams.toString()}`;

    // Use POST method with JSON body containing the prompt
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.prompt),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API createApiFromPrompt failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    // Determine operation type based on HTTP status code
    // 201 = new API created, 200 = existing API updated, 205 = API saved and should be reloaded
    const operation = response.status === 201 ? "create" : "update";

    // Extract version from X-Version header
    const version = response.headers.get("X-Version");

    // Return formatted response with the required fields
    return {
      owner: params.owner,
      apiName: params.apiName,
      specType: specType,
      version: version || undefined,
      url: version
        ? `${this.config.uiBasePath}/apis/${params.owner}/${params.apiName}/${version}`
        : `${this.config.uiBasePath}/apis/${params.owner}/${params.apiName}`,
      operation,
    };
  }

  /**
   * Auto-detect the format of an API definition string
   * @param definition The API definition content
   * @returns 'json' or 'yaml'
   */
  private detectDefinitionFormat(definition: string): "json" | "yaml" {
    const trimmed = definition.trim();
    if (!trimmed) {
      throw new ToolError("Empty definition content provided");
    }

    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "yaml";
    }
  }

  /**
   * Run a standardization scan against an API definition
   * @param params Parameters including organization name and API definition
   * @returns Standardization result with validation errors
   */
  async scanStandardization(
    params: ScanStandardizationParams,
  ): Promise<StandardizationResult | FallbackResponse> {
    // Auto-detect format from the definition content
    const format = this.detectDefinitionFormat(params.definition);

    let contentType: string;
    let requestBody: string;

    if (format === "yaml") {
      contentType = "application/yaml";
      requestBody = params.definition; // Send YAML as-is
    } else {
      contentType = "application/json";
      // For JSON, parse and stringify to ensure valid JSON
      try {
        const parsedDefinition = JSON.parse(params.definition);
        requestBody = JSON.stringify(parsedDefinition);
      } catch (error) {
        throw new ToolError(
          `Invalid JSON format in definition: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    const url = `${this.config.registryBasePath}/standardization/${encodeURIComponent(
      params.orgName,
    )}/scan`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": contentType,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API scanStandardization failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    const results =
      await this.handleResponse<StandardizationScanApiResponse>(response);

    if (isStandardizationResult(results)) {
      const errors = results.validation ?? [];
      const countsBySeverity: Record<string, number> = {};
      for (const error of errors) {
        const severity = error.severity ?? "Unknown";
        countsBySeverity[severity] = (countsBySeverity[severity] ?? 0) + 1;
      }

      return { ...results, count: errors.length, countsBySeverity };
    }
    return results;
  }

  /**
   * Fetch an API definition from the registry and run a standardization scan
   * @param params Parameters including organization name, API name, and version
   * @returns Scan results with total count and counts grouped by severity
   */
  async scanApiStandardizationFromRegistry(
    params: ScanApiStandardizationFromRegistryParams,
  ): Promise<ScanApiStandardizationFromRegistryResult | FallbackResponse> {
    const definition = await this.getApiDefinition(
      {
        owner: params.orgName,
        api: params.apiName,
        version: params.version,
      },
      { accept: "text/plain" },
    );

    const results = await this.scanStandardization({
      orgName: params.orgName,
      definition: definition as string,
    });

    if (isStandardizationResult(results)) {
      return {
        ...results,
        url: `${this.config.uiBasePath}/apis/${params.orgName}/${params.apiName}/${params.version}`,
      };
    }
    return results;
  }

  /**
   * Standardize and fix an API definition using AI
   * @param params Parameters including owner, API name, version, and optional newVersion
   * @returns Standardization response with status and fixed definition
   */
  async standardizeApi(
    params: StandardizeApiParams,
  ): Promise<StandardizeApiResponse> {
    const searchParams = new URLSearchParams();
    if (params.newVersion) searchParams.set("newVersion", params.newVersion);
    const queryString = searchParams.toString();
    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(
      params.owner,
    )}/${encodeURIComponent(params.api)}/${encodeURIComponent(
      params.version,
    )}/standardize${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API standardizeApi failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    const result = await this.handleResponse<StandardizeApiResponse>(response);

    if (!hasMessage(result)) {
      throw new ToolError(
        "Unexpected response format from standardizeApi endpoint",
      );
    }

    if (!hasErrorsFound(result)) {
      return { ...result, errorsFound: 0 } as StandardizeApiResponse;
    }

    return result as StandardizeApiResponse;
  }
}
