import { Tool, type ToolHandler } from "../../../common/tools";
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
    toolset: "Test Cases",
    summary:
      "Create a new link between an issue in Jira and a Test Case in Zephyr",
    readOnly: false,
    idempotent: false,
    // Flattened via .extend() (not .and()) so the advertised JSON Schema stays
    // a plain object instead of `allOf`, which older MCP clients don't understand.
    inputSchema: CreateTestCaseIssueLinkParams.extend(
      CreateTestCaseIssueLinkBody.partial().shape,
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
  handle: ToolHandler = async (args) => {
    const parsed = CreateTestCaseIssueLinkParams.and(
      CreateTestCaseIssueLinkBody,
    ).parse(args);
    const { testCaseKey, ...body } = parsed;
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/links/issues`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
