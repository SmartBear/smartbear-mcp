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

export class GetTestRunSummary extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Get Test Run Summary",
		summary:
			"Returns a brief summary of test run results, including average response times and pass/fail step counts.",
		inputSchema,
		useCases: [
			"Get a quick overview of test results after a run completes",
			"Check pass/fail rates and average response times",
		],
		hints: [
			"Returns high-level metrics; use GetTestRunStats for detailed per-script/per-step breakdowns",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { testRunId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/test-run/${testRunId}/summary`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /test-run/${testRunId}/summary failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
