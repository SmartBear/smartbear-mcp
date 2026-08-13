import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools";
import { ENDPOINTS } from "../../config/constants";
import { GetAutomationHistory } from "../test-automation/get-automation-history";

describe("GetAutomationHistory", () => {
  let mockClient: any;
  let mockApiClient: any;
  let instance: GetAutomationHistory;

  const fakeRecord = {
    trackingId: "924b5e8c-758c-434c-8fc0-f56c8d9aba31",
    fileName: "1779199707789_924b5e8c-758c-434c-8fc0-f56c8d9aba31.json",
    format: "CUCUMBER",
    processStatus: "SUCCESS",
    importStatus: "SUCCESS",
    startTime: "19/May/2026 19:38:30",
    endTime: "19/May/2026 19:38:31",
    fileSize: 5910,
    detailedMessage: "File is imported successfully.",
    extraAttributes: { attachFile: false },
    childFileSummaryResponses: [],
    summary: [
      {
        testCycle: "mqNETxEnS6dJKN",
        testCasesCreated: 3,
        testCaseVersionsCreated: 4,
        testCaseVersionsReused: 0,
        testStepsCreated: 13,
        testCycleIssueKey: "JFT1-TR-15",
        testCycleSummary: "Automated Test Cycle",
      },
    ],
  };

  const fakeHistoryResponse = {
    startAt: 0,
    maxResults: 20,
    total: 1,
    data: [fakeRecord],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      getAutomation: vi.fn().mockResolvedValue(fakeHistoryResponse),
    };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
    };

    instance = new GetAutomationHistory(mockClient as any);
  });

  // ─── Specification ────────────────────────────────────────────────────────

  describe("specification", () => {
    it("has correct metadata", () => {
      expect(instance.specification.title).toBe("Get Automation History");
      expect(instance.specification.readOnly).toBe(true);
      expect(instance.specification.idempotent).toBe(true);
    });

    it("has use cases, examples, and hints", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  // ─── Success paths ────────────────────────────────────────────────────────

  describe("handle — success", () => {
    it("calls the history endpoint with default pagination", async () => {
      const result = await instance.handle({});

      expect(mockApiClient.getAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_HISTORY,
        { startAt: 0, maxResults: 20 },
      );
      expect(result.structuredContent).toMatchObject({
        startAt: 0,
        maxResults: 20,
        total: 1,
        data: [
          expect.objectContaining({
            trackingId: "924b5e8c-758c-434c-8fc0-f56c8d9aba31",
          }),
        ],
      });
    });

    it("passes custom startAt and maxResults as query params", async () => {
      await instance.handle({ startAt: 40, maxResults: 50 });

      expect(mockApiClient.getAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_HISTORY,
        { startAt: 40, maxResults: 50 },
      );
    });

    it("returns empty data array when no history exists", async () => {
      mockApiClient.getAutomation.mockResolvedValue({
        startAt: 0,
        maxResults: 20,
        total: 0,
        data: [],
      });

      const result = await instance.handle({});
      expect(result.structuredContent.data).toEqual([]);
    });

    it("maps all record fields correctly", async () => {
      const result = await instance.handle({});
      const record = result.structuredContent.data?.[0];

      expect(record).toMatchObject({
        format: "CUCUMBER",
        processStatus: "SUCCESS",
        importStatus: "SUCCESS",
        fileSize: 5910,
        detailedMessage: "File is imported successfully.",
        summary: [expect.objectContaining({ testCycleIssueKey: "JFT1-TR-15" })],
      });
    });

    it("returns empty content array on success", async () => {
      const result = await instance.handle({});
      expect(result.content).toEqual([]);
    });
  });

  // ─── Error paths ──────────────────────────────────────────────────────────

  describe("handle — errors", () => {
    it("throws ToolError when automation API key is not configured", async () => {
      mockApiClient.getAutomation.mockRejectedValue(
        new ToolError("QTM4J Automation API key not configured"),
      );

      await expect(instance.handle({})).rejects.toThrow(
        "Automation API key not configured",
      );
    });

    it("propagates ToolError from the API client", async () => {
      mockApiClient.getAutomation.mockRejectedValue(
        new ToolError("Request failed with status 401: Unauthorized"),
      );

      await expect(instance.handle({})).rejects.toThrow(
        "Request failed with status 401",
      );
    });
  });
});
