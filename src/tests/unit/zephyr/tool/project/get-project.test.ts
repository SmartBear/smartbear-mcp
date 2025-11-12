import { describe, expect, it, vi } from "vitest";
import {
  getProjectParams,
  getProjectResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetProject } from "../../../../../zephyr/tool/project/get-project.js";

describe("GetProject", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetProject(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Project");
    expect(instance.specification.summary).toBe(
      "Get details of project specified by id or key in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(getProjectParams);
    expect(instance.specification.outputSchema).toBe(getProjectResponse);
  });

  it("should call apiClient.get with string projectIdOrKey and return formatted content", async () => {
    const responseMock = {
      id: 1,
      jiraProjectId: 10000,
      key: "PROJ",
      enabled: true,
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { projectIdOrKey: "PROJ" };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects/PROJ");
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.get with numeric string projectIdOrKey and return formatted content", async () => {
    const responseMock = {
      id: 39,
      jiraProjectId: 10003,
      key: "PRIV",
      enabled: true,
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { projectIdOrKey: "39" }; // Pass as string
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/projects/39");
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ projectIdOrKey: "PROJ" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should throw validation error if projectIdOrKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });
});
