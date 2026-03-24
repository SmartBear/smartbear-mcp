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
      PutTestExecutionTestStepsBody,
    ),
    examples: [
      {
        description:
          "Mark all steps status names in the test execution 'SA-E1' as 'Pass'. Set the actual result of step 1 to 'Dashboard widgets loaded correctly' and step 2 to 'Navigation menu responded correctly to user interactions'.",
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
          "Mark the status name of the second step in test execution 'SA-E5' as 'Fail' (keep everything else unchanged).",
        parameters: {
          testExecutionIdOrKey: "SA-E5",
          steps: [
            {
              statusName: "Pass",
            },
            {
              statusName: "Fail",
            },
          ],
        },
        expectedOutput:
          "The test execution steps are updated, but no output is expected.",
      },
      {
        description:
          "Update only the actual results for steps in test execution '10'. Set step 1 actual result to 'API returned 500 error' and step 2 actual result to 'API returned 200 success'",
        parameters: {
          testExecutionIdOrKey: "10",
          steps: [
            {
              actualResult: "API returned 500 error",
            },
            {
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

    const stepUpdates = body.steps!;

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
