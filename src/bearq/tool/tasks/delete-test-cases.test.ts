import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { DeleteTestCases } from "./delete-test-cases";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("DeleteTestCases", () => {
  let mockClient: any;
  let instance: DeleteTestCases;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new DeleteTestCases(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Delete Test Cases");
  });

  it("should DELETE /test-cases/:id for each id", async () => {
    fetchMock.mockResponse(JSON.stringify({ deleted: true }));

    const result = await instance.handle({ testCaseIds: [1, 2] }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/test-cases/1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/test-cases/2",
      expect.objectContaining({ method: "DELETE" }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.deleted).toEqual([1, 2]);
    expect(parsed.failed).toEqual([]);
  });

  it("should report per-id failures instead of throwing", async () => {
    fetchMock.mockResponseOnce("Bad Request", { status: 400 });

    const result = await instance.handle({ testCaseIds: [7] }, {} as any);

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.deleted).toEqual([]);
    expect(parsed.failed[0].testCaseId).toBe(7);
    expect(parsed.failed[0].error).toContain("400");
  });

  it("should throw on empty testCaseIds (Zod validation)", async () => {
    await expect(
      instance.handle({ testCaseIds: [] }, {} as any),
    ).rejects.toThrow();
  });

  it("should throw on missing testCaseIds (Zod validation)", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });
});
