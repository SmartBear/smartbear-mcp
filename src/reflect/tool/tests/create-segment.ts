import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import {
  buildCreateDefinitionSchema,
  createReflectDefinition,
} from "./definition";

export class CreateSegment extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Create Segment",
    toolset: "Tests",
    summary:
      "Create a new Reflect segment which contains an ordered list of steps. Segments are reusable groups of steps " +
      "that can be referenced from tests, and cannot reference other segments.",
    readOnly: false,
    idempotent: false,
    inputSchema: buildCreateDefinitionSchema({ isSegment: true }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    return createReflectDefinition(this.client, "segments", "segment", args);
  };
}
