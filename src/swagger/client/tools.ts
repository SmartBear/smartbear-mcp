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
  DocumentOutputSchema,
  GetDocumentArgsSchema,
  GetProductSectionsArgsSchema,
  GetTableOfContentsArgsSchema,
  PortalArgsSchema,
  PortalListOutputSchema,
  PortalOutputSchema,
  ProductArgsSchema,
  ProductListOutputSchema,
  ProductOutputSchema,
  PublishProductArgsSchema,
  SectionListOutputSchema,
  SuccessOutputSchema,
  TableOfContentsItemOutputSchema,
  TableOfContentsListOutputSchema,
  UpdateDocumentArgsSchema,
  UpdatePortalArgsSchema,
  UpdateProductArgsSchema,
} from "./portal-types";
import {
  ApiDefinitionOutputSchema,
  ApiDefinitionParamsSchema,
  ApiSearchOutputSchema,
  ApiSearchParamsSchema,
  CreateApiFromPromptOutputSchema,
  CreateApiFromPromptParamsSchema,
  CreateApiOutputSchema,
  CreateApiParamsSchema,
  ScanApiStandardizationFromRegistryParamsSchema,
  ScanStandardizationParamsSchema,
  StandardizeApiOutputSchema,
  StandardizeApiParamsSchema,
} from "./registry-types";
import {
  OrganizationsListOutputSchema,
  OrganizationsQuerySchema,
} from "./user-management-types";

export interface SwaggerToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}

export const READ_ONLY = {
  readOnly: true,
  destructive: false,
  openWorld: false,
} as const;

const MUTATING = {
  readOnly: false,
  destructive: false,
  openWorld: true,
} as const;

const DELETING = {
  readOnly: false,
  destructive: true,
  openWorld: true,
} as const;

export const TOOLS: SwaggerToolParams[] = [
  {
    title: "List Portals",
    toolset: "Portals",
    summary:
      "Search for available portals within Swagger. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
    ...READ_ONLY,
    handler: "getPortals",
    outputSchema: PortalListOutputSchema,
  },
  {
    title: "Create Portal",
    toolset: "Portals",
    summary: "Create a new portal within Swagger.",
    ...MUTATING,
    inputSchema: CreatePortalArgsSchema,
    handler: "createPortal",
    outputSchema: PortalOutputSchema,
  },
  {
    title: "Get Portal",
    toolset: "Portals",
    summary: "Retrieve information about a specific portal.",
    ...READ_ONLY,
    inputSchema: PortalArgsSchema,
    handler: "getPortal",
    outputSchema: PortalOutputSchema,
  },
  {
    title: "Update Portal",
    toolset: "Portals",
    summary: "Update a specific portal's configuration.",
    ...MUTATING,
    inputSchema: UpdatePortalArgsSchema,
    handler: "updatePortal",
    outputSchema: PortalOutputSchema,
  },
  {
    title: "List Portal Products",
    toolset: "Products",
    summary: "Get products for a specific portal that match your criteria.",
    ...READ_ONLY,
    inputSchema: PortalArgsSchema,
    handler: "getPortalProducts",
    outputSchema: ProductListOutputSchema,
  },
  {
    title: "Create Portal Product",
    toolset: "Products",
    summary: "Create a new product for a specific portal.",
    ...MUTATING,
    inputSchema: CreateProductArgsSchema,
    handler: "createPortalProduct",
    outputSchema: ProductOutputSchema,
  },
  {
    title: "Get Portal Product",
    toolset: "Products",
    summary: "Retrieve information about a specific product resource.",
    ...READ_ONLY,
    inputSchema: ProductArgsSchema,
    handler: "getPortalProduct",
    outputSchema: ProductOutputSchema,
  },
  {
    title: "Delete Portal Product",
    toolset: "Products",
    summary: "Delete a product from a specific portal",
    ...DELETING,
    inputSchema: ProductArgsSchema,
    handler: "deletePortalProduct",
    formatResponse: () => "Product deleted successfully.",
    outputSchema: SuccessOutputSchema,
  },
  {
    title: "Update Portal Product",
    toolset: "Products",
    summary: "Update a product's settings within a specific portal.",
    ...MUTATING,
    inputSchema: UpdateProductArgsSchema,
    handler: "updatePortalProduct",
    outputSchema: ProductOutputSchema,
  },
  {
    title: "Publish Portal Product",
    toolset: "Products",
    summary:
      "Publish a product's content to make it live or as preview. This endpoint publishes the current content of a product, making it visible to portal visitors. Use preview mode to test before going live. Optionally provide `tableOfContentsId` to get a page-specific URL. Returns publication status, a live or preview URL (null if URL building fails), product and portal metadata, and an optional `warning` when metadata/URL building failed — a warning does NOT mean the publish failed.",
    ...MUTATING,
    inputSchema: PublishProductArgsSchema,
    handler: "publishPortalProduct",
    outputSchema: SuccessOutputSchema,
  },
  {
    title: "List Portal Product Sections",
    toolset: "Sections",
    summary: "Get sections for a specific product within a portal.",
    ...READ_ONLY,
    inputSchema: GetProductSectionsArgsSchema,
    handler: "getPortalProductSections",
    outputSchema: SectionListOutputSchema,
  },
  {
    title: "Create Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.",
    ...MUTATING,
    inputSchema: CreateTableOfContentsArgsSchema,
    handler: "createTableOfContents",
    outputSchema: TableOfContentsItemOutputSchema,
  },
  {
    title: "List Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Get table of contents for a section of a product within a portal.",
    ...READ_ONLY,
    inputSchema: GetTableOfContentsArgsSchema,
    handler: "getTableOfContents",
    outputSchema: TableOfContentsListOutputSchema,
  },
  {
    title: "Delete Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.",
    ...DELETING,
    inputSchema: DeleteTableOfContentsArgsSchema,
    handler: "deleteTableOfContents",
    outputSchema: SuccessOutputSchema,
  },

  // Document management tools
  {
    title: "Get Document",
    toolset: "Documents",
    summary:
      "Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.",
    ...READ_ONLY,
    inputSchema: GetDocumentArgsSchema,
    handler: "getDocument",
    outputSchema: DocumentOutputSchema,
  },
  {
    title: "Update Document",
    toolset: "Documents",
    summary:
      "Update the content or source of an existing document. Supports both HTML and Markdown content types.",
    ...MUTATING,
    inputSchema: UpdateDocumentArgsSchema,
    handler: "updateDocument",
    outputSchema: SuccessOutputSchema,
  },

  // Registry API tools for SwaggerHub Design functionality
  {
    title: "Search APIs and Domains",
    toolset: "Registry API",
    summary:
      "Search for APIs and Domains in SwaggerHub Registry using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.",
    ...READ_ONLY,
    inputSchema: ApiSearchParamsSchema,
    handler: "searchApis",
    outputSchema: ApiSearchOutputSchema,
  },
  {
    title: "Get API Definition",
    toolset: "Registry API",
    summary:
      "Fetch resolved API definition from SwaggerHub Registry based on owner, API name, and version.",
    ...READ_ONLY,
    inputSchema: ApiDefinitionParamsSchema,
    handler: "getApiDefinition",
    outputSchema: ApiDefinitionOutputSchema,
  },
  {
    title: "Create or Update API",
    toolset: "Registry API",
    summary:
      "Create a new API or update an existing API in SwaggerHub Registry for Swagger Studio. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    ...MUTATING,
    inputSchema: CreateApiParamsSchema,
    handler: "createOrUpdateApi",
    outputSchema: CreateApiOutputSchema,
  },
  // User Management API tools for organization management functionality
  {
    title: "List Organizations",
    toolset: "Registry API",
    summary:
      "Get organizations for a user. Returns a list of organizations that the authenticating user is a member of. On-Premise admin gets a list of all organizations in the system.",
    ...READ_ONLY,
    inputSchema: OrganizationsQuerySchema,
    handler: "getOrganizations",
    outputSchema: OrganizationsListOutputSchema,
  },
  {
    title: "Scan API Standardization",
    toolset: "Registry API",
    summary:
      "Run a standardization scan against an API definition using the organization's governance and standardization rules. Accepts a raw YAML or JSON OpenAPI/AsyncAPI definition and returns a list of validation errors, the total issue count, and counts grouped by severity. Use this tool when the user provides the API definition content directly (as raw YAML or JSON) and asks to validate, scan, or check the governance or standardization of the API.",
    ...READ_ONLY,
    inputSchema: ScanStandardizationParamsSchema,
    handler: "scanStandardization",
  },
  {
    title: "Scan API Standardization from Registry",
    toolset: "Registry API",
    summary:
      "Run a standardization scan on an API that already exists in SwaggerHub Registry, identified by organization name, API name, and version. Fetches the API definition from the registry internally and scans it against the organization's governance and standardization rules. Returns a list of validation errors, total issue count, counts grouped by severity, and a SwaggerHub UI URL for the scanned API. Use this tool when the user identifies the API by org name, API name, and version and asks to validate, scan, or check the governance or standardization of an existing API.",
    ...READ_ONLY,
    inputSchema: ScanApiStandardizationFromRegistryParamsSchema,
    handler: "scanApiStandardizationFromRegistry",
  },
  {
    title: "Create API from Prompt",
    toolset: "Registry API",
    summary:
      "Generate and save an API definition based on a prompt using SmartBear AI. This tool automatically applies organization governance and standardization rules during API generation. The specType parameter determines the format of the generated definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x, 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x. Use this tool when creating APIs that comply with governance policies or when generating APIs from natural language descriptions. Use this tool when users ask to create, generate, or design APIs with governance or standardization requirements. Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    ...MUTATING,
    inputSchema: CreateApiFromPromptParamsSchema,
    handler: "createApiFromPrompt",
    outputSchema: CreateApiFromPromptOutputSchema,
  },
  {
    title: "Standardize API",
    toolset: "Registry API",
    summary:
      "Standardize and fix an API definition using AI to ensure compliance with governance policies. Scans the API definition for standardization errors and automatically fixes them using SmartBear AI. Optionally provide 'newVersion' (e.g. patch bump '1.0.0' → '1.0.1') to save the fixed definition as a new version — omitting it will overwrite the current version. Returns the number of errors found and the fixed definition if successful. Use this tool when users ask to standardize, fix, govern, or ensure governance compliance of APIs.",
    ...MUTATING,
    inputSchema: StandardizeApiParamsSchema,
    handler: "standardizeApi",
    outputSchema: StandardizeApiOutputSchema,
  },

  ...FUNCTIONAL_TESTING_TOOLS,
];
