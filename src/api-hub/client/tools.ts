/**
 * TOOLS
 *
 * Defines tool configurations for API Hub operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import type { ToolParams } from "../../common/types.js";
import {
  ApiDefinitionParamsSchema,
  ApiSearchParamsSchema,
  CreatePortalArgsSchema,
  CreateProductArgsSchema,
  PortalArgsSchema,
  ProductArgsSchema,
  UpdatePortalArgsSchema,
  UpdateProductArgsSchema,
} from "./types.js";

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
];
