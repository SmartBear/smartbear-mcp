import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestExecution } from "./update-test-execution.ts";

describe("UpdateTestExecution", () => {
  let mockClient: any;
  let instance: UpdateTestExecution;

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
        put: vi.fn(),
      }),
    };

    instance = new UpdateTestExecution(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Execution");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();

    const validInput = {
      testExecutionIdOrKey: "SA-E40",
      statusName: "In Progress",
    };

    const result = instance.specification.inputSchema?.safeParse(validInput);

    expect(result?.success).toBe(true);

    const invalidInput = { statusName: "In Progress" };
    const invalidResult =
      instance.specification.inputSchema?.safeParse(invalidInput);

    expect(invalidResult?.success).toBe(false);
  });

  describe("handle method", () => {
    it("should call PUT with only provided fields", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await instance.handle(args, ExtraRequestHandler);

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testexecutions/SA-E40",
        {
          statusName: "In Progress",
        },
      );
    });

    it("should skip undefined values", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
        environmentName: undefined,
      };

      await instance.handle(args, ExtraRequestHandler);

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body).toEqual({
        statusName: "In Progress",
      });
    });

    it("should allow null values (overwrite)", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        comment: null,
      };

      await instance.handle(args, ExtraRequestHandler);

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.comment).toBeNull();
    });

    it("should update actualEndDate when provided", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce({});

      const args = {
        testExecutionIdOrKey: "SA-E40",
        actualEndDate: "2018-06-01T00:00:00Z",
      };

      await instance.handle(args, ExtraRequestHandler);

      const body = mockClient.getApiClient().put.mock.calls[0][1];

      expect(body.actualEndDate).toBe("2018-06-01T00:00:00Z");
    });

    it("should reject when PUT fails", async () => {
      mockClient
        .getApiClient()
        .put.mockRejectedValueOnce(new Error("Update failed"));

      const args = {
        testExecutionIdOrKey: "SA-E40",
        statusName: "In Progress",
      };

      await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow(
        "Update failed",
      );
    });
  });
});
