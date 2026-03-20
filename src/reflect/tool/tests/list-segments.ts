import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME, API_KEY_HEADER } from "../../config/constants";
import type { TestPlatform } from "../../types/common";

export class ListSegments extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "List Segments",
    summary:
      "Retrieve available reusable test segments for the given platform type. Segments are reusable test steps with an optional set of parameters that can used across multiple tests.",
    readOnly: true,
    idempotent: true,
    parameters: [
      {
        name: "platform",
        type: z.enum(["api", "native-mobile", "web"]),
        description: "The platform type to retrieve segments for",
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
      platform,
      offset = 0,
      limit = 25,
    } = args as {
      platform: TestPlatform;
      offset?: number;
      limit?: number;
    };

    const url = `https://${API_HOSTNAME}/v1/segments?type=${platform}&offset=${offset}&limit=${limit}`;
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
            message: `Found ${data.count} segment(s) for platform '${platform}'`,
          }),
        },
      ],
    };
  };
}
