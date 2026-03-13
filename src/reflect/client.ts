import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import type { SmartBearMcpServer } from "../common/server";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { API_KEY_HEADER } from "./config/constants";
import { cancelSuiteExecution } from "./tool/suites/cancel-suite-execution";
import { ExecuteSuite } from "./tool/suites/execute-suite";
import { GetSuiteExecutionStatus } from "./tool/suites/get-suite-execution-status";
import { ListSuiteExecutions } from "./tool/suites/list-suite-executions";
import { ListSuites } from "./tool/suites/list-suites";
import { GetTestStatus } from "./tool/tests/get-test-status";
import { ListTests } from "./tool/tests/list-tests";
import { RunTest } from "./tool/tests/run-test";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Reflect API authentication token"),
});

// ReflectClient class implementing the Client interface
export class ReflectClient implements Client {
  private headers = {};

  name = "Reflect";
  toolPrefix = "reflect";
  configPrefix = "Reflect";

  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.headers = {
      [API_KEY_HEADER]: `${config.api_token}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  isConfigured(): boolean {
    return Object.keys(this.headers).length !== 0;
  }

  getHeaders(): Record<string, string> {
    return this.headers;
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const tools = [
      new ListSuites(this),
      new ListSuiteExecutions(this),
      new GetSuiteExecutionStatus(this),
      new ExecuteSuite(this),
      new ListTests(this),
      new RunTest(this),
      new GetTestStatus(this),
    ];

    cancelSuiteExecution.register(this, register);

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
