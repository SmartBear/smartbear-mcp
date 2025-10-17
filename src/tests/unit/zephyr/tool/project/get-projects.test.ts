import { describe, expect, it, vi } from "vitest";
import { ZephyrProjectListSchema } from "../../../../../zephyr/common/types.js";
import {
  GetProjects,
  GetProjectsInputSchema,
} from "../../../../../zephyr/tool/project/get-projects.js";

describe("GetProjects", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetProjects(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Projects");
    expect(instance.specification.summary).toBe(
      "Get details of projects in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetProjectsInputSchema);
    expect(instance.specification.outputSchema).toBe(ZephyrProjectListSchema);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 1,
          jiraProjectId: 10000,
          key: "PROJ",
          enabled: true,
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects", args);
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with undefined params", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 1,
          jiraProjectId: 10000,
          key: "PROJ",
          enabled: true,
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects", {
      maxResults: undefined,
      startAt: undefined,
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
