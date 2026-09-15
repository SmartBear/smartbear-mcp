import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCycleWebLinkBody,
  CreateTestCycleWebLinkParams,
} from "../../common/rest-api-schemas";
export class CreateTestCycleWebLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Cycle Web Link",
    toolset: "Test Cycles",
    summary: "Create a new Web Link for a Test Cycle in Zephyr",
    readOnly: false,
    idempotent: false,
    // Flattened via .extend() (not .and()) so the advertised JSON Schema stays
    // a plain object instead of `allOf`, which older MCP clients don't understand.
    inputSchema: CreateTestCycleWebLinkParams.extend(
      CreateTestCycleWebLinkBody.partial().shape,
    ),
    examples: [
      {
        description:
          "Create a link between the specified test cycle by Id '100001' and generic URL 'https://www.atlassian.com' with description 'Atlassian homepage'",
        parameters: {
          testCycleIdOrKey: "100001",
          url: "https://www.atlassian.com",
          description: "Atlassian homepage",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
      {
        description:
          "Create a web link for test cycle 'SA-R15' pointing to url: 'https://atlassian.com' with description 'Atlassian homepage'",
        parameters: {
          testCycleIdOrKey: "SA-R15",
          url: "https://atlassian.com",
          description: "Documentation for pump specifications",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
      {
        description:
          "Attach a documentation link 'https://docs.atlassian.com'  to test cycle MM2-R15 for pump specifications",
        parameters: {
          testCycleIdOrKey: "10001",
          url: "https://docs.atlassian.com",
          description: "Documentation for pump specifications",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
    ],
  };
  handle: ToolHandler = async (args) => {
    const parsed = CreateTestCycleWebLinkParams.and(
      CreateTestCycleWebLinkBody,
    ).parse(args);
    const { testCycleIdOrKey, ...body } = parsed;
    const response = await this.client
      .getApiClient()
      .post(`/testcycles/${testCycleIdOrKey}/links/weblinks`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
