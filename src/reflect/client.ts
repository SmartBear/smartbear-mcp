import { z } from "zod";

import { getUserAgent } from "../common/info.ts";
import { getRequestHeader } from "../common/request-context.ts";
import type { SmartBearMcpServer } from "../common/server.ts";
import { ToolError } from "../common/tools.ts";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import {
  API_KEY_HEADER,
  AUTHORIZATION_HEADER,
  REFLECT_API_TOKEN_HEADER,
} from "./config/constants.ts";
import { SapTest } from "./prompt/sap-test.ts";
import { AddPromptStep } from "./tool/recording/add-prompt-step.ts";
import { AddSegment } from "./tool/recording/add-segment.ts";
import { ConnectToSession } from "./tool/recording/connect-to-session.ts";
import { DeletePreviousStep } from "./tool/recording/delete-previous-step.ts";
import { GetScreenshot } from "./tool/recording/get-screenshot.ts";
import { CancelSuiteExecution } from "./tool/suites/cancel-suite-execution.ts";
import { ExecuteSuite } from "./tool/suites/execute-suite.ts";
import { GetSuiteExecutionStatus } from "./tool/suites/get-suite-execution-status.ts";
import { ListSuiteExecutions } from "./tool/suites/list-suite-executions.ts";
import { ListSuites } from "./tool/suites/list-suites.ts";
import { GetTestDetail } from "./tool/tests/get-test-detail.ts";
import { GetTestStatus } from "./tool/tests/get-test-status.ts";
import { ListSegments } from "./tool/tests/list-segments.ts";
import { ListTests } from "./tool/tests/list-tests.ts";
import { RunTest } from "./tool/tests/run-test.ts";
import type { TestPlatform } from "./types/common.ts";
import type { WebSocketManager } from "./websocket-manager.ts";

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
  capabilityPrefix = "reflect";
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
      getRequestHeader(REFLECT_API_TOKEN_HEADER) ||
      getRequestHeader(API_KEY_HEADER) ||
      getRequestHeader(AUTHORIZATION_HEADER);

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

  isOAuthRequest(): boolean {
    if (
      getRequestHeader(REFLECT_API_TOKEN_HEADER) ||
      getRequestHeader(API_KEY_HEADER)
    ) {
      return false;
    }
    const authHeader = getRequestHeader(AUTHORIZATION_HEADER);
    if (!authHeader) {
      return false;
    }
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    return headerValue.toLowerCase().startsWith("bearer ");
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Reflect API token not found");
    }
    if (this.isOAuthRequest()) {
      return { Authorization: `Bearer ${token}` };
    }
    return { [API_KEY_HEADER]: token };
  }

  getHeaders(): Record<string, string> {
    return {
      ...this.getAuthHeader(),
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
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
    // Only available for API key authentication
    const apiOnlyTools = [
      new ListSuites(this),
      new ListSuiteExecutions(this),
      new GetSuiteExecutionStatus(this),
      new ExecuteSuite(this),
      new CancelSuiteExecution(this),
      new ListTests(this),
      new GetTestDetail(this),
      new RunTest(this),
      new GetTestStatus(this),
    ];

    // Available for both OAuth and API key authentication
    const oAuthAndApiSupportedTools = [
      new ListSegments(this),
      new ConnectToSession(this),
      new AddPromptStep(this),
      new GetScreenshot(this),
      new DeletePreviousStep(this),
      new AddSegment(this),
    ];

    const tools = this.isOAuthRequest()
      ? oAuthAndApiSupportedTools
      : [...oAuthAndApiSupportedTools, ...apiOnlyTools];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }

  async registerPrompts(register: RegisterPromptFunction): Promise<void> {
    const prompts = [new SapTest(this)];

    for (const prompt of prompts) {
      register(prompt.specification, prompt.callback);
    }
  }
}
