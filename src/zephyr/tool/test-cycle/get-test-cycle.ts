import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  getTestCycleParams,
  getTestCycleResponse,
} from "../../common/rest-api-schemas.js";

export class GetTestCycle extends Tool<ZephyrClient> {
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
    const response = await this.client
      .getApiClient()
      .get(`/testcycles/${testCycleIdOrKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
