import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listProjectsQueryParams,
  listProjects200Response as listProjectsResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetProjects } from "../../../../../zephyr/tool/project/get-projects";

describe("GetProjects", () => {
  let mockClient: any;
  let instance: GetProjects;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetProjects(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Projects");
    expect(instance.specification.summary).toBe(
      "Get details of projects in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(listProjectsQueryParams);
    expect(instance.specification.outputSchema).toBe(listProjectsResponse);
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
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0 };
    const result = await instance.handle(args, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/projects",
      args,
    );
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
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/projects", {
      maxResults: 10, // default value
      startAt: undefined,
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
