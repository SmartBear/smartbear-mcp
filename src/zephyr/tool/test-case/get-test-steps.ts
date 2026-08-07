import { Tool, type ToolHandler } from "../../../common/tools";
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
    toolset: "Test Cases",
    summary: "Get details of test case steps in Zephyr",
    readOnly: true,
    idempotent: true,
    // Flattened via .extend() (not .and()) so the advertised JSON Schema stays
    // a plain object instead of `allOf`, which older MCP clients don't understand.
    inputSchema: GetTestCaseTestStepsParams.extend(
      GetTestCaseTestStepsQueryParams.partial().shape,
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

  handle: ToolHandler = async (args) => {
    const parsed = GetTestCaseTestStepsParams.and(
      GetTestCaseTestStepsQueryParams,
    ).parse(args);
    const { testCaseKey, ...parsedArgs } = parsed;
    const response = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}/teststeps`, parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
