import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
	projectId: z
		.string()
		.uuid()
		.describe("Unique ID of the project."),
});

export class ListTestRuns extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "List Test Runs",
		summary:
			"Returns all test run IDs, names, and statuses for the specified project.",
		inputSchema,
		useCases: [
			"Browse test run history for a project",
			"Find a test run ID to retrieve its summary or stats",
		],
		hints: [
			"Status values: starting, complete, waiting, testing, stopForced, Error",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { projectId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/project/${projectId}/test-runs`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /project/${projectId}/test-runs failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
