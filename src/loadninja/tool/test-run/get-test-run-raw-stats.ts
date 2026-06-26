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

export class GetTestRunRawStats extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Get Test Run Raw Stats",
		summary:
			"Returns raw time-series metrics of individual scripts and steps for charting.",
		inputSchema,
		useCases: [
			"Get raw time-series data for charting test run performance over time",
			"Analyze how metrics changed during the test execution",
		],
		hints: [
			"These are the same metrics used to draw charts in the LoadNinja UI",
			"Returns arrays (time-series) rather than aggregates — use GetTestRunStats for aggregated stats",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { testRunId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/test-run/${testRunId}/raw-stats`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /test-run/${testRunId}/raw-stats failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
