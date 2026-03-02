import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCaseIssueLinkBody,
  CreateTestCaseIssueLinkParams,
  CreateTestCaseIssueLink201Response as createTestCaseIssueLinkResponse,
} from "../../common/rest-api-schemas";
export class CreateTestCaseIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case Issue Link",
    summary:
      "Create a new link between an issue in Jira and a Test Case in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseIssueLinkParams.and(
      CreateTestCaseIssueLinkBody.partial(),
    ),
    outputSchema: createTestCaseIssueLinkResponse,
    examples: [
      {
        description:
          "Create a link between the test case SA-T1 and the Jira Issue ID 10100",
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
    const { testCaseKey } = CreateTestCaseIssueLinkParams.parse(args);
    const body = CreateTestCaseIssueLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/links/issues`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
