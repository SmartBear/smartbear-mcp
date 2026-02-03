import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { custom, type ZodRawShape } from "zod";
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
        description: "Create a new Test Case with sample data in project SA",
        parameters: {
          projectKey: "SA",
          name: "New Test Case",
          objective: "This is a new test case created via the API",
        },
        expectedOutput: "The newly created Test Case with its details and key",
      },
      {
        description:
          "Create a TestCase with labels 'automated' and 'mcp', and priority 'High' in project MM2",
        parameters: {
          projectKey: "MM2",
          name: "Automated Test Case",
          objective: "This test case is automated and created via MCP",
          labels: ["automated", "mcp"],
          priorityName: "High",
        },
        expectedOutput: "The newly created Test Case with its details and key",
      },
      {
        description:
          "Create a Test Case for verifying strength of the axial pump with custom field 'Axial pump strength' having value '5' in project SA",
        parameters: {
          projectKey: "SA",
          name: "Check axial pump strength",
          objective:
            "Make sure the axial pump operates at the required strength",
          customFields: {
            "Axial pump strength": 5,
          },
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
