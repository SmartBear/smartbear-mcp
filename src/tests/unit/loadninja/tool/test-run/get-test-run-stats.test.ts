import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestRunStats } from "../../../../../loadninja/tool/test-run/get-test-run-stats";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("GetTestRunStats", () => {
	let mockClient: any;
	let instance: GetTestRunStats;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new GetTestRunStats(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Get Test Run Stats");
	});

	it("should GET /test-run/{id}/stats with correct URL and headers", async () => {
		const stats = {
			data: {
				overallTestStats: {
					testId: VALID_UUID,
					testStatus: "complete",
					totalSteps: 5,
					passedStepsCount: 5,
					failedStepCount: 0,
					avgResponseTimeMS: 1200,
				},
				scriptStats: {
					"script-1": {
						avgResponseTimeMS: 1100,
						pcntile90RespTimeMS: 7549,
					},
				},
				stepStats: {
					"step-1": {
						stepName: "Login",
						avgResponseTimeMS: 800,
					},
				},
			},
		};
		fetchMock.mockResponseOnce(JSON.stringify(stats));

		const result = await instance.handle(
			{ testRunId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/test-run/${VALID_UUID}/stats`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data.overallTestStats.testStatus).toBe("complete");
		expect(parsed.data.scriptStats["script-1"].avgResponseTimeMS).toBe(1100);
		expect(parsed.data.stepStats["step-1"].stepName).toBe("Login");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Not Found", { status: 500 });
		await expect(
			instance.handle({ testRunId: VALID_UUID }, {} as any),
		).rejects.toThrow(`GET /test-run/${VALID_UUID}/stats failed: 500`);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ testRunId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
