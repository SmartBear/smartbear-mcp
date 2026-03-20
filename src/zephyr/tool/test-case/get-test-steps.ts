import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestCaseTestStepsParams,
  GetTestCaseTestStepsQueryParams,
  GetTestCaseTestSteps200Response as getTestCaseStepsResponse,
} from "../../common/rest-api-schemas";

export class GetTestCaseSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Case Steps",
    summary: "Get details of test case steps in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCaseTestStepsParams.and(
      GetTestCaseTestStepsQueryParams.partial(),
    ),
    outputSchema: getTestCaseStepsResponse,
    examples: [
      {
        description:
          "Get the first 10 test case steps for test case with key 'SA-T1'",
        parameters: {
          testCaseKey: "SA-T1",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 test case steps with their details",
      },
      {
        description: "Get any test case step for test case with key 'SA-T1'",
        parameters: {
          testCaseKey: "SA-T1",
          maxResults: 1,
        },
        expectedOutput: "One test case step with its details",
      },
      {
        description:
          "Get five test case steps starting from the 7th test case step of the list for test case with key 'SA-T1'",
        parameters: {
          testCaseKey: "SA-T1",
          maxResults: 5,
          startAt: 6,
        },
        expectedOutput:
          "The 7th to the 11th test case steps with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = GetTestCaseTestStepsParams.parse(args);
    const parsedArgs = GetTestCaseTestStepsQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}/teststeps`, parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
