import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import { createTestCaseBody } from "../../common/rest-api-schemas";

export class CreateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case",
    summary: "Create a new Test Case in Zephyr specified project",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCaseBody,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const body = createTestCaseBody.parse(args);
    const response = await this.client.getApiClient().post(`/testcases/`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
