import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCycleIssueLinkBody,
  CreateTestCycleIssueLinkParams,
  CreateTestCaseIssueLink201Response as createTestCycleIssueLinkResponse,
} from "../../common/rest-api-schemas";
export class CreateTestCycleIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Cycle Issue Link",
    summary:
      "Create a new link between an issue in Jira and a Test Cycle in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCycleIssueLinkParams.and(
      CreateTestCycleIssueLinkBody.partial(),
    ),
    outputSchema: createTestCycleIssueLinkResponse,
    examples: [
      {
        description:
          "Create a link between the test cycle SA-R1 and the Jira Issue ID 10100",
        parameters: {
          testCycleIdOrKey: "SA-R1",
          issueId: 10100,
        },
        expectedOutput:
          "The newly created Issue Link with its ID and self link",
      },
      {
        description:
          "Create a link between the test cycle with ID 1001 and the Jira Issue ID 20200",
        parameters: {
          testCycleIdOrKey: "1001",
          issueId: 20200,
        },
        expectedOutput:
          "The newly created Issue Link with its ID and self link",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCycleIdOrKey } = CreateTestCycleIssueLinkParams.parse(args);
    const body = CreateTestCycleIssueLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcycles/${testCycleIdOrKey}/links/issues`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
