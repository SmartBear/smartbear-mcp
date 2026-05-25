import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestRunStatus } from "../../../../../loadninja/tool/test-run/get-test-run-status";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "12515c30-1512-40e1-a2cc-c1c156780a8e";

describe("GetTestRunStatus", () => {
  let mockClient: any;
  let instance: GetTestRunStatus;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
      getHeaders: vi.fn().mockReturnValue({
        authorization: "test-key",
        "Content-Type": "application/json",
      }),
    };
    instance = new GetTestRunStatus(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Run Status");
  });

  it("should GET /test-run/{id}/status with correct URL and headers", async () => {
    const status = {
      message: "Status lookup success",
      data: {
        status: "TEST_COMPLETE",
        requiredServerCount: 1,
        registeredServerCount: 1,
        completedTestCount: 1,
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(status));

    const result = await instance.handle(
      { testRunId: VALID_UUID },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.loadninja.com/v1/test-run/${VALID_UUID}/status`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "test-key",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.data.status).toBe("TEST_COMPLETE");
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 500 });
    await expect(
      instance.handle({ testRunId: VALID_UUID }, {} as any),
    ).rejects.toThrow(`GET /test-run/${VALID_UUID}/status failed: 500`);
  });

  it("should throw on invalid UUID", async () => {
    await expect(
      instance.handle({ testRunId: "bad-id" }, {} as any),
    ).rejects.toThrow();
  });
});
