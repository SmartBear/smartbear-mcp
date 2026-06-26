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

export class ListScenarios extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "List Scenarios",
		summary:
			"Returns all load test scenarios in the specified project.",
		inputSchema,
		useCases: [
			"Browse scenarios in a project to find a scenario ID for test runs",
			"Review all load test configurations in a project",
		],
		hints: [
			"Each scenario is either duration-based (durationBased=true, durationM field) or iteration-based (durationBased=false, iterations field)",
			"Use GetScenario for detailed info about a specific scenario",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { projectId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/project/${projectId}/scenarios`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /project/${projectId}/scenarios failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
