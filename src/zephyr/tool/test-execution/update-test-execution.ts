import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, z as zod } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  type getTestExecution200Response,
  updateTestExecutionBody,
  updateTestExecutionParams,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils";

export class UpdateTestExecution extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Execution",
    summary:
      "Update an existing Test Execution in Zephyr. This operation fetches the current test execution and merges your updates with it to prevent accidental property deletion. To remove a property, set it to null explicitly.",
    readOnly: false,
    idempotent: true,
    inputSchema: updateTestExecutionParams.and(
      updateTestExecutionBody.partial(),
    ),
    examples: [
      {
        description:
          "Update the status name and environment name of the test execution 'SA-E40'.",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          statusName: "PASS",
          environmentName: "ENV-1",
        },
        expectedOutput:
          "The test execution should be updated, but no output is expected.",
      },
      {
        description:
          "Update execution time and actual end date for test execution id '1' (keep everything else unchanged).",
        parameters: {
          testExecutionIdOrKey: "1",
          executionTime: "2018-05-19T13:15:13Z",
          actualEndDate: "2018-05-20T13:15:13Z",
        },
        expectedOutput:
          "The test execution should be updated, but no output is expected.",
      },
      {
        description:
          "Change ExecutedById and AssignedToId for test execution 'SA-E40' by setting executedById and assignedToId.",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          executedById: "10000",
          assignedToId: "10000",
        },
        expectedOutput:
          "The test execution should be updated, but no output is expected.",
      },
      {
        description:
          "Update comment on test execution 'SA-E40' while keeping other custom fields intact.",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          Comment: "Comment updated via API",
        },
        expectedOutput:
          "The test execution should be updated, but no output is expected.",
      },
      {
        description: "Remove the assigned user from test execution 'SA-E40'.",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          assignedToId: null,
        },
        expectedOutput:
          "The test execution should be updated, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsed = updateTestExecutionParams
      .and(updateTestExecutionBody.partial())
      .parse(args);

    const { testExecutionIdOrKey, ...updatesRaw } = parsed;
    const updates: Record<string, unknown> = { ...updatesRaw };

    // Fetch the existing test cycle to ensure we have all properties.
    // Zephyr's PUT endpoints require the complete resource and clear unspecified fields.
    const existingTestExecution: zod.infer<typeof getTestExecution200Response> =
      await this.client
        .getApiClient()
        .get(`/testexecutions/${testExecutionIdOrKey}`);

    // Merge updates into the existing resource so unspecified fields remain unchanged.
    const mergedBody = deepMerge(existingTestExecution, updates);

    await this.client
      .getApiClient()
      .put(`/testexecutions/${testExecutionIdOrKey}`, mergedBody);

    return {
      structuredContent: {},
      content: [],
    };
  };
}
