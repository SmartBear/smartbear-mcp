import z from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { ApiClient } from "./common/api-client";

import { GetEnvironments } from "./tool/environment/get-environments";
import { GetPriorities } from "./tool/priority/get-priorities";
import { GetProject } from "./tool/project/get-project";
import { GetProjects } from "./tool/project/get-projects";
import { GetStatuses } from "./tool/status/get-statuses";
import { CreateTestCase } from "./tool/test-case/create-test-case";
import { CreateTestScript } from "./tool/test-case/create-test-script";
import { GetTestCase } from "./tool/test-case/get-test-case";
import { GetTestCases } from "./tool/test-case/get-test-cases";
import { CreateTestCycle } from "./tool/test-cycle/create-test-cycle";
import { GetTestCycle } from "./tool/test-cycle/get-test-cycle";
import { GetTestCycles } from "./tool/test-cycle/get-test-cycles";
import { GetTestExecution } from "./tool/test-execution/get-test-execution";
import { GetTestExecutions } from "./tool/test-execution/get-test-executions";

const BASE_URL_DEFAULT = "https://api.zephyrscale.smartbear.com/v2";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Zephyr Scale API token for authentication"),
  base_url: z
    .string()
    .url()
    .optional()
    .describe("Zephyr Scale API base URL")
    .default(BASE_URL_DEFAULT),
});

export class ZephyrClient implements Client {
  private apiClient: ApiClient | undefined;

  name = "Zephyr";
  toolPrefix = "zephyr";
  configPrefix = "Zephyr";
  config = ConfigurationSchema;

  async configure(
    _server: any,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.apiClient = new ApiClient(
      config.api_token,
      config.base_url || BASE_URL_DEFAULT,
    );
  }

  isConfigured(): boolean {
    return this.apiClient !== undefined;
  }

  getApiClient() {
    if (!this.apiClient) throw new Error("Client not configured");
    return this.apiClient;
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const tools = [
      new GetProjects(this),
      new GetProject(this),
      new GetTestCycles(this),
      new GetTestCycle(this),
      new GetPriorities(this),
      new GetStatuses(this),
      new GetTestCases(this),
      new GetEnvironments(this),
      new GetTestCase(this),
      new GetTestExecution(this),
      new GetTestExecutions(this),
      new CreateTestCase(this),
      new CreateTestCycle(this),
      new CreateTestScript(this),
    ];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
