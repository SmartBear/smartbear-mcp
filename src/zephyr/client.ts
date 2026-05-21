import z from "zod";
import type { SmartBearMcpServer } from "../common/server.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";

import { ApiClient } from "./common/api-client";

import { GetEnvironments } from "./tool/environment/get-environments";
import { CreateFolder } from "./tool/folder/create-folder";
import { GetTestCases as GetIssueLinkTestCases } from "./tool/issue-link/get-test-cases";
import { GetTestCycles as GetIssueLinkTestCycles } from "./tool/issue-link/get-test-cycles";
import { GetTestExecutions as GetIssueLinkTestExecutions } from "./tool/issue-link/get-test-executions.ts";
import { GetPriorities } from "./tool/priority/get-priorities";
import { GetProject } from "./tool/project/get-project";
import { GetProjects } from "./tool/project/get-projects";
import { GetStatuses } from "./tool/status/get-statuses";
import { CreateTestCaseIssueLink } from "./tool/test-case/create-issue-link";
import { CreateTestCase } from "./tool/test-case/create-test-case";
import { CreateTestScript } from "./tool/test-case/create-test-script";
import { CreateTestSteps } from "./tool/test-case/create-test-steps.ts";
import { CreateTestCaseWebLink } from "./tool/test-case/create-web-link.ts";
import { GetTestCaseLinks } from "./tool/test-case/get-links";
import { GetTestCase } from "./tool/test-case/get-test-case";
import { GetTestCases } from "./tool/test-case/get-test-cases";
import { GetTestScript } from "./tool/test-case/get-test-script";
import { GetTestCaseSteps } from "./tool/test-case/get-test-steps.ts";
import { UpdateTestCase } from "./tool/test-case/update-test-case.ts";
import { CreateTestCycleIssueLink } from "./tool/test-cycle/create-issue-link";
import { CreateTestCycle } from "./tool/test-cycle/create-test-cycle";
import { CreateTestCycleWebLink } from "./tool/test-cycle/create-web-link.ts";
import { GetTestCycleLinks } from "./tool/test-cycle/get-links";
import { GetTestCycle } from "./tool/test-cycle/get-test-cycle";
import { GetTestCycles } from "./tool/test-cycle/get-test-cycles";
import { UpdateTestCycle } from "./tool/test-cycle/update-test-cycle.ts";
import { CreateTestExecutionIssueLink } from "./tool/test-execution/create-issue-link";
import { CreateTestExecution } from "./tool/test-execution/create-test-execution";
import { GetTestExecution } from "./tool/test-execution/get-test-execution";
import { GetTestExecutionLinks } from "./tool/test-execution/get-test-execution-links";
import { GetTestExecutions } from "./tool/test-execution/get-test-executions";
import { GetTestExecutionSteps } from "./tool/test-execution/get-test-steps.ts";
import { UpdateTestExecution } from "./tool/test-execution/update-test-execution";
import { UpdateTestExecutionSteps } from "./tool/test-execution/update-test-steps.ts";

const ConfigurationSchema = z.object({
  base_url: z
    .url()
    .optional()
    .describe("Zephyr Scale API base URL")
    .default("https://api.zephyrscale.smartbear.com/v2"),
});

export class ZephyrClient implements Client {
  private apiClient: ApiClient | undefined;
  private server?: SmartBearMcpServer;

  name = "Zephyr";
  capabilityPrefix = "zephyr";
  configPrefix = "Zephyr";
  config = ConfigurationSchema;

  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this.server = server;
    this.apiClient = new ApiClient(() => this.getAuthToken(), config.base_url);
  }

  getAuthToken(): string {
    const token =
      this.server?.getEnv("Api-Token", this) ||
      this.server?.getEnv("Authorization");
    if (token) {
      return token;
    }

    throw new Error(
      "Authentication token not found in request headers or configuration",
    );
  }

  isConfigured(): boolean {
    return !!this.apiClient;
  }

  hasAuth(): boolean {
    try {
      return this.isConfigured() && !!this.getAuthToken();
    } catch {
      return false;
    }
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
