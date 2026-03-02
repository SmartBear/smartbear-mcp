import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCaseTestScriptBody,
  CreateTestCaseTestScriptParams,
  CreateTestCaseTestScript201Response as createTestCaseScriptResponse,
} from "../../common/rest-api-schemas";

export class CreateTestScript extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Script",
    summary:
      "Create a new Test Script of the types Plain Text or BDD in a Zephyr Test Case.",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseTestScriptParams.and(
      CreateTestCaseTestScriptBody.partial(),
    ),
    outputSchema: createTestCaseScriptResponse,
    examples: [
      {
        description:
          "Create a plain text test script for test case SA-T1 to verify that the axial pump can be enabled",
        parameters: {
          testCaseKey: "SA-T1",
          type: "plain",
          text: "1. Navigate to Pump Settings</br>2. Enable Axial Pump</br>3. Verify pump status is 'Active'",
        },
        expectedOutput:
          "The created test script metadata including its id and self link",
      },
      {
        description:
          "Create a BDD test script for test case MM2-T15 to validate axial pump activation",
        parameters: {
          testCaseKey: "MM2-T15",
          type: "bdd",
          text: "Given the axial pump is installed\nWhen the user enables the axial pump\nThen the pump status should be Active",
        },
        expectedOutput:
          "The created test script metadata including its id and self link",
      },
      {
        description:
          "Create a BDD test script for test case QA-T100 for axial pump performance validation",
        parameters: {
          testCaseKey: "QA-T100",
          type: "bdd",
          text: "Given the system is running\nWhen the axial pump operates under load\nThen performance metrics should remain within thresholds",
        },
        expectedOutput:
          "The created test script metadata including its id and self link",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = CreateTestCaseTestScriptParams.parse(args);
    const body = CreateTestCaseTestScriptBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/testscript`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
