import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
	scenarioName: z.string().min(6).describe("Scenario name."),
	scenarioId: z
		.string()
		.uuid()
		.optional()
		.describe("Unique ID of the scenario."),
	projectId: z.string().uuid().describe("Unique ID of the project."),
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
		.describe("Error timeout in seconds."),
	scripts: z
		.array(
			z.object({
				scriptId: z
					.string()
					.uuid()
					.describe("Unique ID of the script."),
				virtualUsers: z
					.number()
					.int()
					.describe("Number of virtual users for this script."),
				scriptName: z.string().optional().describe("Script name."),
				accountId: z
					.string()
					.uuid()
					.optional()
					.describe("Account ID of the script owner."),
				loadPercent: z
					.number()
					.int()
					.optional()
					.describe("Percent of total virtual users for this script."),
				projectId: z
					.string()
					.uuid()
					.optional()
					.describe("Project ID containing the script."),
				createDate: z
					.string()
					.optional()
					.describe("Date the script was created."),
			}),
		)
		.min(1)
		.describe("Scripts to run in the test."),
});

export class StartTestRun extends Tool<LoadNinjaClient> {
	specification: ToolParams = {
		title: "Start Test Run",
		summary:
			"Starts a new load test run with the given scenario configuration.",
		inputSchema,
		readOnly: false,
		destructive: false,
		idempotent: false,
		useCases: [
			"Start a load test run with a given scenario configuration",
			"Launch a performance test programmatically",
		],
		hints: [
			"The easiest way is to first call GetScenario to get the full config, then pass it here",
			"Returns the test run ID needed for status/summary/stats queries",
			"Use GetTestRunStatus to monitor progress after starting",
		],
		examples: [
			{
				description: "Start a test run from scenario configuration",
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
							virtualUsers: 5,
						},
					],
				},
			},
		],
	};

	handle: ToolCallback<ZodRawShape> = async (args) => {
		const params = inputSchema.parse(args);
		const res = await fetch(`${this.client.getBaseUrl()}/test-run`, {
			method: "POST",
			headers: this.client.getHeaders(),
			body: JSON.stringify(params),
		});
		if (!res.ok)
			throw new ToolError(
				`POST /test-run failed: ${res.status} ${res.statusText}`,
			);
		return {
			content: [{ type: "text", text: JSON.stringify(await res.json()) }],
		};
	};
}
