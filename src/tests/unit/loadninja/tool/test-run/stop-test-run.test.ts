import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { StopTestRun } from "../../../../../loadninja/tool/test-run/stop-test-run";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("StopTestRun", () => {
	let mockClient: any;
	let instance: StopTestRun;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new StopTestRun(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("Stop Test Run");
		expect(instance.specification.readOnly).toBe(false);
		expect(instance.specification.destructive).toBe(true);
	});

	it("should PATCH /test-run with testId in body", async () => {
		const response = { message: "Test stopped" };
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(
			{ testId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.loadninja.com/v1/test-run",
			expect.objectContaining({
				method: "PATCH",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
				body: JSON.stringify({ testId: VALID_UUID }),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.message).toBe("Test stopped");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Not Found", { status: 500 });
		await expect(
			instance.handle({ testId: VALID_UUID }, {} as any),
		).rejects.toThrow("PATCH /test-run failed: 500");
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ testId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});

	it("should throw on missing testId", async () => {
		await expect(instance.handle({}, {} as any)).rejects.toThrow();
	});
});
