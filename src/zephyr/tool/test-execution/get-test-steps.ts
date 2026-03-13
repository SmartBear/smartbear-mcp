import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestExecutionTestStepsParams,
  GetTestExecutionTestStepsQueryParams,
  GetTestExecutionTestSteps200Response as getTestExecutionStepsResponse,
} from "../../common/rest-api-schemas";

export class GetTestExecutionSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Execution Steps",
    summary: "Get details of test execution steps in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestExecutionTestStepsParams.and(
      GetTestExecutionTestStepsQueryParams.partial(),
    ),
    outputSchema: getTestExecutionStepsResponse,
    examples: [
      {
        description:
          "Get the first 10 test execution steps for test execution with ID 1",
        parameters: {
          testExecutionIdOrKey: "1",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 test execution steps with their details",
      },
      {
        description:
          "Get the first 10 test execution steps for test execution with key 'SA-E1'",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 test execution steps with their details",
      },
      {
        description:
          "Get any test execution step for test execution with key 'SA-E1'",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          maxResults: 1,
        },
        expectedOutput: "One test execution step with its details",
      },
      {
        description:
          "Get five test execution steps starting from the 7th test execution step for test execution with key 'SA-E1'",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          maxResults: 5,
          startAt: 6,
        },
        expectedOutput:
          "The 7th to the 11th test execution steps with their details",
      },
      {
        description:
          "Get test execution steps for a specific test data row from test execution with key 'SA-E1'",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          testDataRowNumber: 1,
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "Test execution steps for the specified test data row",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      GetTestExecutionTestStepsParams.parse(args);
    const parsedArgs = GetTestExecutionTestStepsQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testexecutions/${testExecutionIdOrKey}/teststeps`, parsedArgs);

    return {
      structuredContent: response,
      content: [],
    };
  };
}
