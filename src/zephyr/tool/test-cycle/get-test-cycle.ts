import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  getTestCycleParams,
  getTestCycleResponse,
} from "../../common/rest-api-schemas.js";
import type { ZephyrTool } from "../zephyr-tool.js";

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
    inputSchema: getTestCycleParams,
    outputSchema: getTestCycleResponse,
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
    const { testCycleIdOrKey } = getTestCycleParams.parse(args);
    const response = await this.apiClient.get(
      `/testcycles/${testCycleIdOrKey}`,
    );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
