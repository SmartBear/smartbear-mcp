import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";

export class AddSegment extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Add Segment",
    summary:
      "Insert a reusable test segment into an active Reflect recording session",
    readOnly: false,
    idempotent: false,
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session",
        required: true,
      },
      {
        name: "segmentId",
        type: z.number(),
        description: "The ID of the segment to add",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { sessionId, segmentId } = args as {
      sessionId: string;
      segmentId: number;
    };
    if (!sessionId) throw new ToolError("sessionId argument is required");
    if (segmentId === undefined || segmentId === null)
      throw new ToolError("segmentId argument is required");

    const wsManager = this.client.getConnectedSession(sessionId);

    const id = randomUUID();
    const responsePromise = wsManager.waitForResponse(id);
    await wsManager.sendMcpMessage({
      type: "mcp:add-segment",
      id,
      segmentId,
    });

    await responsePromise;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            sessionId,
            message: `Successfully added and executed segment ${segmentId}`,
            segmentId,
          }),
        },
      ],
    };
  };
}
