import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListScripts } from "../../../../../loadninja/tool/script/list-scripts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("ListScripts", () => {
	let mockClient: any;
	let instance: ListScripts;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new ListScripts(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("List Scripts");
	});

	it("should GET /project/{id}/scripts with correct URL and headers", async () => {
		const response = {
			data: [
				{
					scriptId: "12345a0-abba-11e2-1125-2b4433f9abb1",
					scriptName: "Sample script",
					projectId: VALID_UUID,
				},
			],
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(
			{ projectId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/project/${VALID_UUID}/scripts`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data).toHaveLength(1);
		expect(parsed.data[0].scriptName).toBe("Sample script");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Server Error", { status: 500 });
		await expect(
			instance.handle({ projectId: VALID_UUID }, {} as any),
		).rejects.toThrow(
			`GET /project/${VALID_UUID}/scripts failed: 500`,
		);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ projectId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
