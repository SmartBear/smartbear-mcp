import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetTestCycleLinksParams,
  GetTestCycleLinks200Response as GetTestCycleLinksResponse,
} from "../../common/rest-api-schemas.js";

export class GetTestCycleLinks extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Cycle Links",
    summary:
      "Get all links (issues, web links, and test plans) associated with a test cycle in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCycleLinksParams,
    outputSchema: GetTestCycleLinksResponse,
    examples: [
      {
        description: "Get all links for test cycle with id 1",
        parameters: {
          testCycleIdOrKey: "1",
        },
        expectedOutput:
          "All links (issues, web links, test plans) for the test cycle",
      },
      {
        description: "Get all links for test cycle with key 'SA-R40'",
        parameters: {
          testCycleIdOrKey: "SA-R40",
        },
        expectedOutput:
          "All links (issues, web links, test plans) for the test cycle with key SA-R40",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCycleIdOrKey } = GetTestCycleLinksParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testcycles/${testCycleIdOrKey}/links`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
