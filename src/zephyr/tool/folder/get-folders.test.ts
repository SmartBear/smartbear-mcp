import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListFoldersQueryParams,
  ListFolders200Response as ListFoldersResponse,
} from "../../common/rest-api-schemas";
import { GetFolders } from "./get-folders";

const rootFolder = {
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

const subFolderOfFive = {
  id: 6,
  parentId: 5,
  name: "Pump Regression",
  index: 1,
  folderType: "TEST_CASE",
  project: {
    id: 1,
    self: "https://api.example.com/v2/projects/1",
  },
};

const responseFromSpecificProjectMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 2,
  isLast: true,
  values: [rootFolder, subFolderOfFive],
};

const responseFromAllProjectsMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 3,
  isLast: true,
  values: [
    rootFolder,
    subFolderOfFive,
    {
      id: 7,
      parentId: 2,
      name: "Regression Cycles",
      index: 0,
      folderType: "TEST_CYCLE",
      project: {
        id: 2,
        self: "https://api.example.com/v2/projects/2",
      },
    },
  ],
};

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
    expect(instance.specification.toolset).toBe("Folders");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(ListFoldersQueryParams);
    expect(instance.specification.outputSchema).toBe(ListFoldersResponse);
  });

  it("should call apiClient.get with all params", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const args = {
      projectKey: "PROJ",
      folderType: "TEST_CASE",
      startAt: 0,
      maxResults: 10,
    };
    const result = await instance.handle(args, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/folders",
      args,
    );
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
  });

  it("should call apiClient.get without defined project key", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromAllProjectsMock);
    const args = { startAt: 0, maxResults: 10 };
    const result = await instance.handle(args, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/folders",
      args,
    );
    expect(result.structuredContent).toBe(responseFromAllProjectsMock);
  });

  it("should call apiClient.get without startAt providing default value", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const args = { projectKey: "PROJ", maxResults: 10 };
    const result = await instance.handle(args, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/folders", {
      ...args,
      startAt: 0,
    });
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
  });

  it("should call apiClient.get with default maxResults", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const result = await instance.handle(
      { projectKey: "PROJ", startAt: 0 },
      {} as any,
    );
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/folders", {
      projectKey: "PROJ",
      startAt: 0,
      maxResults: 10,
    });
    expect(result.structuredContent).toBe(responseFromSpecificProjectMock);
  });

  it("should return folders carrying parentId so sub-folders can be identified", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const result = await instance.handle(
      { projectKey: "PROJ", folderType: "TEST_CASE" },
      {} as any,
    );
    const { values } =
      result.structuredContent as typeof responseFromSpecificProjectMock;
    expect(values.filter((folder) => folder.parentId === 5)).toEqual([
      subFolderOfFive,
    ]);
  });

  it("should return a list containing a root folder that parses against the output schema", async () => {
    mockClient
      .getApiClient()
      .get.mockResolvedValueOnce(responseFromSpecificProjectMock);
    const result = await instance.handle({ projectKey: "PROJ" }, {} as any);
    expect(() =>
      ListFoldersResponse.parse(result.structuredContent),
    ).not.toThrow();
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {} as any)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {} as any);
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error for invalid maxResults", async () => {
    await expect(
      instance.handle({ maxResults: 0 }, {} as any),
    ).rejects.toThrow();
  });
});