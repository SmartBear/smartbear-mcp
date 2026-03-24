import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetIssueLinkTestCyclesParams as GetIssueLinkTestCyclesPathParam,
  GetIssueLinkTestCycles200Response as GetIssueLinkTestCyclesResponse,
} from "../../common/rest-api-schemas";

export class GetTestCycles extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Cycles linked to a Jira issue",
    summary: "Get test cycles linked to a Jira issue in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetIssueLinkTestCyclesPathParam,
    outputSchema: GetIssueLinkTestCyclesResponse,
    examples: [
      {
        description:
          "Check which test cycles are linked to Jira issue PROJ-123",
        parameters: {
          issueKey: "PROJ-123",
        },
        expectedOutput:
          "The List of test cycles linked to Jira issue PROJ-123 with their IDs",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { issueKey } = GetIssueLinkTestCyclesPathParam.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/issuelinks/${issueKey}/testcycles`);
    return {
      structuredContent: { testCycles: response },
      content: [],
    };
  };
}
