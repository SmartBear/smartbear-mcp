import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createTestExecutionBody,
  createTestExecution201Response as createTestExecutionResponse,
} from "../../common/rest-api-schemas";

export class CreateTestExecution extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Execution",
    summary:
      "Create a new Test Execution for a Test Case within a specific Test Cycle",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestExecutionBody,
    outputSchema: createTestExecutionResponse,
    examples: [
      {
        description:
          "Create a Passed execution for test case SA-T1 in cycle SA-R1",
        parameters: {
          projectKey: "SA",
          testCaseKey: "SA-T1",
          testCycleKey: "SA-R1",
          statusName: "Pass",
        },
        expectedOutput:
          "The newly created Test Execution with execution details",
      },
      {
        description:
          "Create a Failed execution with execution time, environment and comment",
        parameters: {
          projectKey: "MM2",
          testCaseKey: "MM2-T15",
          testCycleKey: "MM2-R3",
          statusName: "Fail",
          environmentName: "Staging",
          executionTime: 125000,
          comment: "Step 3 failed due to timeout<br>Logs attached.",
        },
        expectedOutput:
          "The newly created Test Execution including environment and timing information",
      },
      {
        description: "Create execution with custom fields and assignment",
        parameters: {
          projectKey: "SA",
          testCaseKey: "SA-T5",
          testCycleKey: "SA-R2",
          statusName: "Pass",
          executedById: "5b10ac8d82e05b22cc7d4ef5",
          assignedToId: "5b10ac8d82e05b22cc7d4ef6",
          actualEndDate: "2026-02-17T10:15:30Z",
          customFields: {
            "Execution Build": "1.0.3",
            "Tested Browser": "Chrome",
            "Execution Date": "2026-02-17",
          },
        },
        expectedOutput:
          "The newly created Test Execution including custom field values",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const body = createTestExecutionBody.parse(args);

    const response = await this.client
      .getApiClient()
      .post(`/testexecutions/`, body);

    return {
      structuredContent: response,
      content: [],
    };
  };
}
