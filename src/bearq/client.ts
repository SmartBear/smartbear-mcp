import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import { getRequestHeader } from "../common/request-context";
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
  api_token: z.string().describe("BearQ workspace API token (Bearer)."),
  api_base_url: z
    .string()
    .optional()
    .describe(
      "Override the BearQ public API base URL. Defaults to https://api.bearq.smartbear.com",
    ),
});

export class BearQClient implements Client {
  private _apiToken: string | undefined;
  private _baseUrl: string = DEFAULT_API_BASE_URL;

  name = "BearQ";
  capabilityPrefix = "bearq";
  configPrefix = "BearQ";
  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this._apiToken = config.api_token;
    if (config.api_base_url) this._baseUrl = config.api_base_url;
  }

  getAuthToken(): string | null {
    const contextHeader = getRequestHeader(AUTHORIZATION_HEADER);
    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;
      if (token.startsWith("Bearer ")) token = token.substring(7);
      return token;
    }
    return this._apiToken ?? null;
  }

  isConfigured(): boolean {
    return true;
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
