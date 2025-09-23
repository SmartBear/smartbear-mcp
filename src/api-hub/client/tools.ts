/**
 * TOOLS
 *
 * Defines tool configurations for API Hub operations.
 * Each tool includes parameters, descriptions, and handler method names.
 * This follows the pattern established in the pactflow module.
 */

import { z } from "zod";
import type { ToolParams } from "../../common/types.js";

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
		parameters: [
			{
				name: "name",
				type: z.string(),
				required: false,
				description: "The portal name.",
			},
			{
				name: "subdomain",
				type: z.string(),
				required: true,
				description: "The portal subdomain.",
			},
			{
				name: "offline",
				type: z.boolean(),
				required: false,
				description:
					"If set to true the portal will not be visible to customers.",
			},
			{
				name: "routing",
				type: z.string(),
				required: false,
				description: "Determines the routing strategy ('browser' or 'proxy').",
			},
			{
				name: "credentialsEnabled",
				type: z.string(),
				required: false,
				description: "Indicates if credentials are enabled for the portal.",
			},
			{
				name: "swaggerHubOrganizationId",
				type: z.string(),
				required: true,
				description:
					"The corresponding API Hub (formerly SwaggerHub) organization UUID.",
			},
			{
				name: "openapiRenderer",
				type: z.string(),
				required: false,
				description:
					"Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default.",
			},
			{
				name: "pageContentFormat",
				type: z.string(),
				required: false,
				description: "The format of the page content.",
			},
		],
		handler: "createPortal",
	},
	{
		title: "Get Portal",
		summary: "Retrieve information about a specific portal.",
		parameters: [
			{
				name: "portalId",
				type: z.string(),
				description: "Portal UUID or subdomain.",
				required: true,
			},
		],
		handler: "getPortal",
	},
	{
		title: "Delete Portal",
		summary: "Delete a specific portal.",
		parameters: [
			{
				name: "portalId",
				type: z.string(),
				description: "Portal UUID or subdomain.",
				required: true,
			},
		],
		handler: "deletePortal",
		formatResponse: () => "Portal deleted successfully.",
	},
	{
		title: "Update Portal",
		summary: "Update a specific portal's configuration.",
		parameters: [
			{
				name: "portalId",
				type: z.string(),
				description: "Portal UUID or subdomain.",
				required: true,
			},
			{
				name: "name",
				type: z.string(),
				description: "The portal name.",
				required: false,
			},
			{
				name: "subdomain",
				type: z.string(),
				description: "The portal subdomain.",
				required: false,
			},
			{
				name: "customDomain",
				type: z.boolean(),
				description: "Indicates if the portal has a custom domain.",
				required: false,
			},
			{
				name: "gtmKey",
				type: z.string(),
				description: "Google Tag Manager key for the portal.",
				required: false,
			},
			{
				name: "offline",
				type: z.boolean(),
				description:
					"If set to true the portal will not be visible to customers.",
				required: false,
			},
			{
				name: "routing",
				type: z.string(),
				description: "Determines the routing strategy ('browser' or 'proxy').",
				required: false,
			},
			{
				name: "credentialsEnabled",
				type: z.boolean(),
				description: "Indicates if credentials are enabled for the portal.",
				required: false,
			},
			{
				name: "openapiRenderer",
				type: z.string(),
				description:
					"Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default.",
				required: false,
			},
			{
				name: "pageContentFormat",
				type: z.string(),
				description: "The format of the page content.",
				required: false,
			},
		],
		handler: "updatePortal",
	},
	{
		title: "List Portal Products",
		summary: "Get products for a specific portal that match your criteria.",
		parameters: [
			{
				name: "portalId",
				type: z.string(),
				description: "Portal UUID or subdomain.",
				required: true,
			},
		],
		handler: "getPortalProducts",
	},
	{
		title: "Create Portal Product",
		summary: "Create a new product for a specific portal.",
		parameters: [
			{
				name: "portalId",
				type: z.string(),
				description: "Portal UUID or subdomain.",
				required: true,
			},
			{
				name: "type",
				type: z.string(),
				description: "Product type (Allowed values: 'new', 'copy').",
				required: true,
			},
			{
				name: "name",
				type: z.string(),
				description: "Product name.",
				required: true,
			},
			{
				name: "slug",
				type: z.string(),
				description:
					"URL component for this product. Must be unique within the portal.",
				required: true,
			},
			{
				name: "description",
				type: z.string(),
				description: "Product description.",
				required: false,
			},
			{
				name: "public",
				type: z.boolean(),
				description: "Indicates if the product is public.",
				required: false,
			},
			{
				name: "hidden",
				type: z.string(),
				description: "Indicates if the product is hidden.",
				required: false,
			},
			{
				name: "role",
				type: z.boolean(),
				description: "Indicates if the product has a role.",
				required: false,
			},
		],
		handler: "createPortalProduct",
	},
	{
		title: "Get Portal Product",
		summary: "Retrieve information about a specific product resource.",
		parameters: [
			{
				name: "productId",
				type: z.string(),
				description: "Product UUID, or identifier in the format.",
				required: true,
			},
		],
		handler: "getPortalProduct",
	},
	{
		title: "Delete Portal Product",
		summary: "Delete a product from a specific portal",
		parameters: [
			{
				name: "productId",
				type: z.string(),
				description: "Product UUID, or identifier in the format.",
				required: true,
			},
		],
		handler: "deletePortalProduct",
		formatResponse: () => "Product deleted successfully.",
	},
	{
		title: "Update Portal Product",
		summary: "Update a product's settings within a specific portal.",
		parameters: [
			{
				name: "productId",
				type: z.string(),
				description: "Product UUID, or identifier in the format.",
				required: true,
			},
			{
				name: "name",
				type: z.string(),
				description: "Product name.",
				required: false,
			},
			{
				name: "slug",
				type: z.string(),
				description:
					"URL component for this product. Must be unique within the portal.",
				required: false,
			},
			{
				name: "description",
				type: z.string(),
				description: "Product description.",
				required: false,
			},
			{
				name: "public",
				type: z.boolean(),
				description: "Indicates if the product is public.",
				required: false,
			},
			{
				name: "hidden",
				type: z.string(),
				description: "Indicates if the product is hidden.",
				required: false,
			},
		],
		handler: "updatePortalProduct",
	},
];
