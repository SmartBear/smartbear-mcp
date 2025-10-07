import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../common/types.js";

export interface ZephyrTool {
  specification: ToolParams;
  handle: ToolCallback<ZodRawShape>;
}
