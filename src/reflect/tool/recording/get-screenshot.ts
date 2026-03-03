import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import type { MCPGetScreenshotSuccessResponse } from "../../types/mcp";

export class GetScreenshot extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Get Screenshot",
    summary:
      "Capture a screenshot from the current state of an active Reflect recording session",
    readOnly: true,
    idempotent: true,
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { sessionId } = args as { sessionId: string };
    if (!sessionId) throw new ToolError("sessionId argument is required");

    const wsManager = this.client.getConnectedSession(sessionId);

    const id = randomUUID();
    const responsePromise = wsManager.waitForResponse(id);
    await wsManager.sendMcpMessage({
      type: "mcp:get-screenshot",
      id,
    });

    const response = (await responsePromise) as MCPGetScreenshotSuccessResponse;
    const { imageBase64, state } = response;

    if (!imageBase64) {
      throw new ToolError("No imageBase64 in screenshot response");
    }

    return {
      content: [
        {
          type: "image",
          data: imageBase64,
          mimeType: "image/png",
        },
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Screenshot captured",
            state,
          }),
        },
      ],
    };
  };
}
