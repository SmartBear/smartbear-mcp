import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  getTestExecutionParams,
  getTestExecutionResponse,
} from "../../common/rest-api-schemas";

export class GetTestExecution extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Execution",
    summary: "Get details of test execution specified by id or key in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: getTestExecutionParams,
    outputSchema: getTestExecutionResponse,
    examples: [
      {
        description: "Get the test execution with id 1",
        parameters: {
          testExecutionIdOrKey: "1",
        },
        expectedOutput: "The test execution with its details",
      },
      {
        description: "Get the test execution with key 'PROJ-E123'",
        parameters: {
          testExecutionIdOrKey: "PROJ-E123",
        },
        expectedOutput: "The test execution with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } = getTestExecutionParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testexecutions/${testExecutionIdOrKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
