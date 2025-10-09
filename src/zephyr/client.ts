import type {
  Client,
  ClientAuthConfig,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { ApiClient } from "./common/api-client.js";
import { GetProjects } from "./tool/project/get-projects.js";
import type { ZephyrTool } from "./tool/zephyr-tool.js";

export class ZephyrClient implements Client {
  private readonly apiClient: ApiClient;
  name = "Zephyr";
  prefix = "zephyr";

  constructor(
    bearerToken: string,
    baseUrl: string = "https://api.zephyrscale.smartbear.com/v2",
  ) {
    this.apiClient = new ApiClient(bearerToken, baseUrl);
  }

  /**
   * Get authentication configuration for Zephyr client
   * Defines required and optional authentication fields
   */
  static getAuthConfig(): ClientAuthConfig {
    return {
      requirements: [
        {
          key: "ZEPHYR_API_TOKEN",
          required: true,
          description: "Zephyr Scale API token for authentication",
        },
        {
          key: "ZEPHYR_BASE_URL",
          required: false,
          description:
            "Zephyr Scale API base URL (default: https://api.zephyrscale.smartbear.com/v2)",
        },
      ],
      description: "Zephyr Scale requires an API token.",
    };
  }

  /**
   * Create ZephyrClient from environment variables
   * @returns ZephyrClient instance or null if ZEPHYR_API_TOKEN is not set
   */
  static fromEnv(): ZephyrClient | null {
    const token = process.env.ZEPHYR_API_TOKEN;
    if (!token) {
      return null;
    }
    const baseUrl = process.env.ZEPHYR_BASE_URL;
    return new ZephyrClient(token, baseUrl);
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    const tools: ZephyrTool[] = [new GetProjects(this.apiClient)];

    tools.forEach((tool) => {
      register(tool.specification, tool.handle);
    });
  }
}
