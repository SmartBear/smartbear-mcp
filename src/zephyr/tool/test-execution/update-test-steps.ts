import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  PutTestExecutionTestStepsBody,
  PutTestExecutionTestStepsParams,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils.ts";

export class UpdateTestExecutionSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Execution Steps",
    summary:
      "Update test steps for a given Test Execution in Zephyr. This operation updates the provided steps with their execution status and actual results. Only the fields included in the request will be modified.",
    readOnly: false,
    idempotent: true,
    inputSchema: PutTestExecutionTestStepsParams.and(
      PutTestExecutionTestStepsBody.partial(),
    ),
    examples: [
      {
        description:
          "Mark all steps in test execution 'SA-E1' as passed and provide actual results for each step.",
        parameters: {
          testExecutionIdOrKey: "SA-E1",
          steps: [
            {
              statusName: "Pass",
              actualResult: "Dashboard widgets loaded correctly",
            },
            {
              statusName: "Pass",
              actualResult:
                "Navigation menu responded correctly to user interactions",
            },
          ],
        },
        expectedOutput:
          "Test steps are updated successfully, but no output is expected.",
      },
      {
        description:
          "Mark the second step in test execution 'SA-E5' as failed (keep everything else unchanged).",
        parameters: {
          testExecutionIdOrKey: "SA-E5",
          steps: [
            {
              statusName: "Pass",
              actualResult:
                "Changes were not saved after clicking the update button",
            },
            {
              statusName: "Fail",
              actualResult:
                "Page froze while updating notification preferences",
            },
          ],
        },
        expectedOutput:
          "The test execution steps are updated, but no output is expected.",
      },
      {
        description:
          "Update only actual results for steps in test execution '10' without changing their status name",
        parameters: {
          testExecutionIdOrKey: "10",
          steps: [
            {
              statusName: "Error",
              actualResult: "API returned 500 error",
            },
            {
              statusName: "Error",
              actualResult: "API returned 200 success",
            },
          ],
        },
        expectedOutput:
          "Test steps are updated successfully, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      PutTestExecutionTestStepsParams.parse(args);

    const body = PutTestExecutionTestStepsBody.partial().parse(args);

    const stepUpdates = body.steps || [];

    const response = await this.client
      .getApiClient()
      .get(`/testexecutions/${testExecutionIdOrKey}/teststeps`);

    const existingSteps = response.values || [];

    const updatedSteps = existingSteps.map((step: any, index: number) => {
      const stepData = step.inline;
      const update = stepUpdates[index];

      if (update) {
        return deepMerge(stepData, update);
      }

      return stepData;
    });

    await this.client
      .getApiClient()
      .put(`/testexecutions/${testExecutionIdOrKey}/teststeps`, {
        steps: updatedSteps,
      });

    return {
      structuredContent: {},
      content: [],
    };
  };
}
