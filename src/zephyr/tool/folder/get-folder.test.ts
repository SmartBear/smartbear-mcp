import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetFolderParams,
  GetFolder200Response as GetFolderResponse,
} from "../../common/rest-api-schemas";
import { GetFolder } from "./get-folder";

const folderMock = {
  id: 5,
  parentId: 53,
  name: "Pump Regression",
  index: 1,
  folderType: "TEST_CASE",
  project: {
    id: 1,
    self: "https://api.example.com/v2/projects/1",
  },
};

const rootFolderMock = {
  id: 5,
  parentId: null,
  name: "Axial Pump Tests",
  index: 0,
  folderType: "TEST_CASE",
  project: {
    id: 1,
    self: "https://api.example.com/v2/projects/1",
  },
};

describe("GetFolder", () => {
  let mockClient: any;
  let instance: GetFolder;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetFolder(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Folder");
    expect(instance.specification.toolset).toBe("Folders");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetFolderParams);
    expect(instance.specification.outputSchema).toBe(GetFolderResponse);
  });

  it("should call apiClient.get with the folder id in the path", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(folderMock);
    const result = await instance.handle({ folderId: 5 }, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/folders/5");
    expect(result.structuredContent).toBe(folderMock);
  });

  it("should return a root folder with a null parentId that parses against the output schema", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(rootFolderMock);
    const result = await instance.handle({ folderId: 5 }, {} as any);
    expect(result.structuredContent).toBe(rootFolderMock);
    expect(() =>
      GetFolderResponse.parse(result.structuredContent),
    ).not.toThrow();
  });

  it("should throw validation error if folderId is missing", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });

  it("should throw validation error if folderId is not a positive integer", async () => {
    await expect(instance.handle({ folderId: 0 }, {} as any)).rejects.toThrow();
  });

  it("should throw error when extra parameters not in the schema", async () => {
    await expect(
      instance.handle({ folderId: 53, extraParam: "nope" }, {} as any),
    ).rejects.toThrow();
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ folderId: 53 }, {} as any)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ folderId: 53 }, {} as any);
    expect(result.structuredContent).toBeUndefined();
  });
});