/**
 * TOOLS
 *
 * Defines tool configurations for Swagger operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import type { ToolParams } from "../../common/types.ts";
import { FUNCTIONAL_TESTING_TOOLS } from "./functional-testing-tools.ts";
import {
  CreateDocPageOutputSchema,
  CreateDocumentationPageArgsSchema,
  CreatePortalArgsSchema,
  CreateProductArgsSchema,
  CreateTableOfContentsArgsSchema,
  CreateTocOutputSchema,
  DeleteProductOutputSchema,
  DeleteTableOfContentsArgsSchema,
  DeleteTableOfContentsOutputSchema,
  DocumentOutputSchema,
  GetDocumentArgsSchema,
  GetProductSectionsArgsSchema,
  GetTableOfContentsArgsSchema,
  PortalArgsSchema,
  PortalOutputSchema,
  PortalsListOutputSchema,
  ProductArgsSchema,
  ProductOutputSchema,
  ProductsListOutputSchema,
  PublishOutputSchema,
  PublishProductArgsSchema,
  ResolveOrganizationPortalArgsSchema,
  ResolvePortalOutputSchema,
  SectionsListOutputSchema,
  TocListOutputSchema,
  UpdateDocumentArgsSchema,
  UpdatePortalArgsSchema,
  UpdateProductArgsSchema,
} from "./portal-types.ts";
import {
  ApiDefinitionOutputSchema,
  ApiDefinitionParamsSchema,
  ApiSearchParamsSchema,
  CreateApiFromPromptOutputSchema,
  CreateApiFromPromptParamsSchema,
  CreateApiOutputSchema,
  CreateApiParamsSchema,
  ScanApiStandardizationFromRegistryParamsSchema,
  ScanFromRegistryOutputSchema,
  ScanOutputSchema,
  ScanStandardizationParamsSchema,
  SearchApisOutputSchema,
  StandardizeApiParamsSchema,
  StandardizeOutputSchema,
} from "./registry-types.ts";
import { READ_ONLY, WRITE, WRITE_DESTRUCTIVE } from "./tool-constants.ts";
import {
  OrganizationsListOutputSchema,
  OrganizationsQuerySchema,
} from "./user-management-types.ts";

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
    outputSchema: PortalsListOutputSchema,
    handler: "getPortals",
    ...READ_ONLY,
  },
  {
    title: "Create Portal",
    toolset: "Portals",
    summary: "Create a new portal within Swagger.",
    inputSchema: CreatePortalArgsSchema,
    outputSchema: PortalOutputSchema,
    handler: "createPortal",
    ...WRITE,
  },
  {
    title: "Get Portal",
    toolset: "Portals",
    summary: "Retrieve information about a specific portal.",
    inputSchema: PortalArgsSchema,
    outputSchema: PortalOutputSchema,
    handler: "getPortal",
    ...READ_ONLY,
  },
  {
    title: "Update Portal",
    toolset: "Portals",
    summary: "Update a specific portal's configuration.",
    inputSchema: UpdatePortalArgsSchema,
    outputSchema: PortalOutputSchema,
    handler: "updatePortal",
    ...WRITE_DESTRUCTIVE,
  },
  {
    title: "Resolve Organization Portal",
    toolset: "Portals",
    summary:
      "Resolve portal details for a Swagger organization in a single step. Given an organization UUID, returns the portal ID, subdomain, customDomain (when configured), and the list of products (with productId, productSlug, and productName) for the organization's portal. If the organization has no portal yet, a new portal is created automatically. Use this tool to obtain all portal context needed for subsequent portal and product operations.",
    inputSchema: ResolveOrganizationPortalArgsSchema,
    outputSchema: ResolvePortalOutputSchema,
    handler: "resolveOrganizationPortal",
    ...WRITE,
  },
  {
    title: "List Portal Products",
    toolset: "Products",
    summary: "Get products for a specific portal that match your criteria.",
    inputSchema: PortalArgsSchema,
    outputSchema: ProductsListOutputSchema,
    handler: "getPortalProducts",
    ...READ_ONLY,
  },
  {
    title: "Create Portal Product",
    toolset: "Products",
    summary: "Create a new product for a specific portal.",
    inputSchema: CreateProductArgsSchema,
    outputSchema: ProductOutputSchema,
    handler: "createPortalProduct",
    ...WRITE,
  },
  {
    title: "Get Portal Product",
    toolset: "Products",
    summary: "Retrieve information about a specific product resource.",
    inputSchema: ProductArgsSchema,
    outputSchema: ProductOutputSchema,
    handler: "getPortalProduct",
    ...READ_ONLY,
  },
  {
    title: "Delete Portal Product",
    toolset: "Products",
    summary: "Delete a product from a specific portal",
    inputSchema: ProductArgsSchema,
    outputSchema: DeleteProductOutputSchema,
    handler: "deletePortalProduct",
    formatResponse: () => ({ message: "Product deleted successfully." }),
    ...WRITE_DESTRUCTIVE,
  },
  {
    title: "Update Portal Product",
    toolset: "Products",
    summary: "Update a product's settings within a specific portal.",
    inputSchema: UpdateProductArgsSchema,
    outputSchema: ProductOutputSchema,
    handler: "updatePortalProduct",
    ...WRITE_DESTRUCTIVE,
  },
  {
    title: "Publish Portal Product",
    toolset: "Products",
    summary:
      "Publish a product's content to make it live or as preview. This endpoint publishes the current content of a product, making it visible to portal visitors. Use preview mode to test before going live. Optionally provide `tableOfContentsId` to get a page-specific URL. Returns publication status, a live or preview URL (null if URL building fails), product and portal metadata, and an optional `warning` when metadata/URL building failed — a warning does NOT mean the publish failed.",
    inputSchema: PublishProductArgsSchema,
    outputSchema: PublishOutputSchema,
    handler: "publishPortalProduct",
    ...WRITE_DESTRUCTIVE,
  },
  {
    title: "List Portal Product Sections",
    toolset: "Sections",
    summary: "Get sections for a specific product within a portal.",
    inputSchema: GetProductSectionsArgsSchema,
    outputSchema: SectionsListOutputSchema,
    handler: "getPortalProductSections",
    ...READ_ONLY,
  },
  {
    title: "Create Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Create a new table of contents item in a portal product section. Supports API references, HTML content, and Markdown content types.",
    inputSchema: CreateTableOfContentsArgsSchema,
    outputSchema: CreateTocOutputSchema,
    handler: "createTableOfContents",
    ...WRITE,
  },
  {
    title: "List Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Get table of contents for a section of a product within a portal.",
    inputSchema: GetTableOfContentsArgsSchema,
    outputSchema: TocListOutputSchema,
    formatResponse: (result: unknown[]) => ({ items: result }),
    handler: "getTableOfContents",
    ...READ_ONLY,
  },
  {
    title: "Delete Table Of Contents",
    toolset: "Table Of Contents",
    summary:
      "Delete table of contents entry. Performs a soft-delete of an entry from the table of contents. Supports recursive deletion of nested items.",
    inputSchema: DeleteTableOfContentsArgsSchema,
    outputSchema: DeleteTableOfContentsOutputSchema,
    handler: "deleteTableOfContents",
    ...WRITE_DESTRUCTIVE,
  },

  // Document management tools
  {
    title: "Create Documentation Page",
    toolset: "Documents",
    summary:
      "Create a documentation page in a portal product in a single tool call. Supports markdown and html content types. Returns the page location details (productId, sectionId, slug) and a draftUrl to edit it in the portal.",
    inputSchema: CreateDocumentationPageArgsSchema,
    outputSchema: CreateDocPageOutputSchema,
    handler: "createDocumentationPage",
    ...WRITE,
  },
  {
    title: "Get Document",
    toolset: "Documents",
    summary:
      "Get document content and metadata by document ID. Useful for retrieving HTML or Markdown content from table of contents items.",
    inputSchema: GetDocumentArgsSchema,
    outputSchema: DocumentOutputSchema,
    handler: "getDocument",
    ...READ_ONLY,
  },
  {
    title: "Update Document",
    toolset: "Documents",
    summary:
      "Update the content or source of an existing document. Supports both HTML and Markdown content types.",
    inputSchema: UpdateDocumentArgsSchema,
    outputSchema: DocumentOutputSchema,
    handler: "updateDocument",
    ...WRITE_DESTRUCTIVE,
  },

  // Registry API tools for SwaggerHub Design functionality
  {
    title: "Search APIs and Domains",
    toolset: "Registry API",
    summary:
      "Search for APIs and Domains in SwaggerHub Registry using the comprehensive /specs endpoint and retrieve metadata including owner, name, description, summary, version, and specification.",
    inputSchema: ApiSearchParamsSchema,
    outputSchema: SearchApisOutputSchema,
    formatResponse: (result: unknown[]) => ({ items: result }),
    handler: "searchApis",
    ...READ_ONLY,
  },
  {
    title: "Get API Definition",
    toolset: "Registry API",
    summary:
      "Fetch resolved API definition from SwaggerHub Registry based on owner, API name, and version.",
    inputSchema: ApiDefinitionParamsSchema,
    outputSchema: ApiDefinitionOutputSchema,
    formatResponse: (result: unknown) => ({
      definition:
        typeof result === "string" ? result : JSON.stringify(result, null, 2),
    }),
    handler: "getApiDefinition",
    ...READ_ONLY,
  },
  {
    title: "Create or Update API",
    toolset: "Registry API",
    summary:
      "Create a new API or update an existing API in SwaggerHub Registry for Swagger Studio. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiParamsSchema,
    outputSchema: CreateApiOutputSchema,
    handler: "createOrUpdateApi",
    ...WRITE_DESTRUCTIVE,
  },
  // User Management API tools for organization management functionality
  {
    title: "List Organizations",
    toolset: "Registry API",
    summary:
      "Get organizations for a user. Returns a list of organizations that the authenticating user is a member of. On-Premise admin gets a list of all organizations in the system.",
    inputSchema: OrganizationsQuerySchema,
    outputSchema: OrganizationsListOutputSchema,
    handler: "getOrganizations",
    ...READ_ONLY,
  },
  {
    title: "Scan API Standardization",
    toolset: "Registry API",
    summary:
      "Run a standardization scan against an API definition using the organization's governance and standardization rules. Accepts a raw YAML or JSON OpenAPI/AsyncAPI definition and returns a list of validation errors, the total issue count, and counts grouped by severity. Use this tool when the user provides the API definition content directly (as raw YAML or JSON) and asks to validate, scan, or check the governance or standardization of the API.",
    inputSchema: ScanStandardizationParamsSchema,
    outputSchema: ScanOutputSchema,
    handler: "scanStandardization",
    ...READ_ONLY,
  },
  {
    title: "Scan API Standardization from Registry",
    toolset: "Registry API",
    summary:
      "Run a standardization scan on an API that already exists in SwaggerHub Registry, identified by organization name, API name, and version. Fetches the API definition from the registry internally and scans it against the organization's governance and standardization rules. Returns a list of validation errors, total issue count, counts grouped by severity, and a SwaggerHub UI URL for the scanned API. Use this tool when the user identifies the API by org name, API name, and version and asks to validate, scan, or check the governance or standardization of an existing API.",
    inputSchema: ScanApiStandardizationFromRegistryParamsSchema,
    outputSchema: ScanFromRegistryOutputSchema,
    handler: "scanApiStandardizationFromRegistry",
    ...READ_ONLY,
  },
  {
    title: "Create API from Prompt",
    toolset: "Registry API",
    summary:
      "Generate and save an API definition based on a prompt using SmartBear AI. This tool automatically applies organization governance and standardization rules during API generation. The specType parameter determines the format of the generated definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x, 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x. Use this tool when creating APIs that comply with governance policies or when generating APIs from natural language descriptions. Use this tool when users ask to create, generate, or design APIs with governance or standardization requirements. Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiFromPromptParamsSchema,
    outputSchema: CreateApiFromPromptOutputSchema,
    handler: "createApiFromPrompt",
    ...WRITE_DESTRUCTIVE,
  },
  {
    title: "Standardize API",
    toolset: "Registry API",
    summary:
      "Standardize and fix an API definition using AI to ensure compliance with governance policies. Scans the API definition for standardization errors and automatically fixes them using SmartBear AI. Optionally provide 'newVersion' (e.g. patch bump '1.0.0' → '1.0.1') to save the fixed definition as a new version — omitting it will overwrite the current version. Returns the number of errors found and the fixed definition if successful. Use this tool when users ask to standardize, fix, govern, or ensure governance compliance of APIs.",
    inputSchema: StandardizeApiParamsSchema,
    outputSchema: StandardizeOutputSchema,
    handler: "standardizeApi",
    ...WRITE_DESTRUCTIVE,
  },

  ...FUNCTIONAL_TESTING_TOOLS,
];
