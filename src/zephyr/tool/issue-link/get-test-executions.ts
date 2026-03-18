import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetIssueLinkTestExecutionsParams,
  GetIssueLinkTestExecutions200Response as GetIssueLinkTestExecutionsResponse,
} from "../../common/rest-api-schemas";

export class GetTestExecutions extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get test executions linked to a Jira issue",
    summary: "Get test executions linked to a Jira issue in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetIssueLinkTestExecutionsParams,
    outputSchema: GetIssueLinkTestExecutionsResponse,
    examples: [
      {
        description:
          "Check which test executions are linked to Jira issue PROJ-123",
        parameters: {
          issueKey: "PROJ-123",
        },
        expectedOutput:
          "The List of test executions linked to Jira issue PROJ-123 with their keys and versions",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { issueKey } = GetIssueLinkTestExecutionsParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/issuelinks/${issueKey}/testexecutions`);
    return {
      structuredContent: { testExecutions: response },
      content: [],
    };
  };
}
