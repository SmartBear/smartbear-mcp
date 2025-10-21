import z from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { ApiClient } from "./common/api-client.js";
import { GetProjects } from "./tool/project/get-projects.js";
import type { ZephyrTool } from "./tool/zephyr-tool.js";

const BASE_URL_DEFAULT = "https://api.zephyrscale.smartbear.com/v2";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Zephyr Scale API token for authentication"),
  base_url: z.string().optional().describe("Zephyr Scale API base URL").default(BASE_URL_DEFAULT),
});

export class ZephyrClient implements Client {

  private apiClient: ApiClient | undefined;

  name = "Zephyr";
  prefix = "zephyr";
  config = ConfigurationSchema;

  async configure(_server: any, config: z.infer<typeof ConfigurationSchema>): Promise<boolean> {
    this.apiClient = new ApiClient(config.api_token, config.base_url || BASE_URL_DEFAULT);
    return true;
  }

  getApiClient() {
    if (!this.apiClient) throw new Error("Client not configured");
    return this.apiClient;
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    const tools: ZephyrTool[] = [new GetProjects(this.getApiClient())];

    tools.forEach((tool) => {
      register(tool.specification, tool.handle);
    });
  }
}
