import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  UpdateTestExecutionBody,
  UpdateTestExecutionParams,
} from "../../common/rest-api-schemas";

export class UpdateTestExecution extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Execution",
    summary:
      "Update an existing Test Execution in Zephyr. This operation only updates specified fields in the payload and ignores `null` or `undefined` values.",
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestExecutionBody.extend({
      testExecutionIdOrKey:
        UpdateTestExecutionParams.shape.testExecutionIdOrKey,
    }),
    examples: [
      {
        description:
          "Update the status name to 'PASS' and the environment name to 'ENV-1' in the test execution 'SA-E40'.",
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
          "For test execution 'SA-E40', update the test executor and assignee to be the user with ID 10000.",
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
          "In test execution 'SA-E40', add a comment saying that this execution was updated via API.",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          comment: "execution updated via API",
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
    const { testExecutionIdOrKey } = UpdateTestExecutionParams.parse(args);
    const body = UpdateTestExecutionBody.partial().parse(args);

    await this.client
      .getApiClient()
      .put(`/testexecutions/${testExecutionIdOrKey}`, body);

    return {
      structuredContent: {},
      content: [],
    };
  };
}
