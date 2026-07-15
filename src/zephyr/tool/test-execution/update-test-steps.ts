import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z as zod, ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestExecutionTestSteps200Response,
  PutTestExecutionTestStepsBody,
  PutTestExecutionTestStepsParams,
} from "../../common/rest-api-schemas";

type ExistingTestStep = NonNullable<
  zod.infer<typeof GetTestExecutionTestSteps200Response>["values"]
>[number];

export class UpdateTestExecutionSteps extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Execution Steps",
    toolset: "Test Executions",
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
          "Mark the status of all steps in the test execution 'SA-E1' as 'Pass'. Set the actual result of step 1 to 'Dashboard widgets loaded correctly' and step 2 to 'Navigation menu responded correctly to user interactions'.",
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
          "Update only the status of step 2 in test execution 'SA-E5' to 'Fail'. Do not modify any other fields.",
        parameters: {
          testExecutionIdOrKey: "SA-E5",
          steps: [
            {},
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
          "Update only the actual results of the steps in test execution '10'. Set the actual result of step 1 to 'API returned 500 error' and step 2 actual result to 'API returned 200 success'",
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
    const parsed = PutTestExecutionTestStepsParams.and(
      PutTestExecutionTestStepsBody.required(),
    ).parse(args);

    const { testExecutionIdOrKey, steps: stepUpdates } = parsed;

    const response = (await this.client
      .getApiClient()
      .get(
        `/testexecutions/${testExecutionIdOrKey}/teststeps`,
      )) as zod.infer<typeof GetTestExecutionTestSteps200Response>;

    const existingSteps: ExistingTestStep[] = response.values ?? [];

    const updatedSteps = existingSteps.map(
      (existingStep: ExistingTestStep, index: number) => {
        const update = stepUpdates?.[index];
        return {
          actualResult:
            update?.actualResult ?? existingStep.inline?.actualResult,
          ...(update?.statusName !== undefined && {
            statusName: update.statusName,
          }),
        };
      },
    );

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
