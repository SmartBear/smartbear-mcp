import { describe, expect, it, vi } from "vitest";
import { ZephyrProjectListSchema } from "../../../../../zephyr/common/types";
import {
  GetProjects,
  GetProjectsInputSchema,
} from "../../../../../zephyr/tool/project/get-projects";

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
    const responseMock = { projects: [{ id: 1, name: "Test Project" }] };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects", args);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Test Project");
  });

  it("should handle empty args and call apiClient.get with undefined params", async () => {
    mockApiClient.get.mockResolvedValueOnce({ projects: [] });
    const result = await instance.handle({}, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects", {
      maxResults: undefined,
      startAt: undefined,
    });
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("projects");
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
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBeUndefined();
  });
});
