import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools.js";
import type { ToolParams } from "../../../common/types.js";
import type { ZephyrClient } from "../../client.js";
import {
  listTestCasesCursorPaginatedQueryParams,
  listTestCasesCursorPaginatedResponse,
} from "../../common/rest-api-schemas.js";

export class GetTestCases extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Cases",
    summary: "Get details of test cases in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: listTestCasesCursorPaginatedQueryParams,
    outputSchema: listTestCasesCursorPaginatedResponse,
    examples: [
      {
        description: "Get the first 10 Test Cases",
        parameters: {
          limit: 10,
          startAtId: 1,
        },
        expectedOutput: "The first 10 Test Cases with their details",
      },
      {
        description: "Get any Test Case",
        parameters: {
          limit: 1,
        },
        expectedOutput: "One Test Case with its details",
      },
      {
        description: "Get five Test Cases starting from the ID 123",
        parameters: {
          limit: 5,
          startAtId: 123,
        },
        expectedOutput:
          "Five Test Cases starting from the ID 123 with their details",
      },
      {
        description: "Get one Test Case from the project PROJ",
        parameters: {
          projectKey: "PROJ",
          limit: 1,
        },
        expectedOutput: "One Test Case from project PROJ with its details",
      },
      {
        description: "Get one Test Case from the folder with ID 123",
        parameters: {
          folderId: 123,
          limit: 1,
        },
        expectedOutput:
          "One Test Case from folder with ID 123 with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const parsedArgs = listTestCasesCursorPaginatedQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/testcases/nextgen", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
