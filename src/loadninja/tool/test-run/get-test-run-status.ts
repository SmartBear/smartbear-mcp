import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
  testRunId: z
    .string()
    .uuid()
    .describe("Unique ID of the test run."),
});

export class GetTestRunStatus extends Tool<LoadNinjaClient> {
  specification: ToolParams = {
    title: "Get Test Run Status",
    summary:
      "Returns the current status of a test run, including the number of requested and registered cloud machines and completed tests.",
    inputSchema,
    useCases: [
      "Monitor a running test to check progress",
      "Verify whether a test run has completed",
    ],
    hints: [
      "The status field indicates the test state (e.g. TEST_COMPLETE)",
      "Use this to poll test progress after starting a test run",
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testRunId } = inputSchema.parse(args);
    const res = await fetch(
      `${this.client.getBaseUrl()}/test-run/${testRunId}/status`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );
    if (!res.ok)
      throw new ToolError(
        `GET /test-run/${testRunId}/status failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
