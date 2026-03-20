import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestExecutionSteps } from "../../../../../zephyr/tool/test-execution/update-test-steps";

describe("UpdateTestExecutionSteps", () => {
  let mockClient: any;
  let instance: UpdateTestExecutionSteps;

  const EXTRA_REQUEST_HANDLER: RequestHandlerExtra<
    ServerRequest,
    ServerNotification
  > = {
    signal: AbortSignal.timeout(5000),
    requestId: "",
    sendNotification: () => {
      throw new Error("Not implemented");
    },
    sendRequest: () => {
      throw new Error("Not implemented");
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
        put: vi.fn(),
      }),
    };
    instance = new UpdateTestExecutionSteps(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Execution Steps");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();

    const validInput = {
      testExecutionIdOrKey: "SA-E1",
      steps: [{ statusName: "Pass", actualResult: "Looks good" }],
    };
    expect(
      instance.specification.inputSchema?.safeParse(validInput).success,
    ).toBe(true);

    const missingKey = { steps: [{ statusName: "Pass" }] };
    expect(
      instance.specification.inputSchema?.safeParse(missingKey).success,
    ).toBe(false);
  });

  describe("handle method", () => {
    it("should call PUT correctly with key and steps", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected 1",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
          {
            inline: {
              description: "Step 2",
              expectedResult: "Expected 2",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E1",
        steps: [
          { statusName: "Pass", actualResult: "Login page displayed" },
          { statusName: "Pass", actualResult: "User redirected to dashboard" },
        ],
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testexecutions/SA-E1/teststeps",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/SA-E1/teststeps",
        {
          steps: [
            {
              description: "Step 1",
              expectedResult: "Expected 1",
              actualResult: "Login page displayed",
              testData: null,
              testDataRowNumber: null,
              statusName: "Pass",
            },
            {
              description: "Step 2",
              expectedResult: "Expected 2",
              actualResult: "User redirected to dashboard",
              testData: null,
              testDataRowNumber: null,
              statusName: "Pass",
            },
          ],
        },
      );
    });

    it("should update only first step and keep others unchanged", async () => {
      const existingSteps = {
        values: [
          { inline: { description: "Step 1", actualResult: null } },
          { inline: { description: "Step 2", actualResult: null } },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      await instance.handle(
        {
          testExecutionIdOrKey: "SA-E1",
          steps: [{ actualResult: "Updated step 1" }],
        },
        EXTRA_REQUEST_HANDLER,
      );

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.steps).toEqual([
        {
          description: "Step 1",
          actualResult: "Updated step 1",
        },
        {
          description: "Step 2",
          actualResult: null,
        },
      ]);
    });

    it("should call PUT correctly with numeric ID", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      await instance.handle(
        { testExecutionIdOrKey: "10", steps: [{ statusName: "Fail" }] },
        EXTRA_REQUEST_HANDLER,
      );

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testexecutions/10/teststeps",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/10/teststeps",
        {
          steps: [
            {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
              statusName: "Fail",
            },
          ],
        },
      );
    });

    it("should skip undefined values in steps", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected 1",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
          {
            inline: {
              description: "Step 2",
              expectedResult: "Expected 2",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        steps: [
          { statusName: "Pass", actualResult: undefined },
          { statusName: undefined, actualResult: "Step executed" },
        ],
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.steps[0]).toEqual({
        description: "Step 1",
        expectedResult: "Expected 1",
        actualResult: null,
        testData: null,
        testDataRowNumber: null,
        statusName: "Pass",
      });
      expect(body.steps[1]).toEqual({
        description: "Step 2",
        expectedResult: "Expected 2",
        actualResult: "Step executed",
        testData: null,
        testDataRowNumber: null,
        statusName: undefined,
      });
    });

    it("should update only actualResult and keep statusName unchanged", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E3",
        steps: [{ actualResult: "API returned 500 error" }],
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const body = mockClient.getApiClient().put.mock.calls[0][1];
      expect(body.steps[0].statusName).toBeUndefined();
      expect(body.steps[0].expectedResult).toBe("Expected");
    });

    it("should mark step as failed and keep actualResult unchanged", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: "Page froze while updating notification preferences",
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E5",
        steps: [{ statusName: "Fail" }],
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const body = mockClient.getApiClient().put.mock.calls[0][1];
      expect(body.steps[0].actualResult).toBe("Page froze while updating notification preferences");
      expect(body.steps[0].statusName).toBe("Fail");
    });

    it("should return empty structuredContent and content", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const result = await instance.handle(
        { testExecutionIdOrKey: "SA-E1", steps: [{ statusName: "Pass" }] },
        EXTRA_REQUEST_HANDLER,
      );

      expect(result.structuredContent).toEqual({});
      expect(result.content).toEqual([]);
    });

    it("should reject when PUT fails", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);
      mockClient
        .getApiClient()
        .put.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        instance.handle(
          { testExecutionIdOrKey: "SA-E1", steps: [{ statusName: "Pass" }] },
          EXTRA_REQUEST_HANDLER,
        ),
      ).rejects.toThrow("Update failed");
    });

    it("should handle API errors when fetching existing test execution", async () => {
      mockClient
        .getApiClient()
        .get.mockRejectedValueOnce(new Error("Test Execution not found"));

      const args = {
        testExecutionIdOrKey: "SA-E99",
        steps: [{ statusName: "Pass", actualResult: "Step executed" }],
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Test Execution not found");
    });

    it("should throw validation error when testExecutionIdOrKey is missing", async () => {
      const existingSteps = {
        values: [
          {
            inline: {
              description: "Step 1",
              expectedResult: "Expected",
              actualResult: null,
              testData: null,
              testDataRowNumber: null,
            },
          },
        ],
      };

      mockClient.getApiClient().get.mockResolvedValueOnce(existingSteps);

      await expect(
        instance.handle(
          { steps: [{ statusName: "Pass" }] },
          EXTRA_REQUEST_HANDLER,
        ),
      ).rejects.toThrow();
    });
  });
});
