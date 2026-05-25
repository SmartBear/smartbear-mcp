import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
  scenarioId: z
    .string()
    .uuid()
    .describe("Unique ID of the scenario to retrieve."),
});

export class GetScenario extends Tool<LoadNinjaClient> {
  specification: ToolParams = {
    title: "Get Scenario",
    summary:
      "Returns details of a load test scenario, including virtual user configuration, duration/iteration settings, and assigned scripts.",
    inputSchema,
    useCases: [
      "Inspect scenario configuration before starting a test run",
      "Verify virtual user count and script assignments",
    ],
    hints: [
      "Scenario IDs can be found by listing projects — each project contains its scenarios",
      "A scenario is either duration-based (durationBased=true, durationM field) or iteration-based (durationBased=false, iterations field)",
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { scenarioId } = inputSchema.parse(args);
    const res = await fetch(
      `${this.client.getBaseUrl()}/scenario/${scenarioId}`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );
    if (!res.ok)
      throw new ToolError(
        `GET /scenario/${scenarioId} failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
