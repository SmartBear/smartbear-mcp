import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestRunRawStats } from "../../../../../loadninja/tool/test-run/get-test-run-raw-stats";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("GetTestRunRawStats", () => {
	let mockClient: any;
	let instance: GetTestRunRawStats;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new GetTestRunRawStats(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Get Test Run Raw Stats");
	});

	it("should GET /test-run/{id}/raw-stats with correct URL and headers", async () => {
		const rawStats = {
			data: {
				overallTestStats: [
					{
						testId: VALID_UUID,
						activeVirtualUsers: 3,
						avgResponseTimeMS: 900,
						processTime: "Fri, 22 Feb 2019 09:30:05 GMT",
					},
					{
						testId: VALID_UUID,
						activeVirtualUsers: 5,
						avgResponseTimeMS: 1100,
						processTime: "Fri, 22 Feb 2019 09:31:05 GMT",
					},
				],
				stepStats: [
					{
						stepName: "Login",
						avgResponseTimeMS: 800,
						processTime: "Fri, 22 Feb 2019 09:30:05 GMT",
					},
				],
			},
		};
		fetchMock.mockResponseOnce(JSON.stringify(rawStats));

		const result = await instance.handle(
			{ testRunId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/test-run/${VALID_UUID}/raw-stats`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data.overallTestStats).toHaveLength(2);
		expect(parsed.data.stepStats).toHaveLength(1);
		expect(parsed.data.overallTestStats[1].activeVirtualUsers).toBe(5);
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Not Found", { status: 500 });
		await expect(
			instance.handle({ testRunId: VALID_UUID }, {} as any),
		).rejects.toThrow(`GET /test-run/${VALID_UUID}/raw-stats failed: 500`);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ testRunId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
