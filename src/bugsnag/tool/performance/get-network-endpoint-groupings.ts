import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
});

// Returns the current network endpoint grouping rules (URL patterns) configured for a project.
export const getNetworkEndpointGroupings = new TypesafeTool(
  {
    title: "Get Network Endpoint Groupings",
    summary: "Get the network endpoint grouping rules for a project",
    purpose:
      "Retrieve the URL patterns used to group network spans for performance monitoring",
    useCases: [
      "View current network endpoint grouping configuration",
      "Understand how network requests are being grouped in performance monitoring",
      "Check grouping patterns before making updates",
    ],
    inputSchema,
    examples: [
      {
        description: "Get network grouping rules for a project",
        parameters: {},
        expectedOutput: "Array of endpoint URL patterns",
      },
    ],
    hints: [
      "Network grouping patterns help consolidate similar requests into single span groups",
      "Patterns use OpenAPI path templating syntax with curly braces for path parameters (e.g., /users/{userId})",
      "Wildcards (*) can be used in domains to match multiple subdomains (e.g., https://*.example.com)",
    ],
    readOnly: true,
    idempotent: true,
  },
  (client: BugsnagClient) => async (args, _extra) => {
    const params = args;
    const project = await client.getInputProject(params.projectId);
    const result = await client.projectApi.getProjectNetworkGroupingRuleset(
      project.id,
    );
    return {
      content: [
        { type: "text", text: JSON.stringify(result.body.endpoints || []) },
      ],
    };
  },
);
