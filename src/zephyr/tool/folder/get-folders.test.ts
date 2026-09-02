import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListFolders200Response,
  ListFoldersQueryParams,
} from "../../common/rest-api-schemas";
import { GetFolders } from "./get-folders";

describe("GetFolders", () => {
  let mockClient: any;
  let instance: GetFolders;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetFolders(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Folders");
    expect(instance.specification.summary).toBe(
      "Get folders, optionally filtered by project and folder type",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(ListFoldersQueryParams);
    expect(instance.specification.outputSchema).toBe(ListFolders200Response);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 2,
      isLast: true,
      values: [
        {
          id: 1,
          parentId: null,
          name: "Regression Tests",
          index: 0,
          folderType: "TEST_CASE",
          project: {
            id: 10000,
            self: "https://api.example.com/projects/10000",
          },
        },
        {
          id: 2,
          parentId: 1,
          name: "Smoke Tests",
          index: 1,
          folderType: "TEST_CASE",
          project: {
            id: 10000,
            self: "https://api.example.com/projects/10000",
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0, projectKey: "SA" };
    const result = await instance.handle(args, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/folders",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default param values", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      values: [
        {
          id: 1,
          parentId: null,
          name: "Regression Tests",
          index: 0,
          folderType: "TEST_CASE",
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/folders", {
      maxResults: 10,
      startAt: 0,
    });
    expect(result.structuredContent).toBe(responseMock);
  });
});
