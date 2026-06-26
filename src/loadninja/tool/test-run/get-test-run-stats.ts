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

export class GetTestRunStats extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Get Test Run Stats",
		summary:
			"Returns extensive statistics on the test run, including overall, per-script, and per-step metrics.",
		inputSchema,
		useCases: [
			"Analyze detailed performance metrics per script and per step",
			"Identify bottleneck steps or scripts in a load test",
		],
		hints: [
			"These metrics match the Statistics tab in the LoadNinja UI",
			"scriptStats and stepStats are keyed by script/step ID",
			"Includes percentile data (p90, p95), DOM load times, DNS times, TTFB, and more",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { testRunId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/test-run/${testRunId}/stats`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /test-run/${testRunId}/stats failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
