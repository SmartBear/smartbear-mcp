import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import { createTestCaseBody } from "../../common/rest-api-schemas";

export class CreateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case",
    summary: "Create a new Test Case in Zephyr specified project",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCaseBody,
    examples: [
      {
        description: "Create a new Test Case with sample data in project SA",
        parameters: {
          projectKey: "SA",
          name: "New Test Case",
          description: "This is a new test case created via the API",
        },
        expectedOutput: "The newly created Test Case with its details and key",
      },
      {
        description:
          "Create a TestCase with labels 'automated' and 'mcp', and priority 'High' in project MM2",
        parameters: {
          projectKey: "MM2",
          name: "Automated Test Case",
          description: "This test case is automated and created via MCP",
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
