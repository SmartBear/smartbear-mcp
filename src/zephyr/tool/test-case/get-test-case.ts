import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestCaseParams,
  GetTestCase200Response as GetTestCaseResponse,
} from "../../common/rest-api-schemas";

export class GetTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Case",
    summary: "Get details of test case specified by key in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCaseParams,
    outputSchema: GetTestCaseResponse,
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

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = GetTestCaseParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
