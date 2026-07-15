import process from "node:process";
import z from "zod";
import { getRequestHeader } from "../common/request-context.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import { ApiClient } from "./common/api-client.ts";
import { GetEnvironments } from "./tool/environment/get-environments.ts";
import { CreateFolder } from "./tool/folder/create-folder.ts";
import { GetTestCases as GetIssueLinkTestCases } from "./tool/issue-link/get-test-cases.ts";
import { GetTestCycles as GetIssueLinkTestCycles } from "./tool/issue-link/get-test-cycles.ts";
import { GetTestExecutions as GetIssueLinkTestExecutions } from "./tool/issue-link/get-test-executions.ts";
import { GetPriorities } from "./tool/priority/get-priorities.ts";
import { GetProject } from "./tool/project/get-project.ts";
import { GetProjects } from "./tool/project/get-projects.ts";
import { GetStatuses } from "./tool/status/get-statuses.ts";
import { CreateTestCaseIssueLink } from "./tool/test-case/create-issue-link.ts";
import { CreateTestCase } from "./tool/test-case/create-test-case.ts";
import { CreateTestScript } from "./tool/test-case/create-test-script.ts";
import { CreateTestSteps } from "./tool/test-case/create-test-steps.ts";
import { CreateTestCaseWebLink } from "./tool/test-case/create-web-link.ts";
import { GetTestCaseLinks } from "./tool/test-case/get-links.ts";
import { GetTestCase } from "./tool/test-case/get-test-case.ts";
import { GetTestCases } from "./tool/test-case/get-test-cases.ts";
import { GetTestScript } from "./tool/test-case/get-test-script.ts";
import { GetTestCaseSteps } from "./tool/test-case/get-test-steps.ts";
import { UpdateTestCase } from "./tool/test-case/update-test-case.ts";
import { CreateTestCycleIssueLink } from "./tool/test-cycle/create-issue-link.ts";
import { CreateTestCycle } from "./tool/test-cycle/create-test-cycle.ts";
import { CreateTestCycleWebLink } from "./tool/test-cycle/create-web-link.ts";
import { GetTestCycleLinks } from "./tool/test-cycle/get-links.ts";
import { GetTestCycle } from "./tool/test-cycle/get-test-cycle.ts";
import { GetTestCycles } from "./tool/test-cycle/get-test-cycles.ts";
import { UpdateTestCycle } from "./tool/test-cycle/update-test-cycle.ts";
import { CreateTestExecutionIssueLink } from "./tool/test-execution/create-issue-link.ts";
import { CreateTestExecution } from "./tool/test-execution/create-test-execution.ts";
import { GetTestExecution } from "./tool/test-execution/get-test-execution.ts";
import { GetTestExecutionLinks } from "./tool/test-execution/get-test-execution-links.ts";
import { GetTestExecutions } from "./tool/test-execution/get-test-executions.ts";
import { GetTestExecutionSteps } from "./tool/test-execution/get-test-steps.ts";
import { UpdateTestExecution } from "./tool/test-execution/update-test-execution.ts";
import { UpdateTestExecutionSteps } from "./tool/test-execution/update-test-steps.ts";

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
  private _apiToken: string | undefined;

  name = "Zephyr";
  capabilityPrefix = "zephyr";
  configPrefix = "Zephyr";
  config = ConfigurationSchema;

  async configure(
    _server: any,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this._apiToken = config.api_token;
    this.apiClient = new ApiClient(
      () => this.getAuthToken(),
      config.base_url || process.env.ZEPHYR_CUSTOM_BASE_URL || BASE_URL_DEFAULT,
    );
  }

  getAuthToken(): string | null {
    // 1. Try request context
    const contextHeader =
      getRequestHeader("Zephyr-Api-Token") || getRequestHeader("Authorization");

    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle Bearer or token prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.substring(7);
      }
      return token;
    }

    // 2. Fallback to configured token
    return this._apiToken || null;
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
      new GetTestCycleLinks(this),
      new GetPriorities(this),
      new GetStatuses(this),
      new GetTestCases(this),
      new GetEnvironments(this),
      new GetTestCase(this),
      new GetTestCaseLinks(this),
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
      new CreateTestCycleIssueLink(this),
      new CreateFolder(this),
      new CreateTestScript(this),
      new UpdateTestExecution(this),
      new CreateTestExecutionIssueLink(this),
      new GetTestCaseSteps(this),
      new GetIssueLinkTestCases(this),
      new GetIssueLinkTestCycles(this),
      new GetTestScript(this),
      new CreateTestCycleWebLink(this),
      new UpdateTestExecutionSteps(this),
      new GetTestExecutionSteps(this),
      new GetTestExecutionLinks(this),
      new GetIssueLinkTestExecutions(this),
    ];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
