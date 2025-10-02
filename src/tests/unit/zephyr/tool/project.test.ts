import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../../../../zephyr/common/api-client";
import { ProjectTools } from "../../../../zephyr/tool/project";

describe("ProjectTools", () => {
  it("should call apiClient.get with correct params", async () => {
    const mockGet = vi.fn().mockResolvedValue({ foo: "bar" });
    const apiClient = { get: mockGet } as ApiClient;
    const tools = new ProjectTools(apiClient);
    const result = await tools.getProjects(5, 1);
    expect(mockGet).toHaveBeenCalledWith("/projects", {
      maxResults: 5,
      startAt: 1,
    });
    expect(result).toEqual({ foo: "bar" });
  });
});
