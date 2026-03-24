import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestCaseLinksParams,
  GetTestCaseLinks200Response as GetTestCaseLinksResponse,
} from "../../common/rest-api-schemas";

export class GetTestCaseLinks extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Case Links",
    summary:
      "Get all links (issue links and web links) associated with a test case in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCaseLinksParams,
    outputSchema: GetTestCaseLinksResponse,
    examples: [
      {
        description:
          "Get all links associated with the test case with key 'SA-T10'",
        parameters: {
          testCaseKey: "SA-T10",
        },
        expectedOutput:
          "The links (issue links and web links) associated with the test case",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = GetTestCaseLinksParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}/links`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
