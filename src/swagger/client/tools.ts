/**
 * TOOLS
 *
 * Defines tool configurations for Swagger operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import type { ToolParams } from "../../common/types";
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
    summary:
      "Search for available portals within Swagger. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
    parameters: [],
    handler: "getPortals",
  },
  {
    title: "Create Portal",
    summary: "Create a new portal within Swagger.",
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
      "Create a new API or update an existing API in SwaggerHub Registry for Swagger Studio. The API specification type (OpenAPI, AsyncAPI) is automatically detected from the definition content. APIs are always created with fixed values: version 1.0.0, private visibility, and automock disabled (these values cannot be changed). Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiParamsSchema,
    handler: "createOrUpdateApi",
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
      "Run a standardization scan against an API definition using the organization's governance and standardization rules. Accepts a YAML or JSON OpenAPI/AsyncAPI definition and returns a list of standardization errors and validation issues. Use this tool when users ask to validate, scan, or check API governance or standardization.",
    inputSchema: ScanStandardizationParamsSchema,
    handler: "scanStandardization",
  },
  {
    title: "Create API from Prompt",
    summary:
      "Generate and save an API definition based on a prompt using SmartBear AI. This tool automatically applies organization governance and standardization rules during API generation. The specType parameter determines the format of the generated definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x, 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x. Use this tool when creating APIs that comply with governance policies or when generating APIs from natural language descriptions. Use this tool when users ask to create, generate, or design APIs with governance or standardization requirements. Returns HTTP 201 for creation, HTTP 200 for update. Response includes 'operation' field indicating whether it was a 'create' or 'update' operation along with API details and SwaggerHub URL.",
    inputSchema: CreateApiFromPromptParamsSchema,
    handler: "createApiFromPrompt",
  },
  {
    title: "Standardize API",
    summary:
      "Standardize and fix an API definition using AI to ensure compliance with governance policies. Scans the API definition for standardization errors and automatically fixes them using SmartBear AI. If errors are found, they will be sent to SmartBear AI to generate a corrected definition, which is then saved back to the registry. Returns the number of errors found and the fixed definition if successful. Use this tool when users ask to standardize, fix, govern, or ensure governance compliance of APIs.",
    inputSchema: StandardizeApiParamsSchema,
    handler: "standardizeApi",
  },
];
