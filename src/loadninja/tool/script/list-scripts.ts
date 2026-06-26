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

export class ListScripts extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "List Scripts",
		summary:
			"Returns all scripts in the specified project.",
		inputSchema,
		useCases: [
			"List available scripts to get script IDs needed when creating scenarios",
			"Review which scripts exist in a project",
		],
		hints: [
			"Script IDs are required when creating scenarios or starting test runs",
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const { projectId } = inputSchema.parse(args);
		const res = await fetch(
			`${this.client.getBaseUrl()}/project/${projectId}/scripts`,
			{
				method: "GET",
				headers: this.client.getHeaders(),
			},
		);
		if (!res.ok)
			throw new ToolError(
				`GET /project/${projectId}/scripts failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
