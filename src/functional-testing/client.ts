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
import { API_KEY_HEADER } from "./config/constants";
import { ListFunctionalTestingTests } from "./tool/list-functional-testing-tests";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Swagger Functional Testing API token"),
});

export class FunctionalTestingClient implements Client {
  private _apiToken: string | undefined;

  name = "Swagger Functional Testing";
  capabilityPrefix = "functional_testing";
  configPrefix = "Swagger-Functional-Testing";

  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this._apiToken = config.api_token;
  }

  getAuthToken(): string | null {
    const contextHeader = getRequestHeader(API_KEY_HEADER);
    if (contextHeader) {
      return Array.isArray(contextHeader) ? contextHeader[0] : contextHeader;
    }
    return this._apiToken || null;
  }

  isConfigured(): boolean {
    return (
      this._apiToken !== undefined ||
      getRequestHeader(API_KEY_HEADER) !== undefined
    );
  }

  getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      throw new ToolError("Swagger Functional Testing API token not found");
    }
    return {
      [API_KEY_HEADER]: token,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const tools = [new ListFunctionalTestingTests(this)];
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
