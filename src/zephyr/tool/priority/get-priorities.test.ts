import { beforeEach, describe, expect, it } from "vitest";
import {
  ListPrioritiesQueryParams,
  ListPriorities200Response as ListPrioritiesResponse,
} from "../../common/rest-api-schemas.ts";
import {
  asZephyrClient,
  createMockZephyrClient,
  fakeExtra,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { GetPriorities } from "./get-priorities.ts";

describe("GetProjectPriorities", () => {
  let mockClient: MockZephyrClient;
  let instance: GetPriorities;

  beforeEach(() => {
    mockClient = createMockZephyrClient();
    instance = new GetPriorities(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get priorities");
    expect(instance.specification.summary).toBe(
      "Get Zephyr Test Case priorities with optional filters",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(ListPrioritiesQueryParams);
    expect(instance.specification.outputSchema).toBe(ListPrioritiesResponse);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 3,
      isLast: true,
      values: [
        {
          id: 829_899,
          project: {
            id: 47_432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "High",
          description: null,
          index: 0,
          color: "#ff0000",
          default: false,
        },
        {
          id: 829_900,
          project: {
            id: 47_432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "Normal",
          description: null,
          index: 1,
          color: "#ffa900",
          default: true,
        },
        {
          id: 829_901,
          project: {
            id: 47_432,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47432",
          },
          name: "Low",
          description: null,
          index: 2,
          color: "#008000",
          default: false,
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0, projectKey: "PROJ" };
    const result = await instance.handle(args, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/priorities", {
      maxResults: 10,
      startAt: 0,
      projectKey: "PROJ",
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default params", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 825_179,
          project: {
            id: 47_165,
            self: "https://api.zephyrscale.smartbear.com/v2/projects/47165",
          },
          name: "Normal",
          description: null,
          index: 1,
          color: "#ffa900",
          default: true,
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith("/priorities", {
      maxResults: 10, // default value from schema
      startAt: 0, // default value from schema
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, fakeExtra)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, fakeExtra);
    expect(result.structuredContent).toBeUndefined();
  });
});
