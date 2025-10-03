import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../common/api-client.js";
import {
  MaxResultsSchema,
  StartAtSchema,
  ZephyrProjectListSchema,
} from "../common/types.js";
import type { ZephyrTool } from "./zephyr-tool.js";

export class GetProjects implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification = {
    title: "Get Projects",
    summary: "Get details of projects in Zephyr",
    outputFormat: ZephyrProjectListSchema.description,
    parameters: [
      {
        name: "maxResults",
        type: MaxResultsSchema,
        required: false,
      },
      {
        name: "startAt",
        type: StartAtSchema,
        required: false,
      },
    ],
  };

  handle: ToolCallback<{ [key: string]: any }> = async (args, _extra) => {
    const { maxResults, startAt } = args;
    const response = await this.apiClient.get("/projects", {
      maxResults,
      startAt,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  };
}
