import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { StartTestRun } from "../../../../../loadninja/tool/test-run/start-test-run";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";
const SCRIPT_UUID = "12345a0a-abba-11e2-9125-2b4433f9abb1";

const validParams = {
	scenarioName: "Checkout Load Test",
	projectId: VALID_UUID,
	durationBased: true,
	durationM: 5,
	iterationDelayS: 3,
	rampUpM: 1,
	thinkTimeMode: "fixed" as const,
	thinkTimeMS: 500,
	timeoutDelayS: 10,
	scripts: [{ scriptId: SCRIPT_UUID, virtualUsers: 5 }],
};

describe("StartTestRun", () => {
	let mockClient: any;
	let instance: StartTestRun;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new StartTestRun(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Start Test Run");
		expect(instance.specification.readOnly).toBe(false);
		expect(instance.specification.destructive).toBe(false);
	});

	it("should POST /test-run with scenario configuration", async () => {
		const response = {
			message: "Test initiated",
			data: [
				{
					testId: "aabbccdd-1122-33ee-44ff-556677889900",
					scenario: validParams,
				},
			],
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(validParams, {} as any);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.loadninja.com/v1/test-run",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
				body: JSON.stringify(validParams),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.message).toBe("Test initiated");
		expect(parsed.data[0].testId).toBe(
			"aabbccdd-1122-33ee-44ff-556677889900",
		);
	});

	it("should accept optional scenario fields from GetScenario output", async () => {
		const withOptionalFields = {
			...validParams,
			scenarioId: VALID_UUID,
			scripts: [
				{
					scriptId: SCRIPT_UUID,
					virtualUsers: 5,
					scriptName: "Login Script",
					loadPercent: 100,
				},
			],
		};
		const response = { message: "Test initiated", data: [] };
		fetchMock.mockResponseOnce(JSON.stringify(response));

		await instance.handle(withOptionalFields, {} as any);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.loadninja.com/v1/test-run",
			expect.objectContaining({
				method: "POST",
			}),
		);

		const body = JSON.parse(
			(fetchMock.mock.calls[0][1] as any).body as string,
		);
		expect(body.scenarioId).toBe(VALID_UUID);
		expect(body.scripts[0].scriptName).toBe("Login Script");
		expect(body.scripts[0].loadPercent).toBe(100);
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Server Error", { status: 500 });
		await expect(
			instance.handle(validParams, {} as any),
		).rejects.toThrow("POST /test-run failed: 500");
	});

	it("should throw on missing required fields", async () => {
		await expect(
			instance.handle({ scenarioName: "Test" }, {} as any),
		).rejects.toThrow();
	});

	it("should throw on empty scripts array", async () => {
		await expect(
			instance.handle({ ...validParams, scripts: [] }, {} as any),
		).rejects.toThrow();
	});
});
