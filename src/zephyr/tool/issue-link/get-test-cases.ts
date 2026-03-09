import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetIssueLinkTestCasesParams as GetIssueLinkTestCasesPathParam,
  GetIssueLinkTestCases200Response as GetIssueLinkTestCasesResponse,
} from "../../common/rest-api-schemas";

export class GetTestCases extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Issue Link Test Cases",
    summary: "Get test cases linked to a Jira issue in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetIssueLinkTestCasesPathParam,
    outputSchema: GetIssueLinkTestCasesResponse,
    examples: [
      {
        description: "Check which test cases are linked to Jira issue PROJ-123",
        parameters: {
          issueKey: "PROJ-123",
        },
        expectedOutput:
          "The List of test cases linked to Jira issue PROJ-123 with their keys and versions",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { issueKey } = GetIssueLinkTestCasesPathParam.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/issuelinks/${issueKey}/testcases`);
    return {
      // requires structuredContent to be a record, not an array.
      structuredContent: { testCases: response },
      content: [],
    };
  };
}
