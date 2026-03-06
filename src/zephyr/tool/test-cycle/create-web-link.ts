import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCycleWebLinkBody,
  CreateTestCycleWebLinkParams,
} from "../../common/rest-api-schemas";
export class CreateTestCycleWebLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Cycle Web Link",
    summary: "Create a new Web Link for a Test Cycle in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCycleWebLinkParams.and(
      CreateTestCycleWebLinkBody.partial(),
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
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCycleIdOrKey } = CreateTestCycleWebLinkParams.parse(args);
    const body = CreateTestCycleWebLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcycles/${testCycleIdOrKey}/links/weblinks`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
