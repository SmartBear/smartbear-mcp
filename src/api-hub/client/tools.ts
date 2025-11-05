/**
 * TOOLS
 *
 * Defines tool configurations for API Hub operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import type { ToolParams } from "../../common/types.js";
import {
  CreatePortalArgsSchema,
  CreateProductArgsSchema,
  CreateTableOfContentsArgsSchema,
  DeleteDocumentArgsSchema,
  DeleteTableOfContentsArgsSchema,
  GetDocumentArgsSchema,
  GetProductSectionsArgsSchema,
  GetTableOfContentsArgsSchema,
  PortalArgsSchema,
  ProductArgsSchema,
  PublishProductArgsSchema,
  UpdateDocumentArgsSchema,
  UpdatePortalArgsSchema,
  UpdateProductArgsSchema,
} from "./portal-types.js";
import {
  ApiDefinitionParamsSchema,
  ApiSearchParamsSchema,
  CreateApiFromTemplateParamsSchema,
  CreateApiParamsSchema,
  ScanStandardizationParamsSchema,
} from "./registry-types.js";
import { OrganizationsQuerySchema } from "./user-management-types.js";

export interface ApiHubToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}

export const TOOLS: ApiHubToolParams[] = [
  {
    title: "List Portals",
    summary:
      "Search for available portals within API Hub. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
    parameters: [],
    handler: "getPortals",
  },
  {
    title: "Create Portal",
    summary: "Create a new portal within API Hub.",
    inputSchema: CreatePortalArgsSchema,
    handler: "createPortal",
  },
  {
    title: "Get Portal",
    summary: "Retrieve information about a specific portal.",
    inputSchema: PortalArgsSchema,
    handler: "getPortal",
  },
  {
    title: "Delete Portal",
    summary: "Delete a specific portal.",
    inputSchema: PortalArgsSchema,
    handler: "deletePortal",
    formatResponse: () => "Portal deleted successfully.",
  },
  {
    title: "Update Portal",
    summary: "Update a specific portal's configuration.",
    inputSchema: UpdatePortalArgsSchema,
    handler: "updatePortal",
  },
  {
    title: "List Portal Products",
    summary: "Get products for a specific portal that match your criteria.",
    inputSchema: PortalArgsSchema,
    handler: "getPortalProducts",
  },
  {
    title: "Create Portal Product",
    summary: "Create a new product for a specific portal.",
    inputSchema: CreateProductArgsSchema,
    handler: "createPortalProduct",
  },
  {
    title: "Get Portal Product",
    summary: "Retrieve information about a specific product resource.",
    inputSchema: ProductArgsSchema,
    handler: "getPortalProduct",
  },
  {
    title: "Delete Portal Product",
    summary: "Delete a product from a specific portal",
    inputSchema: ProductArgsSchema,
    handler: "deletePortalProduct",
    formatResponse: () => "Product deleted successfully.",
  },
  {
    title: "Update Portal Product",
    summary: "Update a product's settings within a specific portal.",
    inputSchema: UpdateProductArgsSchema,
    handler: "updatePortalProduct",
  },
  {
    title: "Publish Portal Product",
    summary:
      "Publish a product's content to make it live or as preview. This endpoint publishes the current content of a product, making it visible to portal visitors. Use preview mode to test before going live.",
    inputSchema: PublishProductArgsSchema,
    handler: "publishPortalProduct",
  },
  {
    title: "List Portal Product Sections",
    summary: "Get sections for a specific product within a portal.",
    inputSchema: GetProductSectionsArgsSchema,
    handler: "getPortalProductSections",
  },
  {
    title: "Create Table Of Contents",
    summary:
      "Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.",
    inputSchema: CreateTableOfContentsArgsSchema,
    handler: "createTableOfContents",
  },
  {
    title: "List Table Of Contents",
    summary:
      "Get table of contents for a section of a product within a portal.",
    inputSchema: GetTableOfContentsArgsSchema,
    handler: "getTableOfContents",
  },
  {
    title: "Delete Table Of Contents",
    summary:
      "Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.",
    inputSchema: DeleteTableOfContentsArgsSchema,
    handler: "deleteTableOfContents",
  },

  // Document management tools
  {
    title: "Get Document",
    summary:
      "Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.",
    inputSchema: GetDocumentArgsSchema,
    handler: "getDocument",
  },
  {
    title: "Update Document",
    summary:
      "Update the content of an existing document. Supports both HTML and Markdown content types.",
    inputSchema: UpdateDocumentArgsSchema,
    handler: "updateDocument",
  },
  {
    title: "Delete Document",
    summary:
      "Delete a document by its ID. This will permanently remove the document content.",
    inputSchema: DeleteDocumentArgsSchema,
    handler: "deleteDocument",
  },

  // Registry API tools for SwaggerHub Design functionality
  {
    title: "Search APIs and Domains",
    summary:
      "Search for APIs and Domains in SwaggerHub Registry using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.",
    inputSchema: ApiSearchParamsSchema,
    handler: "searchApis",
  },
  {
    title: "Get API Definition",
    summary:
      "Fetch resolved API definition from SwaggerHub Registry based on owner, API name, and version.",
    inputSchema: ApiDefinitionParamsSchema,
    handler: "getApiDefinition",
  },
  {
    title: "Create or Update API",
    summary:
      "Create a new API or update an existing API in SwaggerHub Registry for API Hub for Design. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiParamsSchema,
    handler: "createOrUpdateApi",
  },
  {
    title: "Create API from Template",
    summary:
      "Create a new API in SwaggerHub Registry using a predefined template. This endpoint creates APIs based on existing templates without requiring manual definition content. APIs are always created with fixed values: private visibility, no project assignment, and reconciliation enabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field and API details with SwaggerHub URL.",
    inputSchema: CreateApiFromTemplateParamsSchema,
    handler: "createApiFromTemplate",
  },
  // User Management API tools for organization management functionality
  {
    title: "List Organizations",
    summary:
      "Get organizations for a user. Returns a list of organizations that the authenticating user is a member of. On-Premise admin gets a list of all organizations in the system.",
    inputSchema: OrganizationsQuerySchema,
    handler: "getOrganizations",
  },
  {
    title: "Scan API Standardization",
    summary:
      "Run a standardization scan against an API definition using the organization's standardization configuration. Accepts a YAML or JSON OpenAPI/AsyncAPI definition and returns a list of standardization errors and validation issues.",
    inputSchema: ScanStandardizationParamsSchema,
    handler: "scanStandardization",
  },
];
