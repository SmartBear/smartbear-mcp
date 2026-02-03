import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createTestCaseBody,
  createTestCase201Response as createTestCaseResponse,
} from "../../common/rest-api-schemas";

export class CreateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case",
    summary: "Create a new Test Case in Zephyr specified project",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCaseBody,
    outputSchema: createTestCaseResponse,
    examples: [
      {
        description: "Create a Test Case in project SA to ensure that the axial pump can be enabled",
        parameters: {
          projectKey: "SA",
          name: "Check axial pump",
          objective: "Ensure the axial pump can be enabled",
        },
        expectedOutput: "The newly created Test Case with its details and key",
      },
      {
        description:
          "Create a Test Case to ensure that the axial pump can be enabled. The test should be in project MM2, have labels 'automated' and 'mcp', and priority 'High'",
        parameters: {
          projectKey: "MM2",
          name: "Check axial pump",
          objective: "Ensure the axial pump can be enabled",
          labels: ["automated", "mcp"],
          priorityName: "High",
        },
        expectedOutput: "The newly created Test Case with its details and key",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const body = createTestCaseBody.parse(args);
    const response = await this.client.getApiClient().post(`/testcases/`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
