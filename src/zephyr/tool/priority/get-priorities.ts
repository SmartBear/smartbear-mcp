import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { listPrioritiesQueryParams, listPrioritiesResponse } from "../../common/rest-api-schemas.js";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetPrioritiesInputSchema = listPrioritiesQueryParams;

 export class GetPriorities implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get priorities",
    summary: "Get Zephyr Test Case priorities with optional filters",
    readOnly: true,
    idempotent: true,
    inputSchema: GetPrioritiesInputSchema,
    outputSchema: listPrioritiesResponse,
    examples: [
      {
        description: "Get the first 10 priorities",
        parameters: {
          maxResults: 10, 
          startAt: 0 },
        expectedOutput: "The first 10 priorities with their details",
      },
      {
        description: "Get priorities for a specific project",
        parameters: { projectKey: "PROJ"},
        expectedOutput: "The priorities for project PROJ",
      },
      {
        description: "Get all priorities",
        parameters: {},
        expectedOutput: "All priorities",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const getPrioritiesInput = listPrioritiesQueryParams.parse(args);
    const response = await this.apiClient.get("/priorities", getPrioritiesInput);
    return {
      structuredContent: response,
      content: [],
    };
  };
}