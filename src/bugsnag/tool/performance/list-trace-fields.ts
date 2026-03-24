import { z } from "zod";
import { TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
});

// Returns the available custom trace attribute fields for a project, used to build performance filters.
export const listTraceFields = new TypesafeTool(
  {
    title: "List Trace Fields",
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
  },
  (client: BugsnagClient) => async (params, _extra) => {
    const project = await client.getInputProject(params.projectId);
    const traceFields = await client.getProjectTraceFields(project);

    return {
      content: [{ type: "text", text: JSON.stringify(traceFields) }],
    };
  },
);
