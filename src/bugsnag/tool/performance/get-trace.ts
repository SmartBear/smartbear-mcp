import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

// Fetches all spans within a trace by trace ID and time window, optionally focused on a target span.
export class GetTrace extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Trace",
    summary: "Get all spans within a specific trace",
    purpose:
      "View the complete trace of operations for a request/transaction",
    useCases: [
      "Debug slow requests by viewing all operations in the trace",
      "Understand the flow of a request through the system",
      "Identify bottlenecks in distributed systems",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
      traceId: z.string().describe("Trace ID"),
      from: z.string().describe("Start time (ISO 8601 format)"),
      to: z.string().describe("End time (ISO 8601 format)"),
      targetSpanId: z
        .string()
        .optional()
        .describe("Optional target span ID to focus on"),
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
    }),
    examples: [
      {
        description: "Get all spans for a trace",
        parameters: {
          traceId: "abc123",
          from: "2024-01-01T00:00:00Z",
          to: "2024-01-01T23:59:59Z",
        },
        expectedOutput:
          "Array of all spans in the trace with timing and hierarchy",
      },
      {
        description:
          "Get spans for a trace with pagination and target span",
        parameters: {
          traceId: "def456",
          from: "2024-01-01T00:00:00Z",
          to: "2024-01-01T23:59:59Z",
          targetSpanId: "span-789",
          perPage: 50,
        },
        expectedOutput:
          "Array of up to 50 spans focused around the target span",
      },
    ],
    hints: [
      "Traces show the complete execution path of a request",
      "Use from/to parameters to narrow the time window",
      "targetSpanId can be used to focus on a specific span in the trace",
    ],
  };

  constructor(client: BugsnagClient) {
    super(client);
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      projectId: toolInputParameters.projectId,
      traceId: z.string().describe("Trace ID"),
      from: z.string().describe("Start time (ISO 8601 format)"),
      to: z.string().describe("End time (ISO 8601 format)"),
      targetSpanId: z
        .string()
        .optional()
        .describe("Optional target span ID to focus on"),
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
    });
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    if (!params.traceId || !params.from || !params.to) {
      throw new ToolError("traceId, from, and to are required");
    }
    const result = await this.client.projectApi.listSpansByTraceId(
      project.id,
      params.traceId,
      params.from,
      params.to,
      params.targetSpanId,
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
