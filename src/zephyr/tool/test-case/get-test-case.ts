import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  getTestCaseParams,
  getTestCaseResponse,
} from "../../common/rest-api-schemas.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export class GetTestCase implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Test Case",
    summary: "Get details of test case specified by key in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: getTestCaseParams,
    outputSchema: getTestCaseResponse,
    examples: [
      {
        description: "Get the test case with key 'SA-T10'",
        parameters: {
          testCaseKey: "SA-T10",
        },
        expectedOutput: "The test case with its details",
      },
      {
        description: "Get the test case with key 'MM2-T1'",
        parameters: {
          testCaseKey: "MM2-T1",
        },
        expectedOutput: "The test case with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const { testCaseKey } = getTestCaseParams.parse(args);
    const response = await this.apiClient.get(`/testcases/${testCaseKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
