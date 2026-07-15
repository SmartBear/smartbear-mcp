import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { ReflectClient } from "../../client.ts";
import { API_HOSTNAME, WEB_APP_HOSTNAME } from "../../config/constants.ts";
import type { TestPlatform } from "../../types/common.ts";

export class ListSegments extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "List Segments",
    toolset: "Tests",
    summary:
      "Retrieve available reusable test segments for the given platform type. Segments are reusable test steps with an optional set of parameters that can used across multiple tests.",
    readOnly: true,
    idempotent: true,
    inputSchema: z.object({
      platform: z
        .enum(["api", "native-mobile", "web"])
        .describe("The platform type to retrieve segments for"),
      offset: z.number().optional().describe("Offset for pagination"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of segments to return"),
    }),
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

    const urlPath = this.client.isOauthRequest()
      ? `https://${WEB_APP_HOSTNAME}/api/mcp`
      : `https://${API_HOSTNAME}/v1`;
    const url = `${urlPath}/segments?type=${platform}&offset=${offset}&limit=${limit}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.client.getHeaders(),
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
