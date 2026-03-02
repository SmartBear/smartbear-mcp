import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCaseTestStepsBody,
  CreateTestCaseTestStepsParams,
  CreateTestCaseTestSteps201Response as createTestCaseTestStepsResponse,
} from "../../common/rest-api-schemas";
export class CreateTestSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case Test Steps",
    summary:
      "Create test steps for a Test Case in Zephyr. Supports inline step definitions or delegating execution to another test case.",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseTestStepsBody.extend({
      testCaseKey: CreateTestCaseTestStepsParams.shape.testCaseKey,
    }),
    outputSchema: createTestCaseTestStepsResponse,
    examples: [
      {
        description:
          "Append simple inline test steps with description and expected result to test case SA-T1",
        parameters: {
          testCaseKey: "SA-T1",
          mode: "APPEND",
          items: [
            {
              inline: {
                description: "Navigate to the login page",
                expectedResult: "Login page is displayed",
              },
            },
            {
              inline: {
                description: "Enter valid credentials and click Submit",
                expectedResult: "User is redirected to the dashboard",
              },
            },
          ],
        },
        expectedOutput:
          "The created Test Step ID and the API self URL to access it",
      },
      {
        description:
          "Overwrite all test steps for test case MM2-T15 with steps that include test data",
        parameters: {
          testCaseKey: "MM2-T15",
          mode: "OVERWRITE",
          items: [
            {
              inline: {
                description: "Open the settings page",
                testData: "User role: Admin",
                expectedResult: "Settings page is accessible",
              },
            },
            {
              inline: {
                description: "Change the notification preference",
                testData: "Preference: Email only",
                expectedResult:
                  "Notification preference is updated successfully",
              },
            },
          ],
        },
        expectedOutput:
          "The created Test Step ID and the API self URL to access it",
      },
      {
        description:
          "Add a step that delegates execution to another test case PRJ-T42",
        parameters: {
          testCaseKey: "SA-T1",
          mode: "APPEND",
          items: [
            {
              testCase: {
                testCaseKey: "PRJ-T42",
              },
            },
          ],
        },
        expectedOutput:
          "The created Test Step ID and the API self URL to access it",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = CreateTestCaseTestStepsParams.parse(args);
    const body = CreateTestCaseTestStepsBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/teststeps`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
