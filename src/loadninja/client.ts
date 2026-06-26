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
import { CreateProject } from "./tool/project/create-project";
import { ListProjects } from "./tool/project/list-projects";
import { CreateScenario } from "./tool/scenario/create-scenario";
import { GetScenario } from "./tool/scenario/get-scenario";
import { ListScenarios } from "./tool/scenario/list-scenarios";
import { ListScripts } from "./tool/script/list-scripts";
import { GetTestRunRawStats } from "./tool/test-run/get-test-run-raw-stats";
import { GetTestRunStats } from "./tool/test-run/get-test-run-stats";
import { GetTestRunStatus } from "./tool/test-run/get-test-run-status";
import { GetTestRunSummary } from "./tool/test-run/get-test-run-summary";
import { ListTestRuns } from "./tool/test-run/list-test-runs";
import { StartTestRun } from "./tool/test-run/start-test-run";
import { StopTestRun } from "./tool/test-run/stop-test-run";

const ConfigurationSchema = z.object({
  api_key: z.string().describe("LoadNinja API key (32-symbol key)."),
  api_base_url: z
    .string()
    .optional()
    .describe(
      "Override the LoadNinja API base URL. Defaults to https://api.loadninja.com/v1",
    ),
});

export class LoadNinjaClient implements Client {
  private _apiKey: string | undefined;
  private _baseUrl: string = DEFAULT_API_BASE_URL;

  name = "LoadNinja";
  capabilityPrefix = "loadninja";
  configPrefix = "LoadNinja";
  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {

    console.info("LoadNinja client configuration");
    this._apiKey = config.api_key;
    if (config.api_base_url) this._baseUrl = config.api_base_url;
  }

  getAuthToken(): string | null {
    const contextHeader = getRequestHeader(AUTHORIZATION_HEADER);
    if (contextHeader) {
      return Array.isArray(contextHeader) ? contextHeader[0] : contextHeader;
    }
    return this._apiKey ?? null;
  }

  isConfigured(): boolean {
    return !!this._apiKey;
  }

  getBaseUrl(): string {
    return this._baseUrl;
  }

  getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) throw new ToolError("LoadNinja API key not found");
    return {
      authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    console.log("Register tools");
    const tools = [
      new ListProjects(this),
      new CreateProject(this),
      new GetScenario(this),
      new CreateScenario(this),
      new ListScenarios(this),
      new ListScripts(this),
      new GetTestRunStatus(this),
      new GetTestRunSummary(this),
      new GetTestRunStats(this),
      new GetTestRunRawStats(this),
      new ListTestRuns(this),
      new StartTestRun(this),
      new StopTestRun(this),
    ];
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
