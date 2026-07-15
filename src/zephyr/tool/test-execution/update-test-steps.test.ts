import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestExecutionSteps } from "./update-test-steps.ts";

describe("UpdateTestExecutionSteps", () => {
  let mockClient: any;
  let instance: UpdateTestExecutionSteps;

  const ExtraRequestHandler: RequestHandlerExtra<
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
    it("should call GET and PUT correctly with key and steps", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected 1",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
        {
          inline: {
            description: "Step 2",
            testData: null,
            expectedResult: "Expected 2",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E1",
        steps: [
          { statusName: "Pass", actualResult: "Login page displayed" },
          { statusName: "Pass", actualResult: "User redirected to dashboard" },
        ],
      };

      await instance.handle(args, ExtraRequestHandler);

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testexecutions/SA-E1/teststeps",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/SA-E1/teststeps",
        {
          steps: [
            {
              actualResult: "Login page displayed",
              statusName: "Pass",
            },
            {
              actualResult: "User redirected to dashboard",
              statusName: "Pass",
            },
          ],
        },
      );
    });

    it("should update only first step and keep others unchanged", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected 1",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 2 },
          },
        },
        {
          inline: {
            description: "Step 2",
            testData: null,
            expectedResult: "Expected 2",
            actualResult: "Existing result 2",
            testDataRowNumber: null,
            status: { id: 2 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      await instance.handle(
        {
          testExecutionIdOrKey: "SA-E1",
          steps: [
            { actualResult: "API returned 500 error", statusName: "Fail" },
          ],
        },
        ExtraRequestHandler,
      );

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.steps[0]).toEqual({
        actualResult: "API returned 500 error",
        statusName: "Fail",
      });

      expect(body.steps[1]).toEqual({
        actualResult: "Existing result 2",
      });
    });

    it("should call PUT correctly with numeric ID", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      await instance.handle(
        { testExecutionIdOrKey: "10", steps: [{ statusName: "Fail" }] },
        ExtraRequestHandler,
      );

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testexecutions/10/teststeps",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/10/teststeps",
        {
          steps: [
            {
              actualResult: null,
              statusName: "Fail",
            },
          ],
        },
      );
    });

    it("should skip undefined values in steps", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: "test data 1",
            expectedResult: "Expected 1",
            actualResult: "Existing result 1",
            testDataRowNumber: 1,
            status: { id: 3 },
          },
        },
        {
          inline: {
            description: "Step 2",
            testData: "test data 2",
            expectedResult: "Expected 2",
            actualResult: "Existing result 2",
            testDataRowNumber: 2,
            status: { id: 3 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        steps: [
          { statusName: "Pass", actualResult: undefined },
          { statusName: undefined, actualResult: "Step executed" },
        ],
      };

      await instance.handle(args, ExtraRequestHandler);

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.steps[0]).toEqual({
        actualResult: "Existing result 1",
        statusName: "Pass",
      });
      expect(body.steps[1]).toEqual({
        actualResult: "Step executed",
      });
    });

    it("should correctly updates actualResult for step 1 and statusName for step 2", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 2 },
          },
        },
        {
          inline: {
            description: "Step 2",
            testData: null,
            expectedResult: "Expected 2",
            actualResult: "Existing actual result 2",
            testDataRowNumber: null,
            status: { id: 2 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const stepUpdates = [
        { actualResult: "API returned 500 error" },
        { statusName: "Fail" },
      ];

      await instance.handle(
        {
          testExecutionIdOrKey: "SA-E3",
          steps: stepUpdates,
        },
        ExtraRequestHandler,
      );

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.steps[0]).toEqual({
        actualResult: "API returned 500 error",
      });

      expect(body.steps[1]).toEqual({
        actualResult: "Existing actual result 2",
        statusName: "Fail",
      });
    });

    it("should mark step as failed and keep actualResult unchanged", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: "Page froze while updating notification preferences",
            testDataRowNumber: null,
            status: { id: 2 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E5",
        steps: [{ statusName: "Fail" }],
      };

      await instance.handle(args, ExtraRequestHandler);

      const body = mockClient.getApiClient().put.mock.calls[0][1];
      expect(body.steps[0]).toEqual({
        actualResult: "Page froze while updating notification preferences",
        statusName: "Fail",
      });
    });

    it("should return empty structuredContent and content", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const result = await instance.handle(
        { testExecutionIdOrKey: "SA-E1", steps: [{ statusName: "Pass" }] },
        ExtraRequestHandler,
      );

      expect(result.structuredContent).toEqual({});
      expect(result.content).toEqual([]);
    });

    it("should reject when PUT fails", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });
      mockClient
        .getApiClient()
        .put.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        instance.handle(
          { testExecutionIdOrKey: "SA-E1", steps: [{ statusName: "Pass" }] },
          ExtraRequestHandler,
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

      await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow(
        "Test Execution not found",
      );
    });

    it("should throw validation error when testExecutionIdOrKey is missing", async () => {
      const existingSteps = [
        {
          inline: {
            description: "Step 1",
            testData: null,
            expectedResult: "Expected",
            actualResult: null,
            testDataRowNumber: null,
            status: { id: 1 },
          },
        },
      ];

      mockClient
        .getApiClient()
        .get.mockResolvedValueOnce({ values: existingSteps });

      await expect(
        instance.handle(
          { steps: [{ statusName: "Pass" }] },
          ExtraRequestHandler,
        ),
      ).rejects.toThrow();
    });
  });
});
