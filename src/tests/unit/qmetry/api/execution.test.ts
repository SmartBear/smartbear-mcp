import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateExecutionStatus } from "../../../../qmetry/client/testsuite.js";
import type { BulkUpdateExecutionStatusPayload } from "../../../../qmetry/types/testsuite.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("testsuite bulk update execution status API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  describe("bulkUpdateExecutionStatus", () => {
    it("should PUT bulk execution status update with correct payload", async () => {
      const payload: BulkUpdateExecutionStatusPayload = {
        entityIDs: "66095069,66095075",
        entityType: "TCR",
        qmTsRunId: "2720260",
        runStatusID: 123268,
        isBulkOperation: true,
        comments: "All test cases passed successfully",
      };

      const mockResponse = {
        success: true,
        message: "Execution status updated successfully",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/execution/runstatus/bulkupdate`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("66095069,66095075"),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it("should handle single test case run update with TCR entity type", async () => {
      const payload: BulkUpdateExecutionStatusPayload = {
        entityIDs: "66095087",
        entityType: "TCR",
        qmTsRunId: "2720260",
        runStatusID: 123266,
        isBulkOperation: false,
        dropID: 947,
      };

      const mockResponse = {
        success: true,
        message: "Test case run status updated",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      const bodyData = JSON.parse(options.body);

      expect(bodyData.entityIDs).toBe("66095087");
      expect(bodyData.entityType).toBe("TCR");
      expect(bodyData.qmTsRunId).toBe("2720260");
      expect(bodyData.runStatusID).toBe(123266);
      expect(bodyData.isBulkOperation).toBe(false);
    });
  });
});
