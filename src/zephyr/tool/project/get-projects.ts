import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  listProjectsQueryParams,
  listProjects200Response as listProjectsResponse,
} from "../../common/rest-api-schemas";

export class GetProjects extends Tool<ZephyrClient> {
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
    const response = await this.client
      .getApiClient()
      .get("/projects", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
