import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFolderBody,
  createFolder201Response as createFolderResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { CreateFolder } from "../../../../../zephyr/tool/folder/create-folder";

describe("CreateFolder", () => {
  let mockClient: any;
  let instance: CreateFolder;

  const EXTRA_REQUEST_HANDLER: RequestHandlerExtra<
    ServerRequest,
    ServerNotification
  > = {
    signal: AbortSignal.timeout(5000),
    requestId: "",
    sendNotification: (_notification) => {
      throw new Error("Function not implemented.");
    },
    sendRequest: (_request, _resultSchema, _options?) => {
      throw new Error("Function not implemented.");
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        post: vi.fn(),
      }),
    };
    instance = new CreateFolder(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Folder");
    expect(instance.specification.summary).toBe(
      "Create a new Folder in Zephyr specified project",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBe(createFolderBody);
    expect(instance.specification.outputSchema).toBe(createFolderResponse);
  });

  it("should call apiClient.post with correct params and return created folder information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/folders/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      parentId: 1,
      name: "Axial Pump Tests",
      projectKey: "SA",
      folderType: "TEST_CASE",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/folders/",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 54,
      self: "https://<api-base-url>/folders/54",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      parentId: 1,
      name: "Pump Test Plans",
      projectKey: "SA",
      folderType: "TEST_PLAN",
      extraParam: "This should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith("/folders/", {
      parentId: args.parentId,
      name: args.name,
      projectKey: args.projectKey,
      folderType: args.folderType,
    });

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      parentId: 1,
      name: "Regression Cycles",
      projectKey: "SA",
      folderType: "TEST_CYCLE",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if projectKey is missing", async () => {
    const args = {
      parentId: 1,
      name: "Missing Project",
      folderType: "TEST_CASE",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if name is missing", async () => {
    const args = {
      parentId: 1,
      projectKey: "SA",
      folderType: "TEST_CASE",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if folderType is missing", async () => {
    const args = {
      parentId: 1,
      projectKey: "SA",
      name: "Invalid Folder",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
