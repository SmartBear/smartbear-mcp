import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
});

// Returns the available custom trace attribute fields for a project, used to build performance filters.
export class ListTraceFields extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Trace Fields",
    toolset: "performance",
    summary: "Get available trace fields/attributes for filtering",
    purpose: "Discover what custom attributes are available for filtering",
    useCases: [
      "Find available custom attributes for performance filtering",
      "Understand what metadata is attached to traces",
      "Build dynamic filters based on available fields",
    ],
    inputSchema,
    examples: [
      {
        description: "Get all trace fields",
        parameters: {},
        expectedOutput:
          "Array of field names and types available for filtering",
      },
    ],
    hints: [
      "Trace fields are custom attributes added to spans",
      "Use these fields for filtering other performance queries",
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const traceFields = await this.client.getProjectTraceFields(project);

    return {
      content: [{ type: "text", text: JSON.stringify(traceFields) }],
    };
  };
}
