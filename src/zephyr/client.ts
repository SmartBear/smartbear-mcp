import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { ApiClient } from "./common/api-client.js";
import { GetProjects } from "./tool/get-projects.js";
import type { ZephyrTool } from "./tool/zephyr-tool.js";

export class ZephyrClient implements Client {
  private readonly apiClient: ApiClient;
  name = "Zephyr Test Management for Jira";
  prefix = "zephyr";

  constructor(
    bearerToken: string,
    baseUrl: string = "https://api.zephyrscale.smartbear.com/v2",
  ) {
    this.apiClient = new ApiClient(bearerToken, baseUrl);
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    console.log("[ZephyrClient] Starting tool registration...");
    const tools: ZephyrTool[] = [new GetProjects(this.apiClient)];

    tools.forEach((tool) => {
      console.log(
        `[ZephyrClient] Registering tool: ${tool.specification.title}`,
      );
      register(tool.specification, tool.handle);
    });

    console.log("[ZephyrClient] Finished tool registration...");
  }
}
