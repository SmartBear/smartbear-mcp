import { describe, expect, it, vi } from "vitest";
import {
  listEnvironmentsQueryParams,
  listEnvironmentsResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetEnvironments } from "../../../../../zephyr/tool/environment/get-environments.js";

const responseFromSpecificProjectMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 2,
  isLast: true,
  values: [
    {
      id: 1,
      project: {
        id: 1,
        self: "https://api.example.com/v2/projects/1",
      },
      name: "prod",
      description: "Production environment",
      index: 0,
      archived: false,
    },
    {
      id: 2,
      project: {
        id: 1,
        self: "https://api.example.com/v2/projects/1",
      },
      name: "dev",
      description: "Development environment",
      index: 1,
      archived: false,
    },
  ],
};

const responseFromAllProjectsMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 2,
  isLast: true,
  values: [
    {
      id: 1,
      project: {
        id: 1,
        self: "https://api.example.com/v2/projects/1",
      },
      name: "prod",
      description: "Production environment",
      index: 0,
      archived: false,
    },
    {
      id: 2,
      project: {
        id: 1,
        self: "https://api.example.com/v2/projects/1",
      },
      name: "dev",
      description: "Development environment",
      index: 1,
      archived: false,
    },
    {
      id: 3,
      project: {
        id: 2,
        self: "https://api.example.com/v2/projects/2",
      },
      name: "prod",
      description: "Production environment",
      index: 0,
      archived: false,
    },
  ],
};

describe("GetEnvironments", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetEnvironments(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Environments");
    expect(instance.specification.summary).toBe("Get environments in Zephyr");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      listEnvironmentsQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(listEnvironmentsResponse);
  });

  it("should call apiClient.get with all params", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const args = { projectKey: "PROJ", startAt: 0, maxResults: 10 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/environments", args);
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
  });

  it("should call apiClient.get without defined project key", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseFromAllProjectsMock);
    const args = { startAt: 0, maxResults: 10 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/environments", args);
    expect(result.structuredContent).toBe(responseFromAllProjectsMock);
  });

  it("should call apiClient.get without startAt", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const args = { projectKey: "PROJ", maxResults: 10 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/environments", args);
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
  });

  it("should call apiClient.get with default maxResults", async () => {
    mockApiClient.get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const result = await instance.handle(
      { projectKey: "PROJ", startAt: 0 },
      {},
    );
    expect(mockApiClient.get).toHaveBeenCalledWith("/environments", {
      projectKey: "PROJ",
      startAt: 0,
      maxResults: 10,
    });
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
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
