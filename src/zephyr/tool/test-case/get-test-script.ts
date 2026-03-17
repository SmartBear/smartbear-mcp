import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestCaseTestScriptParams,
  GetTestCaseTestScript200Response as GetTestScriptResponse,
} from "../../common/rest-api-schemas";

export class GetTestScript extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Script",
    summary:
      "Get the Test Script (Plain Text or BDD) for a given Test Case in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCaseTestScriptParams,
    outputSchema: GetTestScriptResponse,
    examples: [
      {
        description: "Get the test script for test case with key 'SA-T1'",
        parameters: {
          testCaseKey: "SA-T1",
        },
        expectedOutput:
          "The test script with its type (plain or bdd), text content, and id",
      },
      {
        description:
          "Retrieve the BDD test script content for test case with key 'MM2-T15'",
        parameters: {
          testCaseKey: "MM2-T15",
        },
        expectedOutput:
          "The test script with its type (plain or bdd), text content, and id",
      },
      {
        description:
          "Get the test script for test case with key 'QA-T100' to review the test instructions",
        parameters: {
          testCaseKey: "QA-T100",
        },
        expectedOutput:
          "The test script with its type (plain or bdd), text content, and id",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseKey } = GetTestCaseTestScriptParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}/testscript`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
