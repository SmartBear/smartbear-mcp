import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { RunWorkflow } from "./run-workflow";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const workflowsPage = (workflows: { id: number; name: string }[]) =>
  JSON.stringify({
    workflows,
    page: 1,
    size: 100,
    totalCount: workflows.length,
  });

describe("RunWorkflow", () => {
  let mockClient: any;
  let instance: RunWorkflow;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RunWorkflow(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Run Workflow");
    expect(instance.specification.toolset).toBe("Workflows");
  });

  it("should POST to the workflow's runs endpoint when given a numeric ID", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ run: { id: 42, status: "running" }, started: true }),
    );

    const result = await instance.handle({ workflow: "17" }, {} as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/workflows/17/runs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.run.id).toBe(42);
    expect(parsed.started).toBe(true);
  });

  it("should resolve a name case-insensitively via GET /workflows", async () => {
    fetchMock
      .mockResponseOnce(
        workflowsPage([
          { id: 3, name: "Nightly Regression" },
          { id: 5, name: "Smoke" },
        ]),
      )
      .mockResponseOnce(
        JSON.stringify({ run: { id: 9, status: "pending" }, started: true }),
      );

    const result = await instance.handle(
      { workflow: "nightly regression" },
      {} as any,
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.bearq.smartbear.com/workflows?page=1&size=100",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.bearq.smartbear.com/workflows/3/runs",
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.run.id).toBe(9);
  });

  it("should walk pages until the name is found", async () => {
    fetchMock
      .mockResponseOnce(
        JSON.stringify({
          workflows: [{ id: 1, name: "Smoke" }],
          page: 1,
          size: 100,
          totalCount: 2,
        }),
      )
      .mockResponseOnce(
        JSON.stringify({
          workflows: [{ id: 2, name: "Nightly Regression" }],
          page: 2,
          size: 100,
          totalCount: 2,
        }),
      )
      .mockResponseOnce(
        JSON.stringify({ run: { id: 11, status: "running" }, started: false }),
      );

    await instance.handle({ workflow: "Nightly Regression" }, {} as any);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.bearq.smartbear.com/workflows?page=1&size=100",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.bearq.smartbear.com/workflows?page=2&size=100",
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://api.bearq.smartbear.com/workflows/2/runs",
    );
  });

  it("should throw ToolError listing workflows when the name is unknown", async () => {
    fetchMock.mockResponseOnce(
      workflowsPage([
        { id: 3, name: "Nightly Regression" },
        { id: 5, name: "Smoke" },
      ]),
    );

    await expect(
      instance.handle({ workflow: "Nope" }, {} as any),
    ).rejects.toThrow(
      'No BearQ workflow named "Nope". Available workflows: Nightly Regression, Smoke',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should throw ToolError when the run POST fails", async () => {
    fetchMock.mockResponseOnce("Conflict", { status: 409 });

    await expect(
      instance.handle({ workflow: "17" }, {} as any),
    ).rejects.toThrow("POST /workflows/17/runs failed: 409");
  });

  it("should throw ToolError when the workflow list fails during name resolution", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

    await expect(
      instance.handle({ workflow: "Smoke" }, {} as any),
    ).rejects.toThrow("GET /workflows failed: 401");
  });
});
