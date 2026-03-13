import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  PutTestExecutionTestStepsBody,
  PutTestExecutionTestStepsParams,
} from "../../common/rest-api-schemas";

export class UpdateTestExecutionSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Execution Steps",
    summary:
      "Update the test steps for a Test Execution in Zephyr. Use this to record actual results and set a pass/fail status for each step after executing them.",
    readOnly: false,
    idempotent: true,
    inputSchema: PutTestExecutionTestStepsParams.and(
      PutTestExecutionTestStepsBody.partial(),
    ),
    examples: [
      {
        description:
          "Mark all steps in test execution 'SA-E1' as passed with actual results",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          steps: [
            {
              statusName: "Pass",
              actualResult: "Login page displayed as expected",
            },
            {
              statusName: "Pass",
              actualResult: "User redirected to dashboard successfully",
            },
          ],
        },
        expectedOutput:
          "The test execution steps are updated, but no output is expected.",
      },
      {
        description:
          "Mark the second step in test execution 'SA-E5' as failed with an actual result",
        parameters: {
          testExecutionIdOrKey: "SA-E5",
          steps: [
            {
              statusName: "Pass",
              actualResult: "Settings page loaded correctly",
            },
            {
              statusName: "Fail",
              actualResult:
                "Notification preference update failed with a 500 error",
            },
          ],
        },
        expectedOutput:
          "The test execution steps are updated, but no output is expected.",
      },
      {
        description:
          "Record actual results for all steps in test execution '10' without changing statuses",
        parameters: {
          testExecutionIdOrKey: "10",
          steps: [
            {
              actualResult: "Page loaded in 1.2s",
            },
            {
              actualResult: "Form submitted without errors",
            },
          ],
        },
        expectedOutput:
          "The test execution steps are updated, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      PutTestExecutionTestStepsParams.parse(args);
    const body = PutTestExecutionTestStepsBody.partial().parse(args);

    await this.client
      .getApiClient()
      .put(`/testexecutions/${testExecutionIdOrKey}/teststeps`, body);

    return {
      structuredContent: {},
      content: [],
    };
  };
}
