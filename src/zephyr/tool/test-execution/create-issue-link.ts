import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestExecutionIssueLinkBody,
  CreateTestExecutionIssueLinkParams,
} from "../../common/rest-api-schemas";

export class CreateTestExecutionIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Execution Issue Link",
    summary:
      "Create a new link between a Jira issue and a Test Execution in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestExecutionIssueLinkParams.and(
      CreateTestExecutionIssueLinkBody,
    ),
    examples: [
      {
        description:
          "Create a link between the test execution with key SA-E40 and the Jira Issue ID 10100",
        parameters: {
          testExecutionIdOrKey: "SA-E40",
          issueId: 10100,
        },
        expectedOutput:
          "The link between Test Execution and Jira issue should be created, but no output is expected.",
      },
      {
        description:
          "Create a link between the test execution with ID 1 and the Jira Issue ID 20050",
        parameters: {
          testExecutionIdOrKey: "1",
          issueId: 20050,
        },
        expectedOutput:
          "The link between Test Execution and Jira issue should be created, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } =
      CreateTestExecutionIssueLinkParams.parse(args);
    const body = CreateTestExecutionIssueLinkBody.parse(args);
    await this.client
      .getApiClient()
      .post(`/testexecutions/${testExecutionIdOrKey}/links/issues`, body);
    return {
      structuredContent: {},
      content: [],
    };
  };
}
