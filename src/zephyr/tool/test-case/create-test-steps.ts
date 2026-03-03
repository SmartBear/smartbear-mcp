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
    title: "Create Test Case Steps",
    summary:
      "Create steps for a Test Case in Zephyr. Supports inline step definitions or delegating execution to another test case (also known as 'call to test' via UI).",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseTestStepsParams.and(
      CreateTestCaseTestStepsBody.partial(),
    ),
    outputSchema: createTestCaseTestStepsResponse,
    examples: [
      {
        description:
          "To the Test Case SA-T1, add steps that will test a login page.",
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
          "The ID of the Test Steps resource and the API self URL to fetch it",
      },
      {
        description:
          "To the Test Case MM2-T15, replace all existing steps with new ones that test the settings page for an Admin user.",
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
          "The ID of the Test Steps resource and the API self URL to fetch it",
      },
      {
        description:
          "To the Test Case SA-T1, add a step that reuses the steps from the Test Case PRJ-T42",
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
          "The ID of the Test Steps resource and the API self URL to fetch it",
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
