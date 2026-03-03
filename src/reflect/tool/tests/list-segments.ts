import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME, API_KEY_HEADER } from "../../config/constants";

export class ListSegments extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "List Segments",
    summary:
      "Retrieve available reusable test segments for the given platform type. Segments are reusable test steps with an optional set of parameters that can used across multiple tests.",
    readOnly: true,
    idempotent: true,
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session",
        required: true,
      },
      {
        name: "offset",
        type: z.number(),
        description: "Offset for pagination",
        required: false,
      },
      {
        name: "limit",
        type: z.number(),
        description: "Maximum number of segments to return",
        required: false,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const {
      sessionId,
      offset = 0,
      limit = 25,
    } = args as {
      sessionId: string;
      offset?: number;
      limit?: number;
    };
    if (!sessionId) throw new ToolError("sessionId argument is required");

    const state = this.client.getSessionState(sessionId);
    if (!state) {
      throw new ToolError(
        `Session ${sessionId} is not connected or has no platform information. Call connect_to_session first.`,
      );
    }

    const url = `https://${API_HOSTNAME}/v1/segments?type=${state.platform}&offset=${offset}&limit=${limit}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        [API_KEY_HEADER]: this.client.getApiToken(),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to list segments: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      segments: unknown[];
      count: number;
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            segments: data.segments,
            count: data.count,
            message: `Found ${data.count} segment(s) for platform '${state.platform}'`,
          }),
        },
      ],
    };
  };
}
