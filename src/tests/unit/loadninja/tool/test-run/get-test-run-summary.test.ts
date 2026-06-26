import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestRunSummary } from "../../../../../loadninja/tool/test-run/get-test-run-summary";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("GetTestRunSummary", () => {
	let mockClient: any;
	let instance: GetTestRunSummary;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new GetTestRunSummary(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Get Test Run Summary");
	});

	it("should GET /test-run/{id}/summary with correct URL and headers", async () => {
		const summary = {
			data: {
				testId: VALID_UUID,
				totalSteps: 10,
				passedSteps: 9,
				failedSteps: 1,
				avgResponseTimeMS: 1200,
				minResponseTimeMS: 750,
				maxResponseTimeMS: 1800,
			},
		};
		fetchMock.mockResponseOnce(JSON.stringify(summary));

		const result = await instance.handle(
			{ testRunId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/test-run/${VALID_UUID}/summary`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data.totalSteps).toBe(10);
		expect(parsed.data.passedSteps).toBe(9);
		expect(parsed.data.failedSteps).toBe(1);
		expect(parsed.data.avgResponseTimeMS).toBe(1200);
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Not Found", { status: 500 });
		await expect(
			instance.handle({ testRunId: VALID_UUID }, {} as any),
		).rejects.toThrow(`GET /test-run/${VALID_UUID}/summary failed: 500`);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ testRunId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
