import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import { ToolError } from "../common/tools";
import type { SmartBearMcpServer } from "../common/server";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types";
import { API_KEY_HEADER } from "./config/constants";
import { CancelSuiteExecution } from "./tool/suites/cancel-suite-execution";
import { ExecuteSuite } from "./tool/suites/execute-suite";
import { GetSuiteExecutionStatus } from "./tool/suites/get-suite-execution-status";
import { ListSuiteExecutions } from "./tool/suites/list-suite-executions";
import { ListSuites } from "./tool/suites/list-suites";
import { GetTestStatus } from "./tool/tests/get-test-status";
import { ListTests } from "./tool/tests/list-tests";
import { RunTest } from "./tool/tests/run-test";
import { AddPromptStep } from "./tool/recording/add-prompt-step";
import { AddSegment } from "./tool/recording/add-segment";
import { ConnectToSession } from "./tool/recording/connect-to-session";
import { DeletePreviousStep } from "./tool/recording/delete-previous-step";
import { GetScreenshot } from "./tool/recording/get-screenshot";
import { ListSegments } from "./tool/tests/list-segments";
import type { WebSocketManager } from "./websocket-manager";
import type { TestPlatform } from "./types/common";
import { PROMPTS } from "./prompts";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Reflect API authentication token"),
});

// ReflectClient class implementing the Client interface
export class ReflectClient implements Client {
  private headers: Record<string, string> = {};
  private apiToken = "";
  private activeConnections = new Map<string, WebSocketManager>();
  private sessionStates = new Map<
    string,
    { platform: TestPlatform; test: { name: string } }
  >();

  name = "Reflect";
  toolPrefix = "reflect";
  configPrefix = "Reflect";

  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.apiToken = config.api_token;
    this.headers = {
      [API_KEY_HEADER]: `${config.api_token}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  isConfigured(): boolean {
    return Object.keys(this.headers).length !== 0;
  }

  getApiToken(): string {
    return this.apiToken;
  }

  getHeaders(): Record<string, string> {
    return this.headers;
  }

  getSessionState(
    sessionId: string,
  ): { platform: TestPlatform; test: { name: string } } | undefined {
    return this.sessionStates.get(sessionId);
  }

  isSessionConnected(sessionId: string): boolean {
    const wsManager = this.activeConnections.get(sessionId);
    return wsManager?.isConnected() ?? false;
  }

  getConnectedSession(sessionId: string): WebSocketManager {
    if (!this.isSessionConnected(sessionId)) {
      throw new ToolError(
        `Session ${sessionId} is not connected. Call connect_to_session first.`,
      );
    }
    return this.activeConnections.get(sessionId) as WebSocketManager;
  }

  registerConnection(
    sessionId: string,
    ws: WebSocketManager,
    state: { platform: TestPlatform; test: { name: string } },
  ): void {
    this.activeConnections.set(sessionId, ws);
    this.sessionStates.set(sessionId, state);
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
      new CancelSuiteExecution(this),
      new ListTests(this),
      new RunTest(this),
      new GetTestStatus(this),
      new ListSegments(this),
      new ConnectToSession(this),
      new AddPromptStep(this),
      new GetScreenshot(this),
      new DeletePreviousStep(this),
      new AddSegment(this),
    ];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }

  registerPrompts(register: RegisterPromptFunction): void {
    for (const prompt of PROMPTS) {
      register(prompt.name, prompt.params, prompt.callback);
    }
  }
}
