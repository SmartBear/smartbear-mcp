import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import { TestCycleIdOrKeySchema, TestCycleSchema } from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetTestCycleInputSchema = z.object({
  testCycleIdOrKey: TestCycleIdOrKeySchema,
});

export class GetTestCycle implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Test Cycle",
    summary: "Get details of test cycle specified by id or key in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCycleInputSchema,
    outputSchema: TestCycleSchema,
    examples: [
      {
        description: "Get the test cycle with id 1",
        parameters: {
          testCycleIdOrKey: "1",
        },
        expectedOutput: "The test cycle with its details",
      },
      {
        description: "Get the test cycle with key 'SA-R40'",
        parameters: {
          testCycleIdOrKey: "SA-R40",
        },
        expectedOutput: "The test cycle with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const { testCycleIdOrKey } = GetTestCycleInputSchema.parse(args);
    const response = await this.apiClient.get(
      `/testcycles/${testCycleIdOrKey}`,
    );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
