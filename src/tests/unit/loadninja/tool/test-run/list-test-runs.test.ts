import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListTestRuns } from "../../../../../loadninja/tool/test-run/list-test-runs";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("ListTestRuns", () => {
	let mockClient: any;
	let instance: ListTestRuns;

	beforeEach(() => {
		fetchMock.resetMocks();
		mockClient = {
			getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
			getHeaders: vi.fn().mockReturnValue({
				authorization: "test-key",
				"Content-Type": "application/json",
			}),
		};
		instance = new ListTestRuns(mockClient);
	});

	it("should set specification correctly", () => {
		expect(instance.specification.title).toBe("List Test Runs");
	});

	it("should GET /project/{id}/test-runs with correct URL and headers", async () => {
		const response = {
			data: [
				{
					testId: "000ba0b0-04c2-11ea-a55a-c737567539fa",
					testName: "Login/logout",
					status: "complete",
					createDate: "Mon, 11 Nov 2019 20:29:45 GMT",
				},
				{
					testId: "0055b680-0c6c-11ea-83e6-e57443628a1a",
					testName: "Catalog search",
					status: "stopForced",
					createDate: "Thu, 21 Nov 2019 14:34:18 GMT",
				},
			],
		};
		fetchMock.mockResponseOnce(JSON.stringify(response));

		const result = await instance.handle(
			{ projectId: VALID_UUID },
			{} as any,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			`https://api.loadninja.com/v1/project/${VALID_UUID}/test-runs`,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					authorization: "test-key",
				}),
			}),
		);

		const parsed = JSON.parse((result.content[0] as any).text);
		expect(parsed.data).toHaveLength(2);
		expect(parsed.data[0].status).toBe("complete");
		expect(parsed.data[1].status).toBe("stopForced");
	});

	it("should throw ToolError on non-2xx response", async () => {
		fetchMock.mockResponseOnce("Server Error", { status: 500 });
		await expect(
			instance.handle({ projectId: VALID_UUID }, {} as any),
		).rejects.toThrow(
			`GET /project/${VALID_UUID}/test-runs failed: 500`,
		);
	});

	it("should throw on invalid UUID", async () => {
		await expect(
			instance.handle({ projectId: "bad-id" }, {} as any),
		).rejects.toThrow();
	});
});
