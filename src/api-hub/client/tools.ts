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
  UpdateDocumentArgsSchema,
  UpdatePortalArgsSchema,
  UpdateProductArgsSchema,
} from "./portal-types.js";
import {
  ApiDefinitionParamsSchema,
  ApiSearchParamsSchema,
  CreateApiFromTemplateParamsSchema,
  CreateApiParamsSchema,
} from "./registry-types.js";

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
    zodSchema: CreatePortalArgsSchema,
    handler: "createPortal",
  },
  {
    title: "Get Portal",
    summary: "Retrieve information about a specific portal.",
    zodSchema: PortalArgsSchema,
    handler: "getPortal",
  },
  {
    title: "Delete Portal",
    summary: "Delete a specific portal.",
    zodSchema: PortalArgsSchema,
    handler: "deletePortal",
    formatResponse: () => "Portal deleted successfully.",
  },
  {
    title: "Update Portal",
    summary: "Update a specific portal's configuration.",
    zodSchema: UpdatePortalArgsSchema,
    handler: "updatePortal",
  },
  {
    title: "List Portal Products",
    summary: "Get products for a specific portal that match your criteria.",
    zodSchema: PortalArgsSchema,
    handler: "getPortalProducts",
  },
  {
    title: "Create Portal Product",
    summary: "Create a new product for a specific portal.",
    zodSchema: CreateProductArgsSchema,
    handler: "createPortalProduct",
  },
  {
    title: "Get Portal Product",
    summary: "Retrieve information about a specific product resource.",
    zodSchema: ProductArgsSchema,
    handler: "getPortalProduct",
  },
  {
    title: "Delete Portal Product",
    summary: "Delete a product from a specific portal",
    zodSchema: ProductArgsSchema,
    handler: "deletePortalProduct",
    formatResponse: () => "Product deleted successfully.",
  },
  {
    title: "Update Portal Product",
    summary: "Update a product's settings within a specific portal.",
    zodSchema: UpdateProductArgsSchema,
    handler: "updatePortalProduct",
  },
  {
    title: "List Portal Product Sections",
    summary: "Get sections for a specific product within a portal.",
    zodSchema: GetProductSectionsArgsSchema,
    handler: "getPortalProductSections",
  },
  {
    title: "Create Table Of Contents",
    summary: "Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.",
    zodSchema: CreateTableOfContentsArgsSchema,
    handler: "createTableOfContents",
  },
  {
    title: "List Table Of Contents",
    summary: "Get table of contents for a section of a product within a portal.",
    zodSchema: GetTableOfContentsArgsSchema,
    handler: "getTableOfContents",
  },
  {
    title: "Delete Table Of Contents",
    summary: "Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.",
    zodSchema: DeleteTableOfContentsArgsSchema,
    handler: "deleteTableOfContents",
  },
  
  // Document management tools
  {
    title: "Get Document",
    summary: "Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.",
    zodSchema: GetDocumentArgsSchema,
    handler: "getDocument",
  },
  {
    title: "Update Document",
    summary: "Update the content of an existing document. Supports both HTML and Markdown content types.",
    zodSchema: UpdateDocumentArgsSchema,
    handler: "updateDocument",
  },
  {
    title: "Delete Document",
    summary: "Delete a document by its ID. This will permanently remove the document content.",
    zodSchema: DeleteDocumentArgsSchema,
    handler: "deleteDocument",
  },
  
  // Registry API tools for SwaggerHub Design functionality
  {
    title: "Search APIs and Domains",
    summary:
      "Search for APIs and Domains in SwaggerHub Registry using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.",
    zodSchema: ApiSearchParamsSchema,
    handler: "searchApis",
  },
  {
    title: "Get API Definition",
    summary:
      "Fetch resolved API definition from SwaggerHub Registry based on owner, API name, and version.",
    zodSchema: ApiDefinitionParamsSchema,
    handler: "getApiDefinition",
  },
  {
    title: "Create or Update API",
    summary:
      "Create a new API or update an existing API in SwaggerHub Registry for API Hub for Design. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    zodSchema: CreateApiParamsSchema,
    handler: "createOrUpdateApi",
  },
  {
    title: "Create API from Template",
    summary:
      "Create a new API in SwaggerHub Registry using a predefined template. This endpoint creates APIs based on existing templates without requiring manual definition content. APIs are always created with fixed values: private visibility, no project assignment, and reconciliation enabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field and API details with SwaggerHub URL.",
    zodSchema: CreateApiFromTemplateParamsSchema,
    handler: "createApiFromTemplate",
  },
  // Core API tools for apihub-core functionality
  {
    title: "List Organizations",
    summary:
      "Search for available organizations within API Hub. Only organizations to which you have access are returned.",
    parameters: [],
    handler: "getOrganizations",
  },
];
