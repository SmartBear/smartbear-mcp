import { z } from "zod";
import { TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  spanGroupId: toolInputParameters.spanGroupId,
  filters: toolInputParameters.performanceFilters,
});

// Fetches detailed performance metrics for a span group, including timeline and duration distribution.
export const getSpanGroup = new TypesafeTool(
  {
    title: "Get Span Group",
    summary: "Get detailed performance metrics for a specific span group",
    purpose: "Analyze performance characteristics of a specific operation",
    useCases: [
      "View detailed statistics (p50, p75, p90, p95, p99) for an operation",
      "Check if performance targets are configured",
      "Monitor span count to understand operation volume",
    ],
    inputSchema,
    examples: [
      {
        description: "Get details for an API endpoint span group",
        parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
        expectedOutput: "Statistics, category, and performance target info",
      },
      {
        description: "Get span group details with device filtering",
        parameters: {
          spanGroupId: "[HttpClient]GET-api.example.com",
          filters: {
            "device.browser_name": [{ type: "eq", value: "Chrome" }],
          },
        },
        expectedOutput: "Statistics filtered for Chrome browser only",
      },
    ],
    hints: [
      "Use List Span Groups first to discover available span group IDs",
      "IDs are automatically URL-encoded - provide the raw ID",
      "Statistics include p50, p75, p90, p95, p99 percentiles",
    ],
  },
  (client: BugsnagClient) => async (args, _extra) => {
    const params = args;
    const project = await client.getInputProject(params.projectId);

    const spanGroupResults = await client.projectApi.getProjectSpanGroup(
      project.id,
      params.spanGroupId,
      params.filters,
    );

    const spanGroupTimelineResult =
      await client.projectApi.getProjectSpanGroupTimeline(
        project.id,
        params.spanGroupId,
        params.filters,
      );

    const spanGroupDistributionResult =
      await client.projectApi.getProjectSpanGroupDistribution(
        project.id,
        params.spanGroupId,
        params.filters,
      );

    const result = {
      ...spanGroupResults.body,
      timeline: spanGroupTimelineResult.body,
      distribution: spanGroupDistributionResult.body,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);
