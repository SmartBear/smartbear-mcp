import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools.js";
import type { ToolParams } from "../../../common/types.js";
import type { ZephyrClient } from "../../client.js";
import {
  listTestCyclesQueryParams,
  listTestCyclesResponse,
} from "../../common/rest-api-schemas.js";

export class GetTestCycles extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Cycles",
    summary: "Get details of Test Cycles in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: listTestCyclesQueryParams,
    outputSchema: listTestCyclesResponse,
    examples: [
      {
        description: "Get the first 10 Test Cycles",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 Test Cycles with their details",
      },
      {
        description: "Get any Test Cycle",
        parameters: {
          maxResults: 1,
        },
        expectedOutput: "One Test Cycle with its details",
      },
      {
        description:
          "Get five Test Cycles starting from the 7th Test Cycles of the list",
        parameters: {
          maxResults: 5,
          startAt: 6,
        },
        expectedOutput: "The 7th to the 11th Test Cycles with their details",
      },
      {
        description: "Get one Test Cycle from the project PROJ",
        parameters: {
          projectKey: "PROJ",
          maxResults: 1,
        },
        expectedOutput: "One Test Cycle from project PROJ with its details",
      },
      {
        description: "Get one Test Cycle from the folder with ID 123",
        parameters: {
          folderId: 123,
          maxResults: 1,
        },
        expectedOutput:
          "One Test Cycle from folder with ID 123 with its details",
      },
      {
        description: "Get one Test Cycle from the version 456",
        parameters: {
          jiraProjectVersionId: 456,
          maxResults: 1,
        },
        expectedOutput: "One Test Cycle from version 456 with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsedArgs = listTestCyclesQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/testcycles", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
