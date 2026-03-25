import { z } from "zod";
import { ToolError } from "../../../common/tools";
import { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

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

// Fetches all spans within a trace by trace ID and time window, optionally focused on a target span.
export const getTrace = BugsnagClient.createTool(
  {
    title: "Get Trace",
    summary: "Get all spans within a specific trace",
    purpose: "View the complete trace of operations for a request/transaction",
    useCases: [
      "Debug slow requests by viewing all operations in the trace",
      "Understand the flow of a request through the system",
      "Identify bottlenecks in distributed systems",
    ],
    inputSchema,
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
        description: "Get spans for a trace with pagination and target span",
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
  },
  async ({ client, args }) => {
    const project = await client.getInputProject(args.projectId);
    if (!args.traceId || !args.from || !args.to) {
      throw new ToolError("traceId, from, and to are required");
    }
    const result = await client.projectApi.listSpansByTraceId(
      project.id,
      args.traceId,
      args.from,
      args.to,
      args.targetSpanId,
      args.perPage,
      args.nextUrl,
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
