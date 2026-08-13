import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import {
  buildCreateDefinitionSchema,
  createReflectDefinition,
} from "./definition";

export class CreateTest extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Create Test",
    toolset: "Tests",
    summary:
      "Create a new Reflect test which contains an ordered list of steps.",
    readOnly: false,
    idempotent: false,
    inputSchema: buildCreateDefinitionSchema({ isSegment: false }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    return createReflectDefinition(this.client, "tests", "test", args);
  };
}
