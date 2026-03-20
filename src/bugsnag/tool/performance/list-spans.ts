import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

// Lists individual span instances within a span group, with sorting and filtering support.
export class ListSpans extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Spans",
    summary: "Get individual spans belonging to a span group",
    purpose: "Examine individual operation instances within a span group",
    useCases: [
      "Analyze individual slow operations",
      "Debug performance issues by examining specific traces",
      "Find patterns in operation attributes",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
      spanGroupId: toolInputParameters.spanGroupId,
      sort: z
        .enum([
          "duration",
          "timestamp",
          "full_page_load_lcp",
          "full_page_load_fid",
          "full_page_load_cls",
          "full_page_load_ttfb",
          "full_page_load_fcp",
          "rendering_slow_frame_percentage",
          "rendering_frozen_frame_percentage",
          "system_metrics_cpu_total_mean",
          "system_metrics_memory_device_mean",
          "rendering_metrics_fps_mean",
          "rendering_metrics_fps_minimum",
          "rendering_metrics_fps_maximum",
          "http_response_code",
        ])
        .optional()
        .describe("Field to sort by"),
      direction: toolInputParameters.direction,
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
      filters: toolInputParameters.performanceFilters,
    }),
    examples: [
      {
        description: "Get slowest spans for an operation",
        parameters: {
          spanGroupId: "[HttpClient]GET-api.example.com",
          sort: "duration",
          direction: "desc",
          perPage: 10,
        },
        expectedOutput: "Array of the 10 slowest span instances",
      },
      {
        description: "Get spans filtered by OS with pagination",
        parameters: {
          spanGroupId: "[HttpClient]GET-api.example.com",
          sort: "timestamp",
          filters: {
            "os.name": [{ type: "eq", value: "iOS" }],
          },
          nextUrl: "/projects/123/spans?offset=30&per_page=30",
        },
        expectedOutput:
          "Array of spans from iOS devices with next page navigation",
      },
    ],
    hints: [
      "Sort by duration descending to find the slowest instances",
      "Each span includes trace ID for further investigation",
    ],
  };

  constructor(client: BugsnagClient) {
    super(client);
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      projectId: toolInputParameters.projectId,
      spanGroupId: toolInputParameters.spanGroupId,
      sort: z
        .enum([
          "duration",
          "timestamp",
          "full_page_load_lcp",
          "full_page_load_fid",
          "full_page_load_cls",
          "full_page_load_ttfb",
          "full_page_load_fcp",
          "rendering_slow_frame_percentage",
          "rendering_frozen_frame_percentage",
          "system_metrics_cpu_total_mean",
          "system_metrics_memory_device_mean",
          "rendering_metrics_fps_mean",
          "rendering_metrics_fps_minimum",
          "rendering_metrics_fps_maximum",
          "http_response_code",
        ])
        .optional()
        .describe("Field to sort by"),
      direction: toolInputParameters.direction,
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
      filters: toolInputParameters.performanceFilters,
    });
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const result = await this.client.projectApi.listSpansBySpanGroupId(
      project.id,
      params.spanGroupId,
      params.filters,
      params.sort,
      params.direction,
      params.perPage,
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
  };
}
