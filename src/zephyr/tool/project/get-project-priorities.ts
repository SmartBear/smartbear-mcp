import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { listPrioritiesQueryParams, listPrioritiesResponse } from "../../common/rest-api-schemas.js";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetProjectPrioritiesInputSchema = listPrioritiesQueryParams;

 export class GetProjectPriorities implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get project priorities",
    summary: "Get project priorities with optional filters",
    readOnly: true,
    idempotent: true,
    inputSchema: GetProjectPrioritiesInputSchema,
    outputSchema: listPrioritiesResponse,
    examples: [
      {
        description: "Get the first 10 project priorities",
        parameters: {startAt: 0 },
        expectedOutput: "The first 10 project priorities with their details",
      },
      {
        description: "Get priorities for a specific project",
        parameters: { projectKey: "PROJ"},
        expectedOutput: "The priorities for project PROJ",
      },
      {
        description: "Get all project priorities",
        parameters: {},
        expectedOutput: "All project priorities",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const { maxResults, startAt, projectKey } = args as any;
    const response = await this.apiClient.get("/priorities", {
      maxResults,
      startAt,
      projectKey,
    });
    return {
      structuredContent: response,
      content: [],
    };
  };
}