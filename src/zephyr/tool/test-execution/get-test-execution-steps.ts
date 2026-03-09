import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestExecutionTestSteps200Response as GetTestExecutionTestStepsResponse,
  GetTestExecutionTestStepsParams,
  GetTestExecutionTestStepsQueryParams,
} from "../../common/rest-api-schemas";

export class GetTestExecutionSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Execution Steps",
    summary:
      "Get the test steps for a Test Execution in Zephyr, including each step's status and actual result.",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestExecutionTestStepsParams.and(
      GetTestExecutionTestStepsQueryParams.partial(),
    ),
    outputSchema: GetTestExecutionTestStepsResponse,
    examples: [
      {
        description:
          "Get the first 10 test execution steps for test execution with key 'SA-E1'",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput:
          "The first 10 test execution steps with their statuses and actual results",
      },
      {
        description:
          "Get all test execution steps for test execution with ID '42'",
        parameters: {
          testExecutionIdOrKey: "42",
        },
        expectedOutput: "The test execution steps with their details",
      },
      {
        description:
          "Get test execution steps for a specific test data row in test execution 'SA-E10'",
        parameters: {
          testExecutionIdOrKey: "SA-E10",
          testDataRowNumber: 1,
        },
        expectedOutput:
          "The test execution steps for the specified test data row",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      GetTestExecutionTestStepsParams.parse(args);
    const parsedArgs = GetTestExecutionTestStepsQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(
        `/testexecutions/${testExecutionIdOrKey}/teststeps`,
        parsedArgs as Record<string, string | number | boolean | undefined>,
      );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
