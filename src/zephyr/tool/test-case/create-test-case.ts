import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ShapeOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";
import { $ZodType, $ZodTypeInternals } from "zod/v4/core";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";

export class CreateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case",
    summary: "Create a new Test Case in Zephyr specified project",
    readOnly: false,
    idempotent: false,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const response = await this.client.getApiClient().post(`/testcases/`, {
      projectKey: "AD",
      name: "New Test Case from MCP tool",
      objective: "This is a test case created via MCP tool",
      preconditions: "Preconditions for the test case",
      labels: ["mcp", "automation"],
    });
    return {
      structuredContent: response,
      content: [],
    };
  };
}
