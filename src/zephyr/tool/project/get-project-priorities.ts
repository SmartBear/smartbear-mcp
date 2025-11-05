import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  GetProjectPrioritiesResponseSchema,
  GetProjectPrioritiesQueryValuesSchema,
} from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const  GetProjectPrioritiesInputSchema = GetProjectPrioritiesQueryValuesSchema;
 type GetProjectPrioritiesInput = z.infer<typeof GetProjectPrioritiesInputSchema>;

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
    outputSchema: GetProjectPrioritiesResponseSchema,
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
handle: ToolCallback<ZodRawShape> = async (args: GetProjectPrioritiesInput) => {
    const response = await this.apiClient.get("/priorities", args);
    return {
      structuredContent: response,
      content: [],
    };
  };
}