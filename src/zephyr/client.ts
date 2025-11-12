import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { ApiClient } from "./common/api-client.js";
import { GetProject } from "./tool/project/get-project.js";
import { GetProjects } from "./tool/project/get-projects.js";
import { GetPriorities } from "./tool/priority/get-priorities.js"
import { GetTestCycles } from "./tool/test-cycle/get-test-cycles.js";
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

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    const tools: ZephyrTool[] = [
      new GetProjects(this.apiClient),
      new GetProject(this.apiClient),
      new GetTestCycles(this.apiClient),
      new GetPriorities(this.apiClient),
    ];

    tools.forEach((tool) => {
      register(tool.specification, tool.handle);
    });
  }
}
