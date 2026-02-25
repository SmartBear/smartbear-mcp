import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestExecution } from "../../../../../zephyr/tool/test-execution/update-test-execution";

describe("UpdateTestExecution", () => {
  let mockClient: any;
  let instance: UpdateTestExecution;

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
        get: vi.fn(),
        put: vi.fn(),
      }),
    };
    instance = new UpdateTestExecution(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Execution");
    expect(instance.specification.summary).toContain(
      "Update an existing Test Execution in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();

    const partialInput = {
      testExecutionIdOrKey: "SA-E40",
      statusName: "In Progress",
    };
    const partialResult =
      instance.specification.inputSchema?.safeParse(partialInput);
    expect(partialResult?.success).toBe(true);

    const missingKeyInput = { statusName: "Updated Name" };
    const missingKeyResult =
      instance.specification.inputSchema?.safeParse(missingKeyInput);
    expect(missingKeyResult?.success).toBe(false);
  });

  describe("handle method", () => {
    const existingTestExecution = {
      id: 1,
      key: "SA-E40",
      environmentName: "Original environment name",
      project: {
        id: 10005,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/10005",
      },
      testCase: {
        id: 10000,
        self: "https://jira.example/rest/api/2/testcases/10000",
      },
      environment: {
        id: 10000,
        self: "https://jira.example/rest/api/2/environments/10000",
      },
      jiraProjectVersion: {
        id: 10000,
        self: "https://jira.example/rest/api/2/versions/10000",
      },
      testExecutionStatus: {
        id: 10000,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/testexecutionstatuses/10000",
      },
      folder: {
        id: 100006,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/folders/10006",
      },
      actualEndDate: "2018-05-19T13:15:13Z",
      estimatedTime: 138000,
      executionTime: 120000,
      executedById: "10000",
      assignedToId: "10000",
      comment: "Test execution comment",
      automated: true,
      testCycle: {
        id: 10010,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/testcycles/10010",
      },
      customFields: {
        Environment: "Dev",
        Browser: "Chrome",
        Implemented: false,
      },
      links: {
        self: "http://example.com",
        issues: [],
        webLinks: [],
        testPlans: [],
      },
    };

    beforeEach(() => {
      mockClient.getApiClient().get.mockResolvedValue(existingTestExecution);
    });

    it("should fetch existing test execution and merge updates", async () => {
      const responseMock = {
        ...existingTestExecution,
        statusName: "In Progress",
      };
      mockClient.getApiClient().put.mockResolvedValueOnce(responseMock);

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testexecutions/SA-E40",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/SA-E40",
        expect.objectContaining({
          statusName: "In Progress",
          environmentName: "Original environment name",
          actualEndDate: "2018-05-19T13:15:13Z",
          executionTime: 120000,
          executedById: "10000",
          assignedToId: "10000",
          comment: "Test execution comment",
        }),
      );
    });

    it("should preserve existing properties not included in updates", async () => {
      mockClient
        .getApiClient()
        .put.mockResolvedValueOnce(existingTestExecution);

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];

      expect(mergedBody.statusName).toBe("In Progress");
      expect(mergedBody.environmentName).toBe("Original environment name");
      expect(mergedBody.actualEndDate).toBe("2018-05-19T13:15:13Z");
      expect(mergedBody.executionTime).toBe(120000);
      expect(mergedBody.executedById).toBe("10000");
      expect(mergedBody.assignedToId).toBe("10000");
      expect(mergedBody.comment).toBe("Test execution comment");
    });

    it("should preserve existing properties not included in updates", async () => {
      mockClient
        .getApiClient()
        .put.mockResolvedValueOnce(existingTestExecution);

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];

      expect(mergedBody.statusName).toBe("In Progress");
      expect(mergedBody.environmentName).toBe("Original environment name");
      expect(mergedBody.actualEndDate).toBe("2018-05-19T13:15:13Z");
      expect(mergedBody.executionTime).toBe(120000);
      expect(mergedBody.executedById).toBe("10000");
      expect(mergedBody.assignedToId).toBe("10000");
      expect(mergedBody.comment).toBe("Test execution comment");
    });

    it("should handle API errors when fetching not existing test execution", async () => {
      mockClient
        .getApiClient()
        .get.mockRejectedValueOnce(new Error("Test execution not found"));

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Test execution not found");
    });

    it("should handle API errors when updating test execution", async () => {
      mockClient
        .getApiClient()
        .put.mockRejectedValueOnce(new Error("Update failed"));

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Update failed");
    });
  });

  it("should skip undefined values in updates", async () => {
    const args = {
      testExecutionIdOrKey: "SA-E40",
      statusName: "In Progress",
      description: undefined,
    };

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

    const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
    expect(mergedBody.statusName).toBe("In Progress");
  });

  it("should handle null values by overwriting (regular fields)", async () => {
    const args = {
      testExecutionIdOrKey: "SA-E40",
      comment: null,
    };

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

    const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
    expect(mergedBody.comment).toBeNull();
  });

  it("should update actualEndDate when values are provided", async () => {
    const args = {
      testExecutionIdOrKey: "SA-E40",
      actualEndDate: "2018-06-01T00:00:00Z",
    };

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

    const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
    expect(mergedBody.actualEndDate).toBe("2018-06-01T00:00:00Z");
  });
});
