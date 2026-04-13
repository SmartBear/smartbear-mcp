import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types";
import { API_KEY_HEADER } from "./config/constants";
import { SapTest } from "./prompt/sap-test";
import { AddPromptStep } from "./tool/recording/add-prompt-step";
import { AddSegment } from "./tool/recording/add-segment";
import { ConnectToSession } from "./tool/recording/connect-to-session";
import { DeletePreviousStep } from "./tool/recording/delete-previous-step";
import { GetScreenshot } from "./tool/recording/get-screenshot";
import { CancelSuiteExecution } from "./tool/suites/cancel-suite-execution";
import { ExecuteSuite } from "./tool/suites/execute-suite";
import { GetSuiteExecutionStatus } from "./tool/suites/get-suite-execution-status";
import { ListSuiteExecutions } from "./tool/suites/list-suite-executions";
import { ListSuites } from "./tool/suites/list-suites";
import { GetTestStatus } from "./tool/tests/get-test-status";
import { ListSegments } from "./tool/tests/list-segments";
import { ListTests } from "./tool/tests/list-tests";
import { RunTest } from "./tool/tests/run-test";
import type { TestPlatform } from "./types/common";
import type { WebSocketManager } from "./websocket-manager";

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Reflect API authentication token"),
});

// ReflectClient class implementing the Client interface
export class ReflectClient implements Client {
  private _apiToken: string | undefined;
  private activeConnections = new Map<string, WebSocketManager>();
  private sessionStates = new Map<
    string,
    { platform: TestPlatform; test: { name: string } }
  >();
  private mcpSessionConnections = new Map<string, Set<string>>();

  name = "Reflect";
  toolPrefix = "reflect";
  configPrefix = "Reflect";

  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this._apiToken = config.api_token;
  }

  getAuthToken(): string | null {
    // 1. Try request context
    const contextHeader =
      getRequestHeader("Reflect-Api-Token") ||
      getRequestHeader("X-API-KEY") ||
      getRequestHeader("Authorization");

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
    return true; // Configured by default to support dynamic OAuth tokens
  }

  getApiToken(): string {
    return this.getAuthToken() || "";
  }

  getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Reflect API token not found");
    }

    return {
      [API_KEY_HEADER]: token,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
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
    mcpSessionId?: string,
  ): void {
    this.activeConnections.set(sessionId, ws);
    this.sessionStates.set(sessionId, state);
    if (mcpSessionId) {
      const existing =
        this.mcpSessionConnections.get(mcpSessionId) ?? new Set();
      existing.add(sessionId);
      this.mcpSessionConnections.set(mcpSessionId, existing);
    }
  }

  async cleanupSession(mcpSessionId: string): Promise<void> {
    const reflectSessionIds = this.mcpSessionConnections.get(mcpSessionId);
    if (!reflectSessionIds) return;

    for (const reflectSessionId of reflectSessionIds) {
      const ws = this.activeConnections.get(reflectSessionId);
      if (ws) {
        await ws.disconnect();
        this.activeConnections.delete(reflectSessionId);
        this.sessionStates.delete(reflectSessionId);
      }
    }
    this.mcpSessionConnections.delete(mcpSessionId);
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
    const prompts = [new SapTest(this)];

    for (const prompt of prompts) {
      register(prompt.name, prompt.params, prompt.callback);
    }
  }
}
