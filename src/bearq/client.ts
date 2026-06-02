import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { AUTHORIZATION_HEADER, DEFAULT_API_BASE_URL } from "./config/constants";
import { ChatWithQaLead } from "./tool/tasks/chat-with-qa-lead";
import { ExpandApplicationModel } from "./tool/tasks/expand-application-model";
import { GetTask } from "./tool/tasks/get-task";
import { GetTaskStatus } from "./tool/tasks/get-task-status";
import { RefineAllDraftTests } from "./tool/tasks/refine-all-draft-tests";
import { RefineTestCases } from "./tool/tasks/refine-test-cases";
import { RefineTestsInFunctionalAreas } from "./tool/tasks/refine-tests-in-functional-areas";
import { RunRegressionTests } from "./tool/tasks/run-regression-tests";
import { RunTestCases } from "./tool/tasks/run-test-cases";
import { RunTestsInFunctionalAreas } from "./tool/tasks/run-tests-in-functional-areas";
import { StopTask } from "./tool/tasks/stop-task";
import { WaitForTask } from "./tool/tasks/wait-for-task";

const ConfigurationSchema = z.object({
  api_base_url: z
    .string()
    .optional()
    .describe(
      "Override the BearQ public API base URL. Defaults to https://api.bearq.smartbear.com",
    ),
});

const AuthenticationSchema = z.object({
  api_token: z.string().describe("BearQ workspace API token (Bearer)."),
});

export class BearQClient implements Client {
  private server?: SmartBearMcpServer;
  private _baseUrl: string = DEFAULT_API_BASE_URL;

  name = "BearQ";
  capabilityPrefix = "bearq";
  configPrefix = "BearQ";
  config = ConfigurationSchema;
  authenticationFields = AuthenticationSchema;

  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this.server = server;
    if (config.api_base_url) this._baseUrl = config.api_base_url;
  }

  getAuthToken(): string | null {
    return (
      this.server?.getEnv("api_token", this) ||
      this.server?.getEnv(AUTHORIZATION_HEADER) ||
      null
    );
  }

  isConfigured(): boolean {
    return this.server !== undefined;
  }

  hasAuth(): boolean {
    return this.isConfigured() && !!this.getAuthToken();
  }

  getBaseUrl(): string {
    return this._baseUrl;
  }

  getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) throw new ToolError("BearQ API token not found");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const tools = [
      new RunRegressionTests(this),
      new RunTestCases(this),
      new RunTestsInFunctionalAreas(this),
      new RefineTestCases(this),
      new RefineTestsInFunctionalAreas(this),
      new RefineAllDraftTests(this),
      new ExpandApplicationModel(this),
      new ChatWithQaLead(this),
      new GetTask(this),
      new GetTaskStatus(this),
      new StopTask(this),
      new WaitForTask(this),
    ];
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
