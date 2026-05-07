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
    inputSchema: z.object({
      sessionId: z.string().describe("The ID of the Reflect recording session"),
      format: z
        .enum(["png", "jpeg"])
        .optional()
        .describe("The image format for the screenshot (png or jpeg)"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { sessionId, format } = args as {
      sessionId: string;
      format?: "png" | "jpeg";
    };
    if (!sessionId) throw new ToolError("sessionId argument is required");

    const imageFormat = format ?? "png";
    const wsManager = this.client.getConnectedSession(sessionId);

    const id = randomUUID();
    const responsePromise = wsManager.waitForResponse(id);
    await wsManager.sendMcpMessage({
      type: "mcp:get-screenshot",
      format: imageFormat,
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
          mimeType: `image/${imageFormat}`,
        },
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Screenshot captured",
            state,
            format: imageFormat,
          }),
        },
      ],
    };
  };
}
