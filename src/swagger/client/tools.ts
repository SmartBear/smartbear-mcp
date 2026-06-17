/**
 * TOOLS
 *
 * Defines tool configurations for Swagger operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import type { ToolParams } from "../../common/types";
import { FUNCTIONAL_TESTING_TOOLS } from "./functional-testing-tools";
import {
  CreatePortalArgsSchema,
  CreateProductArgsSchema,
  CreateTableOfContentsArgsSchema,
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
} from "./portal-types";
import {
  ApiDefinitionParamsSchema,
  ApiSearchParamsSchema,
  CreateApiFromPromptParamsSchema,
  CreateApiParamsSchema,
  ScanApiStandardizationFromRegistryParamsSchema,
  ScanStandardizationParamsSchema,
  StandardizeApiParamsSchema,
} from "./registry-types";
import { OrganizationsQuerySchema } from "./user-management-types";

export interface SwaggerToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}

export const TOOLS: SwaggerToolParams[] = [
  {
    title: "List Portals",
    toolset: "Portals",
    summary:
      "Search for available portals within Swagger. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
    handler: "getPortals",
  },
  {
    title: "Create Portal",
    toolset: "Portals",
    summary: "Create a new portal within Swagger.",
    inputSchema: CreatePortalArgsSchema,
    handler: "createPortal",
  },
  {
    title: "Get Portal",
    toolset: "Portals",
    summary: "Retrieve information about a specific portal.",
    inputSchema: PortalArgsSchema,
    handler: "getPortal",
  },
  {
    title: "Update Portal",
    toolset: "Portals",
    summary: "Update a specific portal's configuration.",
    inputSchema: UpdatePortalArgsSchema,
    handler: "updatePortal",
  },
  {
    title: "List Portal Products",
    toolset: "Products",
    summary: "Get products for a specific portal that match your criteria.",
    inputSchema: PortalArgsSchema,
    handler: "getPortalProducts",
  },
  {
    title: "Create Portal Product",
    toolset: "Products",
    summary: "Create a new product for a specific portal.",
    inputSchema: CreateProductArgsSchema,
    handler: "createPortalProduct",
  },
  {
    title: "Get Portal Product",
    toolset: "Products",
    summary: "Retrieve information about a specific product resource.",
    inputSchema: ProductArgsSchema,
    handler: "getPortalProduct",
  },
  {
    title: "Delete Portal Product",
    toolset: "Products",
    summary: "Delete a product from a specific portal",
    inputSchema: ProductArgsSchema,
    handler: "deletePortalProduct",
    formatResponse: () => "Product deleted successfully.",
  },
  {
    title: "Update Portal Product",
    toolset: "Products",
    summary: "Update a product's settings within a specific portal.",
    inputSchema: UpdateProductArgsSchema,
    handler: "updatePortalProduct",
  },
  {
    title: "Publish Portal Product",
    toolset: "Products",
    summary:
      "Publish a product's content to make it live or as preview. This endpoint publishes the current content of a product, making it visible to portal visitors. Use preview mode to test before going live. Optionally provide tableOfContentsId to get a live or preview URL pointing to a specific page. Returns publication status, a live or preview URL, and metadata for the product and portal.",
    inputSchema: PublishProductArgsSchema,
    handler: "publishPortalProduct",
  },
  {
    title: "List Portal Product Sections",
    toolset: "Sections",
    summary: "Get sections for a specific product within a portal.",
    inputSchema: GetProductSectionsArgsSchema,
    handler: "getPortalProductSections",
  },
  {
    title: "Create Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.",
    inputSchema: CreateTableOfContentsArgsSchema,
    handler: "createTableOfContents",
  },
  {
    title: "List Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Get table of contents for a section of a product within a portal.",
    inputSchema: GetTableOfContentsArgsSchema,
    handler: "getTableOfContents",
  },
  {
    title: "Delete Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.",
    inputSchema: DeleteTableOfContentsArgsSchema,
    handler: "deleteTableOfContents",
  },

  // Document management tools
  {
    title: "Get Document",
    toolset: "Documents",
    summary:
      "Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.",
    inputSchema: GetDocumentArgsSchema,
    handler: "getDocument",
  },
  {
    title: "Update Document",
    toolset: "Documents",
    summary:
      "Update the content or source of an existing document. Supports both HTML and Markdown content types.",
    inputSchema: UpdateDocumentArgsSchema,
    handler: "updateDocument",
  },

  // Registry API tools for SwaggerHub Design functionality
  {
    title: "Search APIs and Domains",
    toolset: "Registry API",
    summary:
      "Search for APIs and Domains in SwaggerHub Registry using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.",
    inputSchema: ApiSearchParamsSchema,
    handler: "searchApis",
  },
  {
    title: "Get API Definition",
    toolset: "Registry API",
    summary:
      "Fetch resolved API definition from SwaggerHub Registry based on owner, API name, and version.",
    inputSchema: ApiDefinitionParamsSchema,
    handler: "getApiDefinition",
  },
  {
    title: "Create or Update API",
    toolset: "Registry API",
    summary:
      "Create a new API or update an existing API in SwaggerHub Registry for Swagger Studio. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiParamsSchema,
    handler: "createOrUpdateApi",
  },
  // User Management API tools for organization management functionality
  {
    title: "List Organizations",
    toolset: "Registry API",
    summary:
      "Get organizations for a user. Returns a list of organizations that the authenticating user is a member of. On-Premise admin gets a list of all organizations in the system.",
    inputSchema: OrganizationsQuerySchema,
    handler: "getOrganizations",
  },
  {
    title: "Scan API Standardization",
    toolset: "Registry API",
    summary:
      "Run a standardization scan against an API definition using the organization's governance and standardization rules. Accepts a raw YAML or JSON OpenAPI/AsyncAPI definition and returns a list of validation errors, the total issue count, and counts grouped by severity. Use this tool when the user provides the API definition content directly (as raw YAML or JSON) and asks to validate, scan, or check the governance or standardization of the API.",
    inputSchema: ScanStandardizationParamsSchema,
    handler: "scanStandardization",
  },
  {
    title: "Scan API Standardization from Registry",
    toolset: "Registry API",
    summary:
      "Run a standardization scan on an API that already exists in SwaggerHub Registry, identified by organization name, API name, and version. Fetches the API definition from the registry internally and scans it against the organization's governance and standardization rules. Returns a list of validation errors, total issue count, counts grouped by severity, and a SwaggerHub UI URL for the scanned API. Use this tool when the user identifies the API by org name, API name, and version and asks to validate, scan, or check the governance or standardization of an existing API.",
    inputSchema: ScanApiStandardizationFromRegistryParamsSchema,
    handler: "scanApiStandardizationFromRegistry",
  },
  {
    title: "Create API from Prompt",
    toolset: "Registry API",
    summary:
      "Generate and save an API definition based on a prompt using SmartBear AI. This tool automatically applies organization governance and standardization rules during API generation. The specType parameter determines the format of the generated definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x, 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x. Use this tool when creating APIs that comply with governance policies or when generating APIs from natural language descriptions. Use this tool when users ask to create, generate, or design APIs with governance or standardization requirements. Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiFromPromptParamsSchema,
    handler: "createApiFromPrompt",
  },
  {
    title: "Standardize API",
    toolset: "Registry API",
    summary:
      "Standardize and fix an API definition using AI to ensure compliance with governance policies. Scans the API definition for standardization errors and automatically fixes them using SmartBear AI. Optionally provide 'newVersion' (e.g. patch bump '1.0.0' → '1.0.1') to save the fixed definition as a new version — omitting it will overwrite the current version. Returns the number of errors found and the fixed definition if successful. Use this tool when users ask to standardize, fix, govern, or ensure governance compliance of APIs.",
    inputSchema: StandardizeApiParamsSchema,
    handler: "standardizeApi",
  },

  ...FUNCTIONAL_TESTING_TOOLS,
];
