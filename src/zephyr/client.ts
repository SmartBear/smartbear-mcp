import z from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { ApiClient } from "./common/api-client";

import { GetEnvironments } from "./tool/environment/get-environments";
import { CreateFolder } from "./tool/folder/create-folder";
import { GetTestCases as GetIssueLinkTestCases } from "./tool/issue-link/get-test-cases";
import { GetPriorities } from "./tool/priority/get-priorities";
import { GetProject } from "./tool/project/get-project";
import { GetProjects } from "./tool/project/get-projects";
import { GetStatuses } from "./tool/status/get-statuses";
import { CreateTestCaseIssueLink } from "./tool/test-case/create-issue-link";
import { CreateTestCase } from "./tool/test-case/create-test-case";
import { CreateTestScript } from "./tool/test-case/create-test-script";
import { CreateTestSteps } from "./tool/test-case/create-test-steps.ts";
import { CreateTestCaseWebLink } from "./tool/test-case/create-web-link.ts";
import { GetTestCase } from "./tool/test-case/get-test-case";
import { GetTestCases } from "./tool/test-case/get-test-cases";
import { GetTestCaseSteps } from "./tool/test-case/get-test-steps.ts";
import { UpdateTestCase } from "./tool/test-case/update-test-case.ts";
import { CreateTestCycle } from "./tool/test-cycle/create-test-cycle";
import { CreateTestCycleWebLink } from "./tool/test-cycle/create-web-link.ts";
import { GetTestCycle } from "./tool/test-cycle/get-test-cycle";
import { GetTestCycles } from "./tool/test-cycle/get-test-cycles";
import { UpdateTestCycle } from "./tool/test-cycle/update-test-cycle.ts";
import { CreateTestExecution } from "./tool/test-execution/create-test-execution";
import { GetTestExecution } from "./tool/test-execution/get-test-execution";
import { GetTestExecutionSteps } from "./tool/test-execution/get-test-execution-steps";
import { GetTestExecutions } from "./tool/test-execution/get-test-executions";
import { UpdateTestExecution } from "./tool/test-execution/update-test-execution";
import { UpdateTestExecutionSteps } from "./tool/test-execution/update-test-execution-steps";

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
      new UpdateTestCase(this),
      new UpdateTestCycle(this),
      new CreateTestExecution(this),
      new CreateTestCaseWebLink(this),
      new CreateTestSteps(this),
      new CreateTestCaseIssueLink(this),
      new CreateFolder(this),
      new CreateTestScript(this),
      new UpdateTestExecution(this),
      new GetTestCaseSteps(this),
      new GetIssueLinkTestCases(this),
      new CreateTestCycleWebLink(this),
      new GetTestExecutionSteps(this),
      new UpdateTestExecutionSteps(this),
    ];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
