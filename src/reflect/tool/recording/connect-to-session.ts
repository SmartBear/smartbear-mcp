import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import { WebSocketManager } from "../../websocket-manager";
import type { ReflectClient } from "../../client";
import type { MCPConnectToSessionSuccessResponse } from "../../types/mcp";

export class ConnectToSession extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Connect To Session",
    summary:
      "Connect to an active Reflect recording session via WebSocket to enable interactive control",
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

  handle: ToolCallback<ZodRawShape> = async (args) => {
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

    const wsManager = new WebSocketManager(sessionId, this.client.getApiToken());

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

    const { platform, test } = connectResponse;
    this.client.registerConnection(sessionId, wsManager, { platform, test });

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
