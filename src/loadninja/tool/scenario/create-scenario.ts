import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
	scenarioName: z
		.string()
		.min(6)
		.max(30)
		.describe("Scenario name."),
	projectId: z
		.string()
		.uuid()
		.describe("ID of the project to contain the scenario."),
	durationBased: z
		.boolean()
		.describe(
			"true = duration-based test (provide durationM), false = iteration-based test (provide iterations).",
		),
	durationM: z
		.number()
		.int()
		.optional()
		.describe(
			"Duration of maximum load in minutes. Required if durationBased=true.",
		),
	iterations: z
		.number()
		.int()
		.optional()
		.describe(
			"Number of iterations per virtual user. Required if durationBased=false.",
		),
	iterationDelayS: z
		.number()
		.int()
		.min(1)
		.max(10)
		.describe("Pause between script runs per virtual user, in seconds."),
	rampUpM: z
		.number()
		.int()
		.min(1)
		.describe("Warm-up period in minutes."),
	thinkTimeMode: z
		.enum(["fixed", "recorded", "minimum", "random"])
		.describe("Think time simulation mode."),
	thinkTimeMS: z
		.number()
		.int()
		.min(100)
		.max(10000)
		.optional()
		.describe(
			"Think time duration in ms. Required if thinkTimeMode='fixed'.",
		),
	timeoutDelayS: z
		.number()
		.int()
		.min(1)
		.max(20000)
		.describe("Error timeout in seconds."),
	scripts: z
		.array(
			z.object({
				scriptId: z.string().uuid().describe("Unique ID of the script."),
				virtualUsers: z
					.number()
					.int()
					.describe("Number of virtual users for this script."),
			}),
		)
		.min(1)
		.describe("Scripts to include in the scenario."),
});

export class CreateScenario extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Create Scenario",
		summary:
			"Creates a new load test scenario in the specified project.",
		inputSchema,
		readOnly: false,
		destructive: false,
		idempotent: false,
		useCases: [
			"Create a new load test scenario with specific configuration",
			"Set up a duration-based or iteration-based test",
		],
		hints: [
			"If durationBased=true, provide durationM and omit iterations",
			"If durationBased=false, provide iterations and omit durationM",
			"If thinkTimeMode='fixed', thinkTimeMS is required",
			"Use ListScripts first to get valid script IDs",
		],
		examples: [
			{
				description:
					"Create a 5-minute duration-based scenario with 10 VUs",
				parameters: {
					scenarioName: "Checkout Load Test",
					projectId: "25298d90-2add-11e9-8ccb-8171992e3f9b",
					durationBased: true,
					durationM: 5,
					iterationDelayS: 3,
					rampUpM: 1,
					thinkTimeMode: "fixed",
					thinkTimeMS: 500,
					timeoutDelayS: 10,
					scripts: [
						{
							scriptId: "12345a0a-abba-11e2-1125-2b4433f9abb1",
							virtualUsers: 10,
						},
					],
				},
			},
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const params = inputSchema.parse(args);
		const res = await fetch(`${this.client.getBaseUrl()}/scenario`, {
			method: "POST",
			headers: this.client.getHeaders(),
			body: JSON.stringify(params),
		});
		if (!res.ok)
			throw new ToolError(
				`POST /scenario failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
