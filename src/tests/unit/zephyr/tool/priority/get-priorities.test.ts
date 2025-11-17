import { describe, expect, it, vi } from "vitest";
import {
  listPrioritiesQueryParams,
  listPrioritiesResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetPriorities } from "../../../../../zephyr/tool/priority/get-priorities.js";

describe("GetProjectPriorities", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetPriorities(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get priorities");
    expect(instance.specification.summary).toBe(
      "Get Zephyr Test Case priorities with optional filters",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(listPrioritiesQueryParams);
    expect(instance.specification.outputSchema).toBe(listPrioritiesResponse);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 3,
      isLast: true,
      values: [
        {
          id: 829899,
          project: {
            id: 47432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "High",
          description: null,
          index: 0,
          color: "#ff0000",
          default: false,
        },
        {
          id: 829900,
          project: {
            id: 47432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "Normal",
          description: null,
          index: 1,
          color: "#ffa900",
          default: true,
        },
        {
          id: 829901,
          project: {
            id: 47432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "Low",
          description: null,
          index: 2,
          color: "#008000",
          default: false,
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0, projectKey: "PROJ" };
    const result = await instance.handle(args, {} as any);
    expect(mockApiClient.get).toHaveBeenCalledWith("/priorities", {
      maxResults: 10,
      startAt: 0,
      projectKey: "PROJ",
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default params", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 825179,
          project: {
            id: 47165,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47165",
          },
          name: "Normal",
          description: null,
          index: 1,
          color: "#ffa900",
          default: true,
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {} as any);
    expect(mockApiClient.get).toHaveBeenCalledWith("/priorities", {
      maxResults: 10, // default value from schema
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {} as any)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {} as any);
    expect(result.structuredContent).toBeUndefined();
  });
});
