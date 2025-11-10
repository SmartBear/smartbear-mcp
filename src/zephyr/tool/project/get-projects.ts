import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  listProjectsQueryParams,
  listProjectsResponse,
} from "../../common/rest-api-schemas.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export class GetProjects implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Projects",
    summary: "Get details of projects in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: listProjectsQueryParams,
    outputSchema: listProjectsResponse,
    examples: [
      {
        description: "Get the first 10 projects",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 projects with their details",
      },
      {
        description: "Get any project",
        parameters: {
          maxResults: 1,
        },
        expectedOutput: "One project with its details",
      },
      {
        description:
          "Get five projects starting from the 7th project of the list",
        parameters: {
          maxResults: 5,
          startAt: 6,
        },
        expectedOutput: "The 7th to the 11th projects with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsedArgs = listProjectsQueryParams.parse(args);
    const response = await this.apiClient.get("/projects", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
