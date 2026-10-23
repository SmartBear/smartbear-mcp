import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { StopWorkflowRun } from "./stop-workflow-run";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("StopWorkflowRun", () => {
  let mockClient: any;
  let instance: StopWorkflowRun;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new StopWorkflowRun(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Stop Workflow Run");
    expect(instance.specification.toolset).toBe("Workflows");
  });

  it("should DELETE /workflow-runs/:runId and report cancelled: true", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const result = await instance.handle({ runId: 12 }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/workflow-runs/12",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toEqual({ runId: 12, cancelled: true });
  });

  it("should include the problem detail when the run has already finished", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        title: "Conflict",
        detail: "Workflow run is not in progress",
      }),
      { status: 409, statusText: "Conflict" },
    );

    await expect(instance.handle({ runId: 12 }, {} as any)).rejects.toThrow(
      "DELETE /workflow-runs/12 failed: 409 Conflict — Workflow run is not in progress",
    );
  });

  it("should fall back to a bare status line when the error body has no detail", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });

    await expect(instance.handle({ runId: 12 }, {} as any)).rejects.toThrow(
      "DELETE /workflow-runs/12 failed: 404",
    );
  });
});
