import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import type { MCPConnectToSessionSuccessResponse } from "../../types/mcp";
import { WebSocketManager } from "../../websocket-manager";

export class ConnectToSession extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Connect To Session",
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
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session to connect to",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args, extra) => {
    const { sessionId } = args as { sessionId: string };
    if (!sessionId) throw new ToolError("sessionId argument is required");

    if (this.client.isSessionConnected(sessionId)) {
      const state = this.client.getSessionState(sessionId);
      const { platform, test } = state!;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, sessionId, platform, test }),
          },
        ],
      };
    }

    const wsManager = new WebSocketManager(
      sessionId,
      this.client.getApiToken(),
    );

    try {
      await wsManager.connect();
    } catch (error) {
      throw new ToolError(
        `Failed to connect to session: ${(error as Error).message}`,
      );
    }

    const connectId = randomUUID();
    let connectResponse: MCPConnectToSessionSuccessResponse;
    try {
      const connectResponsePromise = wsManager.waitForResponse(connectId);
      await wsManager.sendMcpMessage({
        type: "mcp:connect-to-session",
        id: connectId,
      });
      connectResponse =
        (await connectResponsePromise) as MCPConnectToSessionSuccessResponse;
    } catch (connectError) {
      await wsManager.disconnect();
      throw new ToolError(
        `MCP connect-to-session failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`,
      );
    }

    // This identifies the MCP session, rather than the Reflect recording session.
    // There can be multiple MCP sessions if we're running in HTTP mode.
    const mcpSessionId = extra?.sessionId;
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
          type: "text",
          text: JSON.stringify({ success: true, sessionId, platform, test }),
        },
      ],
    };
  };
}
