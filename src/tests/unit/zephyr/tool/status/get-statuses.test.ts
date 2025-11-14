import { describe, expect, it, vi } from "vitest";
import {
  listStatusesQueryParams,
  listStatusesResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetStatuses } from "../../../../../zephyr/tool/status/get-statuses.js";

const responseMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 1,
  isLast: true,
  values: [
    {
      id: 1,
      project: { id: 123, self: "https://zephyr.example.com/projects/123" },
      name: "In Progress",
      description: "Work is in progress",
      index: 0,
      color: "#00FF00",
      archived: false,
      default: false,
    },
  ],
};

describe("GetStatuses", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetStatuses(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Statuses");
    expect(instance.specification.summary).toBe(
      "Get statuses of different types of test artifacts in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(listStatusesQueryParams);
    expect(instance.specification.outputSchema).toBe(listStatusesResponse);
  });

  it("should call apiClient.get with all params including statusType and projectKey", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = {
      maxResults: 10,
      startAt: 0,
      statusType: "TEST_CASE",
      projectKey: "PROJ",
    } as const;
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/statuses", args);
    expect(result.structuredContent).toEqual(responseMock);
  });

  it("should call apiClient.get with only statusType", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { statusType: "TEST_PLAN" } as const;
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/statuses", {
      ...args,
      maxResults: 10,
    });
    expect(result.structuredContent).toEqual(responseMock);
  });

  it("should call apiClient.get with only projectKey", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { projectKey: "PROJ" } as const;
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/statuses", {
      ...args,
      maxResults: 10,
    });
    expect(result.structuredContent).toEqual(responseMock);
  });

  it("should handle empty args (all undefined optional params)", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/statuses", {
      maxResults: 10,
    });
    expect(result.structuredContent).toEqual(responseMock);
  });

  it("should propagate errors from apiClient.get", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected undefined data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
