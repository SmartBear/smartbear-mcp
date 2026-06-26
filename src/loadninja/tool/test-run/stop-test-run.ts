import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
	testId: z
		.string()
		.uuid()
		.describe("Unique ID of the test run to stop."),
});

export class StopTestRun extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Stop Test Run",
		summary: "Stops a running load test by its test run ID.",
		inputSchema,
		readOnly: false,
		destructive: true,
		idempotent: false,
		useCases: [
			"Stop a running load test before it completes naturally",
			"Abort a test that is producing unexpected results",
		],
		hints: [
			"The test run must exist and be in progress",
			"After stopping, the status becomes stopForced",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const params = inputSchema.parse(args);
		const res = await fetch(`${this.client.getBaseUrl()}/test-run`, {
			method: "PATCH",
			headers: this.client.getHeaders(),
			body: JSON.stringify(params),
		});
		if (!res.ok)
			throw new ToolError(
				`PATCH /test-run failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
