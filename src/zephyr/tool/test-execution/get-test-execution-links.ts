import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  ListTestExecutionLinks200Response as GetTestExecutionLinksResponse,
  ListTestExecutionLinksParams,
} from "../../common/rest-api-schemas";

export class GetTestExecutionLinks extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Execution Links",
    summary: "Get links for a specific test execution in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: ListTestExecutionLinksParams,
    outputSchema: GetTestExecutionLinksResponse,
    examples: [
      {
        description: "Get the links oftest execution with id 1",
        parameters: {
          testExecutionIdOrKey: "1",
        },
        expectedOutput: "The test execution links with its details",
      },
      {
        description: "Get the links of test execution with key 'PROJ-E123'",
        parameters: {
          testExecutionIdOrKey: "PROJ-E123",
        },
        expectedOutput: "The test execution links with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testExecutionIdOrKey } = ListTestExecutionLinksParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/testexecutions/${testExecutionIdOrKey}/links`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
