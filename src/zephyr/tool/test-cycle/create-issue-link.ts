import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCycleIssueLinkBody,
  CreateTestCycleIssueLinkParams,
} from "../../common/rest-api-schemas";

export class CreateTestCycleIssueLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Cycle Issue Link",
    toolset: "Test Cycles",
    summary:
      "Create a new link between an issue in Jira and a Test Cycle in Zephyr",
    readOnly: false,
    idempotent: false,
    // Flattened via .extend() (not .and()) so the advertised JSON Schema stays
    // a plain object instead of `allOf`, which older MCP clients don't understand.
    inputSchema: CreateTestCycleIssueLinkParams.extend(
      CreateTestCycleIssueLinkBody.shape,
    ),
    examples: [
      {
        description:
          "Create a link between the test cycle with key SA-R1 and the Jira Issue ID 10100",
        parameters: {
          testCycleIdOrKey: "SA-R1",
          issueId: 10100,
        },
        expectedOutput:
          "The link between Test Cycle and Jira issue should be created, but no output is expected.",
      },
      {
        description:
          "Create a link between the test cycle with ID 1001 and the Jira issue ID 20200",
        parameters: {
          testCycleIdOrKey: "1001",
          issueId: 20200,
        },
        expectedOutput:
          "The link between Test Cycle and Jira issue should be created, but no output is expected.",
      },
    ],
  };
  handle: ToolHandler = async (args) => {
    const parsed = CreateTestCycleIssueLinkParams.and(
      CreateTestCycleIssueLinkBody,
    ).parse(args);
    const { testCycleIdOrKey, ...body } = parsed;
    await this.client
      .getApiClient()
      .post(`/testcycles/${testCycleIdOrKey}/links/issues`, body);
    return {
      structuredContent: {},
      content: [],
    };
  };
}
