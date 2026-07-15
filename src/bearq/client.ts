import { z } from "zod";

import { getUserAgent } from "../common/info.ts";
import { getRequestHeader } from "../common/request-context.ts";
import type { SmartBearMcpServer } from "../common/server.ts";
import { ToolError } from "../common/tools.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import {
  AUTHORIZATION_HEADER,
  DEFAULT_API_BASE_URL,
} from "./config/constants.ts";
import { ListEnvironments } from "./tool/environments/list-environments.ts";
import { ChatWithQaLead } from "./tool/tasks/chat-with-qa-lead.ts";
import { ExpandApplicationModel } from "./tool/tasks/expand-application-model.ts";
import { GetTask } from "./tool/tasks/get-task.ts";
import { GetTaskStatus } from "./tool/tasks/get-task-status.ts";
import { RefineAllDraftTests } from "./tool/tasks/refine-all-draft-tests.ts";
import { RefineTestCases } from "./tool/tasks/refine-test-cases.ts";
import { RefineTestsInFunctionalAreas } from "./tool/tasks/refine-tests-in-functional-areas.ts";
import { RunRegressionTests } from "./tool/tasks/run-regression-tests.ts";
import { RunTestCases } from "./tool/tasks/run-test-cases.ts";
import { RunTestsInFunctionalAreas } from "./tool/tasks/run-tests-in-functional-areas.ts";
import { StopTask } from "./tool/tasks/stop-task.ts";
import { WaitForTask } from "./tool/tasks/wait-for-task.ts";

const BEARER_PREFIX_LENGTH = "Bearer ".length;

const ConfigurationSchema = z.object({
  api_token: z.string().describe("BearQ workspace API token (Bearer)."),
  api_base_url: z
    .string()
    .optional()
    .describe(
      "Override the BearQ public API base URL. Defaults to https://api.bearq.smartbear.com",
    ),
});

export class BearqClient implements Client {
  private _apiToken: string | undefined;
  private _baseUrl: string = DEFAULT_API_BASE_URL;

  name = "BearQ";
  capabilityPrefix = "bearq";
  configPrefix = "BearQ";
  config = ConfigurationSchema;

  configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this._apiToken = config.api_token;
    if (config.api_base_url) {
      this._baseUrl = config.api_base_url;
    }
    return Promise.resolve();
  }

  getAuthToken(): string | null {
    const contextHeader = getRequestHeader(AUTHORIZATION_HEADER);
    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;
      if (token.startsWith("Bearer ")) {
        token = token.slice(BEARER_PREFIX_LENGTH);
      }
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
    if (!token) {
      throw new ToolError("BearQ API token not found");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
    };
  }

  registerTools(
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
      new ListEnvironments(this),
    ];
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
    return Promise.resolve();
  }
}
