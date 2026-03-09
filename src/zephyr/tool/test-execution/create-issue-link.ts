import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestExecutionIssueLinkBody,
  CreateTestExecutionIssueLinkParams,
  CreateTestCaseIssueLink201Response as CreateTestExecutionIssueLinkResponse,
} from "../../common/rest-api-schemas";

export class CreateTestExecutionIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Execution Issue Link",
    summary:
      "Create a new link between a Jira issue and a Test Execution in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestExecutionIssueLinkParams.and(
      CreateTestExecutionIssueLinkBody.partial(),
    ),
    outputSchema: CreateTestExecutionIssueLinkResponse,
    examples: [
      {
        description:
          "Create a link between the test execution SA-E40 and the Jira Issue ID 10100",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          issueId: 10100,
        },
        expectedOutput:
          "The newly created Issue Link with its ID and self link",
      },
      {
        description:
          "Create a link between the test execution with id 1 and the Jira Issue ID 20050",
        parameters: {
          testExecutionIdOrKey: "1",
          issueId: 20050,
        },
        expectedOutput:
          "The newly created Issue Link with its ID and self link",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      CreateTestExecutionIssueLinkParams.parse(args);
    const body = CreateTestExecutionIssueLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testexecutions/${testExecutionIdOrKey}/links/issues`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
