import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
	Client,
	GetInputFunction,
	RegisterToolsFunction,
} from "../common/types.js";
import {
	ApiHubAPI,
	ApiHubConfiguration,
	type CreatePortalArgs,
	type CreateProductArgs,
	TOOLS,
	type UpdatePortalArgs,
	type UpdateProductArgs,
} from "./client/index.js";

// Tool definitions for API Hub API client
export class ApiHubClient implements Client {
	private config: ApiHubConfiguration;
	private api: ApiHubAPI;

	name = "API Hub";
	prefix = "api_hub";

	constructor(token: string) {
		this.config = new ApiHubConfiguration({ token });
		this.api = new ApiHubAPI(
			this.config,
			`${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
		);
	}

	// Delegate API methods to the ApiHubAPI instance
	async getPortals(): Promise<any> {
		return this.api.getPortals();
	}

	async createPortal(body: CreatePortalArgs): Promise<any> {
		return this.api.createPortal(body);
	}

	async getPortal(portalId: string): Promise<any> {
		return this.api.getPortal(portalId);
	}

	async deletePortal(portalId: string): Promise<any> {
		return this.api.deletePortal(portalId);
	}

	async updatePortal(portalId: string, body: UpdatePortalArgs): Promise<any> {
		return this.api.updatePortal(portalId, body);
	}

	async getPortalProducts(portalId: string): Promise<any> {
		return this.api.getPortalProducts(portalId);
	}

	async createPortalProduct(
		portalId: string,
		body: CreateProductArgs,
	): Promise<any> {
		return this.api.createPortalProduct(portalId, body);
	}

	async getPortalProduct(productId: string): Promise<any> {
		return this.api.getPortalProduct(productId);
	}

	async deletePortalProduct(productId: string): Promise<any> {
		return this.api.deletePortalProduct(productId);
	}

	async updatePortalProduct(
		productId: string,
		body: UpdateProductArgs,
	): Promise<any> {
		return this.api.updatePortalProduct(productId, body);
	}

	registerTools(
		register: RegisterToolsFunction,
		_getInput: GetInputFunction,
	): void {
		TOOLS.forEach((tool) => {
			register(
				{
					title: tool.title,
					summary: tool.summary,
					parameters: tool.parameters,
				},
				async (args, _extra) => {
					try {
						let result: any;

						// Handle different method signatures based on the handler name
						switch (tool.handler) {
							case "getPortals":
								result = await this.getPortals();
								break;
							case "createPortal":
								result = await this.createPortal(args as CreatePortalArgs);
								break;
							case "getPortal":
								result = await this.getPortal((args as any).portalId);
								break;
							case "deletePortal":
								result = await this.deletePortal((args as any).portalId);
								break;
							case "updatePortal": {
								const { portalId: updatePortalId, ...updatePortalBody } =
									args as any;
								result = await this.updatePortal(
									updatePortalId,
									updatePortalBody as UpdatePortalArgs,
								);
								break;
							}
							case "getPortalProducts":
								result = await this.getPortalProducts((args as any).portalId);
								break;
							case "createPortalProduct": {
								const {
									portalId: createProductPortalId,
									...createProductBody
								} = args as any;
								result = await this.createPortalProduct(
									createProductPortalId,
									createProductBody as CreateProductArgs,
								);
								break;
							}
							case "getPortalProduct":
								result = await this.getPortalProduct((args as any).productId);
								break;
							case "deletePortalProduct":
								result = await this.deletePortalProduct(
									(args as any).productId,
								);
								break;
							case "updatePortalProduct": {
								const { productId: updateProductId, ...updateProductBody } =
									args as any;
								result = await this.updatePortalProduct(
									updateProductId,
									updateProductBody as UpdateProductArgs,
								);
								break;
							}
							default:
								throw new Error(`Unknown handler: ${tool.handler}`);
						}

						// Use custom formatter if available, otherwise return JSON
						const formattedResult = tool.formatResponse
							? tool.formatResponse(result)
							: result;
						const responseText =
							typeof formattedResult === "string"
								? formattedResult
								: JSON.stringify(formattedResult);

						return {
							content: [{ type: "text", text: responseText }],
						};
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
						};
					}
				},
			);
		});
	}
}
