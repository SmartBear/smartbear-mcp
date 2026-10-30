import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetWorkflowRun } from "./get-workflow-run";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("GetWorkflowRun", () => {
  let mockClient: any;
  let instance: GetWorkflowRun;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new GetWorkflowRun(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Workflow Run");
    expect(instance.specification.toolset).toBe("Workflows");
  });

  it("should GET /workflow-runs/:runId", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ id: 7, status: "completed", steps: [] }),
    );

    const result = await instance.handle({ runId: 7 }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/workflow-runs/7",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.status).toBe("completed");
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(instance.handle({ runId: 7 }, {} as any)).rejects.toThrow(
      "GET /workflow-runs/7 failed: 404",
    );
  });
});
