import { beforeEach, describe, expect, it } from "vitest";
import {
  GetIssueLinkTestCasesParams as GetIssueLinkTestCasesPathParam,
  GetIssueLinkTestCases200Response as GetIssueLinkTestCasesResponse,
} from "../../common/rest-api-schemas.ts";
import {
  asZephyrClient,
  createMockZephyrClient,
  fakeExtra,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { GetTestCases } from "./get-test-cases.ts";

// biome-ignore lint/security/noSecrets: test describe name, not a secret
describe("GetIssueLinkTestCases", () => {
  let mockClient: MockZephyrClient;
  let instance: GetTestCases;

  beforeEach(() => {
    mockClient = createMockZephyrClient();
    instance = new GetTestCases(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Issue Link Test Cases");
    expect(instance.specification.summary).toBe(
      "Get test cases linked to a Jira issue in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      GetIssueLinkTestCasesPathParam,
    );
    expect(instance.specification.outputSchema).toBe(
      GetIssueLinkTestCasesResponse,
    );
  });

  it("should call apiClient.get with correct path and return formatted content", async () => {
    const responseMock = [
      {
        key: "PROJ-T1",
        version: 1,
        self: "http://api.zephyrscale-dev.smartbear.com/v2/testcases/PROJ-T1/versions/1",
      },
      {
        key: "PROJ-T2",
        version: 1,
        self: "http://api.zephyrscale-dev.smartbear.com/v2/testcases/PROJ-T2/versions/1",
      },
    ];

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = { issueKey: "PROJ-123" };
    const result = await instance.handle(args, fakeExtra);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/testcases",
    );
    expect(result.structuredContent).toEqual({ testCases: responseMock });
    expect(result.content).toEqual([]);
  });

  it("should handle empty list response", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce([]);

    const result = await instance.handle({ issueKey: "PROJ-123" }, fakeExtra);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/testcases",
    );
    expect(result.structuredContent).toEqual({ testCases: [] });
    expect(result.content).toEqual([]);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    await expect(
      instance.handle({ issueKey: "PROJ-123" }, fakeExtra),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const result = await instance.handle({ issueKey: "PROJ-123" }, fakeExtra);
    expect(result.structuredContent).toEqual({ testCases: undefined });
  });

  it("should throw validation error if issueKey is missing", async () => {
    await expect(instance.handle({}, fakeExtra)).rejects.toThrow();
  });

  it("should throw validation error if issueKey format is invalid", async () => {
    await expect(
      instance.handle({ issueKey: "PROJT!" }, fakeExtra),
    ).rejects.toThrow();
  });

  it("should handle apiClient.get returning non-array data", async () => {
    const responseMock = { key: "PROJ-T1", version: 1 };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle({ issueKey: "PROJ-123" }, fakeExtra);
    expect(result.structuredContent).toEqual({ testCases: responseMock });
  });
});
