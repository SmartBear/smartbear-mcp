import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CreateFolderBody,
  CreateFolder201Response as createFolderResponse,
} from "../../common/rest-api-schemas.ts";
import {
  asZephyrClient,
  createMockZephyrClient,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { CreateFolder } from "./create-folder.ts";

describe("CreateFolder", () => {
  let mockClient: MockZephyrClient;
  let instance: CreateFolder;

  const ExtraRequestHandler: RequestHandlerExtra<
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
    mockClient = createMockZephyrClient();
    instance = new CreateFolder(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Folder");
    expect(instance.specification.summary).toBe(
      "Create a folder called 'Axial Pump Tests' in the project SA for organizing test cases",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBe(CreateFolderBody);
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

    const result = await instance.handle(args, ExtraRequestHandler);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/folders",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should throw error when extra parameters not in the schema", async () => {
    const args = {
      parentId: 1,
      name: "Pump Test Plans",
      projectKey: "SA",
      folderType: "TEST_PLAN",
      extraParam: "This should be rejected",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
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

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if projectKey is missing", async () => {
    const args = {
      parentId: 1,
      name: "Missing Project",
      folderType: "TEST_CASE",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should throw validation error if name is missing", async () => {
    const args = {
      parentId: 1,
      projectKey: "SA",
      folderType: "TEST_CASE",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should throw validation error if folderType is missing", async () => {
    const args = {
      parentId: 1,
      projectKey: "SA",
      name: "Invalid Folder",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });
});
