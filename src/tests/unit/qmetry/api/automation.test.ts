import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAutomationStatus,
  importAutomationResults,
} from "../../../../qmetry/client/automation.js";
import type { ImportAutomationResultsPayload } from "../../../../qmetry/types/automation.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("automation API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  describe("importAutomationResults", () => {
    it("should POST automation results with FormData and correct headers", async () => {
      const payload: ImportAutomationResultsPayload = {
        file: btoa("test file content"), // base64 encoded
        fileName: "test-results.xml",
        entityType: "TESTNG",
        automationHierarchy: "1",
      };

      const mockResponse = {
        requestId: 12345,
        success: true,
        code: "CO.IMPORT_SCHEDULED",
        message: "Import has begun. Go to Scheduled Task to view progress.",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await importAutomationResults(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (globalThis.fetch as any).mock.calls[0];

      expect(url).toBe(`${baseUrl}/rest/import/createandscheduletestresults/1`);
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        apikey: token,
        project: projectKey,
      });
      expect(options.body).toBeInstanceOf(FormData);

      expect(result).toEqual(mockResponse);
    });

    it("should handle CUCUMBER entity type correctly", async () => {
      const payload: ImportAutomationResultsPayload = {
        file: btoa(JSON.stringify({ test: "data" })),
        fileName: "cucumber-results.json",
        entityType: "CUCUMBER",
        testsuiteName: "Cucumber Test Suite",
        platformID: "Chrome",
      };

      const mockResponse = {
        requestId: 67890,
        success: true,
        code: "CO.IMPORT_SCHEDULED",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await importAutomationResults(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.body).toBeInstanceOf(FormData);
    });
  });

  describe("getAutomationStatus", () => {
    it("should GET automation status with correct URL and headers", async () => {
      const requestID = 12345;
      const mockResponse = {
        requestId: "12345",
        automationFramework: "TestNG",
        status: "Completed",
        testSuiteData: [
          {
            testSuiteId: 1001,
            testSuiteEntityKey: "PROJ-TS-1",
            testSuiteURL: "https://qmetry.example/#/test-suite/1001",
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await getAutomationStatus(
        token,
        baseUrl,
        projectKey,
        requestID,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/admin/status/automation/12345`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
          }),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it("should handle requestID as object with requestID property", async () => {
      const requestIDObj = { requestID: 67890 };
      const mockResponse = {
        requestId: "67890",
        automationFramework: "Cucumber",
        status: "Failed",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await getAutomationStatus(
        token,
        baseUrl,
        projectKey,
        requestIDObj as any,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/admin/status/automation/67890`,
        expect.any(Object),
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
