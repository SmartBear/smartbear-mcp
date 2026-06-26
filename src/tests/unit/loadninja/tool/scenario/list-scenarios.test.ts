import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListScenarios } from "../../../../../loadninja/tool/scenario/list-scenarios";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("ListScenarios", () => {
	let mockClient: any;
	let instance: ListScenarios;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new ListScenarios(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("List Scenarios");
	});

	it("should GET /project/{id}/scenarios with correct URL and headers", async () => {
		const response = {
			data: [
				{
					scenarioId: "bacca5c2-2a19-11a2-7ok4a4305c69",
					scenarioName: "Sample scenario",
					durationBased: true,
					durationM: 5,
				},
			],
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(
			{ projectId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/project/${VALID_UUID}/scenarios`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data).toHaveLength(1);
		expect(parsed.data[0].scenarioName).toBe("Sample scenario");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Server Error", { status: 500 });
		await expect(
			instance.handle({ projectId: VALID_UUID }, {} as any),
		).rejects.toThrow(
			`GET /project/${VALID_UUID}/scenarios failed: 500`,
		);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ projectId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
