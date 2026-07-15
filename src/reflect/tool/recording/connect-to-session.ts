import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { ReflectClient } from "../../client.ts";
import type { McpConnectToSessionSuccessResponse } from "../../types/mcp.ts";
import { WebSocketManager } from "../../websocket-manager.ts";

export class ConnectToSession extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Connect To Session",
    toolset: "Recording",
    summary: `Connect to an active Reflect recording session via WebSocket to enable interactive control. When creating or editing a Reflect test using a connected recording session, follow these guidelines:

1. After connecting to a session, get the list of segments for the session's platform type so you know what actions could be added via segments vs needing to create new steps. Do not list tests, only list segments.
2. Before performing an action, take a screenshot to understand the current state of the application.
3. Each add_prompt_step request should perform a single action or assertion. Do not combine multiple actions or assertions into a single step.
4. Only perform one action at a time unless you're sure the action won't move the application to a different screen. For example, you can send multiple add_prompt_step requests to fill out individual form fields if those fields are visible on the current screen.
5. Check the list of existing Segments to see if a Segment exists that achieves a similar goal to what you're trying to do next. If so, add the segment instead of creating new steps.
6. If a step fails, use delete_previous_step to remove it and try a different approach.
7. After completing a task, if the task required multiple prompt steps, add a final prompt step that validates the current state of the page based on what you see on the screen. In your validation, do not reference information that can change from run to run.`,
    readOnly: false,
    idempotent: true,
    inputSchema: z.object({
      sessionId: z
        .string()
        .describe("The ID of the Reflect recording session to connect to"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args, extra) => {
    const { sessionId } = args as { sessionId: string };
    if (!sessionId) {
      throw new ToolError("sessionId argument is required");
    }

    if (this.client.isSessionConnected(sessionId)) {
      return this.buildExistingSessionResult(sessionId);
    }

    // This identifies the MCP session, rather than the Reflect recording session.
    // There can be multiple MCP sessions if we're running in HTTP mode.
    return await this.connectNewSession(sessionId, extra?.sessionId);
  };

  private buildExistingSessionResult(sessionId: string) {
    const state = this.client.getSessionState(sessionId);
    if (!state) {
      throw new ToolError("Failed to get session state");
    }
    const { platform, test } = state;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, sessionId, platform, test }),
        },
      ],
    };
  }

  private async connectNewSession(sessionId: string, mcpSessionId?: string) {
    const wsManager = new WebSocketManager(
      sessionId,
      this.client.getAuthHeader(),
    );

    try {
      await wsManager.connect();
    } catch (error) {
      throw new ToolError(
        `Failed to connect to session: ${(error as Error).message}`,
        { cause: error },
      );
    }

    const connectResponse = await this.performConnectHandshake(wsManager);

    const { platform, test } = connectResponse;
    this.client.registerConnection(
      sessionId,
      wsManager,
      { platform, test },
      mcpSessionId,
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, sessionId, platform, test }),
        },
      ],
    };
  }

  private async performConnectHandshake(
    wsManager: WebSocketManager,
  ): Promise<McpConnectToSessionSuccessResponse> {
    const connectId = globalThis.crypto.randomUUID();
    try {
      const connectResponsePromise = wsManager.waitForResponse(connectId);
      await wsManager.sendMcpMessage({
        type: "mcp:connect-to-session",
        id: connectId,
      });
      return (await connectResponsePromise) as McpConnectToSessionSuccessResponse;
    } catch (connectError) {
      await wsManager.disconnect();
      throw new ToolError(
        `MCP connect-to-session failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`,
        { cause: connectError },
      );
    }
  }
}
