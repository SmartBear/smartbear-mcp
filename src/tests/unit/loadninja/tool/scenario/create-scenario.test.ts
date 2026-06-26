import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CreateScenario } from "../../../../../loadninja/tool/scenario/create-scenario";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";
const SCRIPT_UUID = "12345a0a-abba-11e2-9125-2b4433f9abb1";

const baseDurationParams = {
	scenarioName: "My Load Test",
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

const baseIterationParams = {
	scenarioName: "Iteration Test",
	projectId: VALID_UUID,
	durationBased: false,
	iterations: 10,
	iterationDelayS: 2,
	rampUpM: 1,
	thinkTimeMode: "random" as const,
	timeoutDelayS: 10,
	scripts: [{ scriptId: SCRIPT_UUID, virtualUsers: 3 }],
};

describe("CreateScenario", () => {
	let mockClient: any;
	let instance: CreateScenario;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new CreateScenario(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Create Scenario");
		expect(instance.specification.readOnly).toBe(false);
		expect(instance.specification.destructive).toBe(false);
	});

	it("should POST /scenario with duration-based params", async () => {
		const response = {
			data: { scenarioId: "new-scenario-id", ...baseDurationParams },
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(baseDurationParams, {} as any);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.loadninja.com/v1/scenario",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
				body: JSON.stringify(baseDurationParams),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data.scenarioId).toBe("new-scenario-id");
	});

	it("should POST /scenario with iteration-based params", async () => {
		const response = {
			data: { scenarioId: "iter-scenario-id", ...baseIterationParams },
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(baseIterationParams, {} as any);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.loadninja.com/v1/scenario",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify(baseIterationParams),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data.scenarioId).toBe("iter-scenario-id");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Server Error", { status: 500 });
		await expect(
			instance.handle(baseDurationParams, {} as any),
		).rejects.toThrow("POST /scenario failed: 500");
	});

	it("should throw on invalid input (name too short)", async () => {
		await expect(
			instance.handle({ ...baseDurationParams, scenarioName: "ab" }, {} as any),
		).rejects.toThrow();
	});

	it("should throw on missing scripts", async () => {
		const { scripts: _, ...noScripts } = baseDurationParams;
		await expect(
			instance.handle(noScripts, {} as any),
		).rejects.toThrow();
	});

	it("should throw on empty scripts array", async () => {
		await expect(
			instance.handle({ ...baseDurationParams, scripts: [] }, {} as any),
		).rejects.toThrow();
	});

	it("should throw on invalid projectId", async () => {
		await expect(
			instance.handle(
				{ ...baseDurationParams, projectId: "not-a-uuid" },
				{} as any,
			),
		).rejects.toThrow();
	});
});
