import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools.js";
import type { ToolParams } from "../../../common/types.js";
import type { ZephyrClient } from "../../client.js";
import {
  listPrioritiesQueryParams,
  listPrioritiesResponse,
} from "../../common/rest-api-schemas.js";

export class GetPriorities extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get priorities",
    summary: "Get Zephyr Test Case priorities with optional filters",
    readOnly: true,
    idempotent: true,
    inputSchema: listPrioritiesQueryParams,
    outputSchema: listPrioritiesResponse,
    examples: [
      {
        description: "Get the first 10 priorities",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 priorities with their details",
      },
      {
        description: "Get priorities for a specific project",
        parameters: { projectKey: "PROJ" },
        expectedOutput: "The priorities for project PROJ",
      },
      {
        description: "Get all priorities",
        parameters: {},
        expectedOutput: "All priorities",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const getPrioritiesInput = listPrioritiesQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/priorities", getPrioritiesInput);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
