import { z } from "zod";
import { TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  sort: z
    .enum([
      "total_spans",
      "last_seen",
      "name",
      "display_name",
      "network_http_method",
      "rendering_slow_frame_span_percentage",
      "rendering_frozen_frame_span_percentage",
      "duration_p50",
      "duration_p75",
      "duration_p90",
      "duration_p95",
      "duration_p99",
      "system_metrics_cpu_total_mean_p50",
      "system_metrics_cpu_total_mean_p75",
      "system_metrics_cpu_total_mean_p90",
      "system_metrics_cpu_total_mean_p95",
      "system_metrics_cpu_total_mean_p99",
      "system_metrics_memory_device_mean_p50",
      "system_metrics_memory_device_mean_p75",
      "system_metrics_memory_device_mean_p90",
      "system_metrics_memory_device_mean_p95",
      "system_metrics_memory_device_mean_p99",
      "rendering_metrics_fps_mean_p50",
      "rendering_metrics_fps_mean_p75",
      "rendering_metrics_fps_mean_p90",
      "rendering_metrics_fps_mean_p95",
      "rendering_metrics_fps_mean_p99",
      "http_response_4xx_percentage",
      "http_response_5xx_percentage",
    ])
    .optional()
    .describe("Field to sort by"),
  direction: toolInputParameters.direction,
  perPage: toolInputParameters.perPage,
  starredOnly: z.boolean().optional().describe("Show only starred span groups"),
  nextUrl: toolInputParameters.nextUrl,
  filters: toolInputParameters.performanceFilters,
});

// Lists span groups (operation types) being tracked for performance, with support for sorting and filtering.
export const listSpanGroups = new TypesafeTool(
  {
    title: "List Span Groups",
    summary: "List span groups (operations) tracked for performance monitoring",
    purpose: "Discover and analyze different operations being monitored",
    useCases: [
      "View all operations being tracked for performance",
      "Find slow operations by sorting by duration metrics",
      "Filter to starred/important span groups",
    ],
    inputSchema,
    examples: [
      {
        description: "List slowest operations",
        parameters: {
          sort: "duration_p95",
          direction: "desc",
          perPage: 10,
        },
        expectedOutput:
          "Array of span groups sorted by 95th percentile duration",
      },
      {
        description: "List starred span groups with filtering",
        parameters: {
          starredOnly: true,
          filters: {
            "span_group.category": [{ type: "eq", value: "full_page_load" }],
          },
        },
        expectedOutput: "Array of starred span groups filtered by category",
      },
    ],
    hints: [
      "Span groups represent different operation types (page loads, API calls, etc.)",
      "Use sort by duration_p95 or duration_p99 to find the slowest operations",
      "Star important span groups for quick access",
      "Use nextUrl for pagination",
    ],
  },
  (client: BugsnagClient) => async (params, _extra) => {
    const project = await client.getInputProject(params.projectId);
    const result = await client.projectApi.listProjectSpanGroups(
      project.id,
      params.sort,
      params.direction,
      params.perPage,
      undefined,
      params.filters,
      params.starredOnly,
      params.nextUrl,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            data: result.body,
            next_url: result.nextUrl,
            count: result.body?.length,
          }),
        },
      ],
    };
  },
);
