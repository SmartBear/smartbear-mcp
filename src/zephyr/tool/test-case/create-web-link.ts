import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createTestCaseWebLinkBody,
  createTestCaseWebLinkParams,
  createTestCaseWebLink201Response as createTestCaseWebLinkResponse,
} from "../../common/rest-api-schemas";
export class CreateTestCaseWebLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case Web Link",
    summary: "Create a new Web Link for a Test Case in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCaseWebLinkBody.extend({
      testCaseKey: createTestCaseWebLinkParams.shape.testCaseKey,
    }),
    outputSchema: createTestCaseWebLinkResponse,
    examples: [
      {
        description:
          "Create a web link for test case SA-T1 pointing to Atlassian's homepage",
        parameters: {
          testCaseKey: "SA-T1",
          url: "https://www.atlassian.com",
          description: "Link to Atlassian's homepage",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
      {
        description:
          "Attach a documentation link to test case MM2-T15 for pump specifications",
        parameters: {
          testCaseKey: "MM2-T15",
          url: "https://docs.atlassian.com",
          description: "Documentation for pump specifications",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
    ],
  };
  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = createTestCaseWebLinkParams.parse(args);
    const body = createTestCaseWebLinkBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/links/weblinks`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
