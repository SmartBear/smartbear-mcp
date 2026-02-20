import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createTestCaseIssueLinkBody,
  createTestCaseIssueLinkParams,
  createTestCaseIssueLink201Response as createTestCaseIssueLinkResponse,
} from "../../common/rest-api-schemas";
export class CreateTestCaseIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case Issue Link",
    summary: "Create a new Issue Link for a Test Case in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCaseIssueLinkBody.extend({
      testCaseKey: createTestCaseIssueLinkParams.shape.testCaseKey,
    }),
    outputSchema: createTestCaseIssueLinkResponse,
    examples: [
      {
        description:
          "Create an issue link for test case SA-T1 pointing to Jira issue 10100",
        parameters: {
          testCaseKey: "SA-T1",
          issueId: "10100",
        },
        expectedOutput:
          "The newly created Issue Link with its ID and self link",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = createTestCaseIssueLinkParams.parse(args);
    const body = createTestCaseIssueLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/links/issues`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
