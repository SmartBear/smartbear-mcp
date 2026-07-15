import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { GetProjectsResponse } from "../../schema/project.schema.ts";
import { GetProjects } from "./get-projects.ts";

type HandleExtra = Parameters<GetProjects["handle"]>[1];

describe("GetProjects", () => {
  let mockClient: { getApiClient: ReturnType<typeof vi.fn> };
  let instance: GetProjects;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        post: vi.fn(),
      }),
    };
    instance = new GetProjects(mockClient as unknown as Qtm4jClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Projects");
    expect(instance.specification.summary).toBe(
      "Get all projects from QTM4J with optional filtering",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBeDefined();
  });

  it("should call apiClient.post with correct params and return formatted content", async () => {
    const responseMock = {
      total: 1,
      data: [
        {
          id: 10_000,
          key: "PROJ",
          name: "Project Name",
          favorite: false,
          qmetryEnabled: true,
        },
      ],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0 };
    const result = await instance.handle(args, {} as unknown as HandleExtra);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      ENDPOINTS.PROJECTS,
      {
        startAt: 0,
        maxResults: 10,
      },
    );
    expect(result.structuredContent).toStrictEqual(responseMock);
  });

  it("should handle empty args and call apiClient.post with default param values", async () => {
    const responseMock = {
      total: 0,
      data: [],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {} as unknown as HandleExtra);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      ENDPOINTS.PROJECTS,
      {
        maxResults: 100, // default value
        startAt: 0, // default value
      },
    );
    expect(result.structuredContent).toStrictEqual(responseMock);
  });

  it("should include optional filters in request body", async () => {
    const responseMock = {
      total: 1,
      data: [{ id: 123, key: "TEST", name: "Test Project" }],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = {
      projectId: 123,
      search: "TEST",
      qmetryEnabled: true,
      maxResults: 50,
      startAt: 10,
    };
    const result = await instance.handle(args, {} as unknown as HandleExtra);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      ENDPOINTS.PROJECTS,
      {
        startAt: 10,
        maxResults: 50,
        projectId: 123,
        search: "TEST",
        qmetryEnabled: true,
      },
    );
    expect(result.structuredContent).toStrictEqual(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ maxResults: 1 }, {} as unknown as HandleExtra),
    ).rejects.toThrow("API error");
  });

  it("should reject when apiClient.post returns invalid data (schema validation)", async () => {
    // Mock response missing required 'data' field
    mockClient.getApiClient().post.mockResolvedValueOnce({
      total: 1,
    });
    await expect(
      instance.handle({ maxResults: 1 }, {} as unknown as HandleExtra),
    ).rejects.toThrow();
  });

  it("should validate response against schema", async () => {
    const validResponse = {
      total: 2,
      data: [
        { id: 1, key: "P1", name: "Project 1" },
        { id: 2, key: "P2", name: "Project 2" },
      ],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(validResponse);
    const result = await instance.handle({}, {} as unknown as HandleExtra);
    const parsed = GetProjectsResponse.parse(result.structuredContent);
    expect(parsed.total).toBe(2);
    expect(parsed.data).toHaveLength(2);
  });

  it("should handle projectId being 0", async () => {
    const responseMock = {
      total: 1,
      data: [{ id: 0, key: "TEST", name: "Test Project" }],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = { projectId: 0 };
    await instance.handle(args, {} as unknown as HandleExtra);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      ENDPOINTS.PROJECTS,
      expect.objectContaining({
        projectId: 0,
      }),
    );
  });

  it("should omit undefined optional fields", async () => {
    const responseMock = {
      total: 0,
      data: [],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = {
      projectId: undefined,
      search: undefined,
      qmetryEnabled: undefined,
    };
    await instance.handle(args, {} as unknown as HandleExtra);
    const [[, callArgs]] = mockClient.getApiClient().post.mock.calls;
    expect(callArgs).not.toHaveProperty("projectId");
    expect(callArgs).not.toHaveProperty("search");
    expect(callArgs).not.toHaveProperty("qmetryEnabled");
  });

  it("should include qmetryEnabled when false", async () => {
    const responseMock = {
      total: 1,
      data: [{ id: 1, key: "P", name: "Project" }],
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = { qmetryEnabled: false };
    await instance.handle(args, {} as unknown as HandleExtra);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      ENDPOINTS.PROJECTS,
      expect.objectContaining({
        qmetryEnabled: false,
      }),
    );
  });
});
