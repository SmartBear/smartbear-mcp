import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCycleIssueLinkBody,
  CreateTestCycleIssueLinkParams,
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
    examples: [
      {
        description:
          "Create a link between the test cycle SA-R1 and the Jira Issue ID 10100",
        parameters: {
          testCycleIdOrKey: "SA-R1",
          issueId: 10100,
        },
      },
      {
        description:
          "Create a link between the test cycle with ID 1001 and the Jira Issue ID 20200",
        parameters: {
          testCycleIdOrKey: "1001",
          issueId: 20200,
        },
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCycleIdOrKey } = CreateTestCycleIssueLinkParams.parse(args);
    const body = CreateTestCycleIssueLinkBody.parse(args);
    await this.client
      .getApiClient()
      .post(`/testcycles/${testCycleIdOrKey}/links/issues`, body);
    return {
      structuredContent: {},
      content: [],
    };
  };
}
