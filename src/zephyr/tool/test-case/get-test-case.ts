import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import { TestCaseKeySchema, TestCaseSchema } from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetTestCaseInputSchema = z.object({
  testCaseKey: TestCaseKeySchema,
});

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
    inputSchema: GetTestCaseInputSchema,
    outputSchema: TestCaseSchema,
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
    const { testCaseKey } = GetTestCaseInputSchema.parse(args);
    const response = await this.apiClient.get(`/testcases/${testCaseKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
