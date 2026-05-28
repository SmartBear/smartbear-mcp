import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../../common/tools";
import {
  AUTOMATION_LIMITS,
  ENDPOINTS,
} from "../../../../../qtm4j/config/constants";
import { UploadAutomationResult } from "../../../../../qtm4j/tool/test-automation/upload-automation-result";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

const mockReadFile = vi.mocked(readFile);

describe("UploadAutomationResult", () => {
  let mockClient: any;
  let mockApiClient: any;
  let instance: UploadAutomationResult;

  const fakeBuffer = Buffer.from("<testsuites></testsuites>");
  const fakeInitResponse = {
    url: "https://s3.example.com/upload?X-Amz-Signature=abc",
    message:
      "Generated Upload URL is valid for one time use and will expire in 5 minutes.",
    trackingId: "f52a7866-a345-4cad-b93e-a930135868d7",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      postAutomation: vi.fn().mockResolvedValue(fakeInitResponse),
      uploadFileMultipart: vi.fn().mockResolvedValue(undefined),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
    };

    mockReadFile.mockResolvedValue(fakeBuffer as any);

    instance = new UploadAutomationResult(mockClient as any);
  });

  // ─── Specification ────────────────────────────────────────────────────────

  describe("specification", () => {
    it("has correct metadata", () => {
      expect(instance.specification.title).toBe("Upload Automation Result");
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(false);
    });

    it("has use cases, examples, and hints", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  // ─── Success paths ────────────────────────────────────────────────────────

  describe("handle — success", () => {
    it("uploads a JUnit XML file and returns trackingId", async () => {
      const result = await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
      });

      expect(mockReadFile).toHaveBeenCalledWith("./results/junit.xml");
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ format: "junit", isZip: false }),
      );
      expect(mockApiClient.uploadFileMultipart).toHaveBeenCalledWith(
        fakeInitResponse.url,
        fakeBuffer,
      );
      expect(result.structuredContent).toMatchObject({
        trackingId: fakeInitResponse.trackingId,
        format: "junit",
        filePath: "./results/junit.xml",
      });
    });

    it("uploads a Cucumber JSON file", async () => {
      await instance.handle({
        filePath: "./reports/cucumber.json",
        format: "cucumber",
        testCycleToReuse: "TR-PRJ-5",
        environment: "Chrome",
        build: "2.0.0",
      });

      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          format: "cucumber",
          testCycleToReuse: "TR-PRJ-5",
          environment: "Chrome",
          build: "2.0.0",
        }),
      );
      expect(mockApiClient.uploadFileMultipart).toHaveBeenCalledWith(
        fakeInitResponse.url,
        fakeBuffer,
      );
    });

    it("uploads a QAF ZIP file", async () => {
      await instance.handle({
        filePath: "./results/qaf.zip",
        format: "qaf",
        isZip: true,
      });

      expect(mockApiClient.uploadFileMultipart).toHaveBeenCalledWith(
        fakeInitResponse.url,
        fakeBuffer,
      );
    });

    it("passes fields as plain strings in POST body without resolution", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCycle: {
            summary: "Regression Q1",
            labels: ["regression"],
            priority: "High",
          },
          testCase: { priority: "Blocker", status: "Done", labels: ["label1"] },
        },
      });

      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCycle: {
              summary: "Regression Q1",
              labels: ["regression"],
              priority: "High",
            },
            testCase: {
              priority: "Blocker",
              status: "Done",
              labels: ["label1"],
            },
          },
        }),
      );
    });

    it("returns empty content array on success", async () => {
      const result = await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
      });
      expect(result.content).toEqual([]);
    });
  });

  // ─── fields passthrough ───────────────────────────────────────────────────

  describe("handle — fields passthrough", () => {
    it("passes folderId in fields.testCycle to POST body", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: { testCycle: { folderId: 123 } },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ fields: { testCycle: { folderId: 123 } } }),
      );
    });

    it("passes folderId in fields.testCase to POST body", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: { testCase: { folderId: 456 } },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ fields: { testCase: { folderId: 456 } } }),
      );
    });

    it("passes assignee and reporter account IDs in fields.testCycle", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCycle: { assignee: "712020:abc123", reporter: "712020:xyz789" },
        },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCycle: { assignee: "712020:abc123", reporter: "712020:xyz789" },
          },
        }),
      );
    });

    it("passes assignee and reporter account IDs in fields.testCase", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCase: { assignee: "712020:abc123", reporter: "712020:xyz789" },
        },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCase: { assignee: "712020:abc123", reporter: "712020:xyz789" },
          },
        }),
      );
    });

    it("passes plannedStartDate and plannedEndDate in fields.testCycle", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCycle: {
            plannedStartDate: "14/May/2026 10:30",
            plannedEndDate: "20/May/2026 18:00",
          },
        },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCycle: {
              plannedStartDate: "14/May/2026 10:30",
              plannedEndDate: "20/May/2026 18:00",
            },
          },
        }),
      );
    });

    it("passes precondition and estimatedTime in fields.testCase", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCase: {
            precondition: "App is running",
            estimatedTime: "00:05:00",
          },
        },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCase: {
              precondition: "App is running",
              estimatedTime: "00:05:00",
            },
          },
        }),
      );
    });

    it("passes testCaseExecution fields to POST body", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        fields: {
          testCaseExecution: { comment: "Auto run", actualTime: "00:02:30" },
        },
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({
          fields: {
            testCaseExecution: { comment: "Auto run", actualTime: "00:02:30" },
          },
        }),
      );
    });

    it("passes matchTestSteps: false to POST body", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        matchTestSteps: false,
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ matchTestSteps: false }),
      );
    });

    it("passes attachFile: true to POST body", async () => {
      await instance.handle({
        filePath: "./results/junit.xml",
        format: "junit",
        attachFile: true,
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ attachFile: true }),
      );
    });

    it("passes appendTestName: true to POST body for TestNG", async () => {
      await instance.handle({
        filePath: "./results/testng.xml",
        format: "testng",
        appendTestName: true,
      });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ format: "testng", appendTestName: true }),
      );
    });
  });

  // ─── All supported formats ────────────────────────────────────────────────

  describe("handle — all supported formats", () => {
    it.each([
      "testng",
      "hpuft",
      "specflow",
    ] as const)("accepts %s format and passes it through", async (format) => {
      await instance.handle({ filePath: "./results/result.xml", format });
      expect(mockApiClient.postAutomation).toHaveBeenCalledWith(
        ENDPOINTS.AUTOMATION_IMPORT,
        expect.objectContaining({ format }),
      );
    });
  });

  // ─── Validation errors ────────────────────────────────────────────────────

  describe("handle — validation errors", () => {
    it("rejects an unsupported file extension", async () => {
      await expect(
        instance.handle({ filePath: "./results/output.csv", format: "junit" }),
      ).rejects.toThrow(ToolError);

      await expect(
        instance.handle({ filePath: "./results/output.csv", format: "junit" }),
      ).rejects.toThrow("Unsupported file extension '.csv'");
    });

    it("rejects QAF format without isZip: true", async () => {
      await expect(
        instance.handle({
          filePath: "./results/qaf.zip",
          format: "qaf",
          isZip: false,
        }),
      ).rejects.toThrow(ToolError);

      await expect(
        instance.handle({
          filePath: "./results/qaf.zip",
          format: "qaf",
          isZip: false,
        }),
      ).rejects.toThrow("QAF format requires a ZIP file");
    });

    it("throws ToolError when automation API key is not configured", async () => {
      mockApiClient.postAutomation.mockRejectedValue(
        new ToolError("QTM4J Automation API key not configured"),
      );

      await expect(
        instance.handle({ filePath: "./results/junit.xml", format: "junit" }),
      ).rejects.toThrow("Automation API key not configured");
    });

    it("throws ToolError when file cannot be read", async () => {
      mockReadFile.mockRejectedValue(
        new Error("ENOENT: no such file or directory"),
      );

      await expect(
        instance.handle({ filePath: "./missing/file.xml", format: "junit" }),
      ).rejects.toThrow("Could not read file");
    });

    it("throws ToolError when file exceeds the maximum size limit", async () => {
      const oversizedBuffer = Buffer.alloc(
        AUTOMATION_LIMITS.MAX_FILE_SIZE_BYTES + 1,
      );
      mockReadFile.mockResolvedValue(oversizedBuffer as any);

      await expect(
        instance.handle({ filePath: "./results/large.xml", format: "junit" }),
      ).rejects.toThrow(ToolError);

      await expect(
        instance.handle({ filePath: "./results/large.xml", format: "junit" }),
      ).rejects.toThrow("Maximum allowed size is 10 MB");
    });

    it("accepts a file exactly at the maximum size limit", async () => {
      const exactBuffer = Buffer.alloc(AUTOMATION_LIMITS.MAX_FILE_SIZE_BYTES);
      mockReadFile.mockResolvedValue(exactBuffer as any);

      await expect(
        instance.handle({ filePath: "./results/exact.xml", format: "junit" }),
      ).resolves.not.toThrow();
    });

    it("throws ToolError when API does not return a valid upload URL", async () => {
      mockApiClient.postAutomation.mockResolvedValue({
        message: "error",
        trackingId: null,
      });

      await expect(
        instance.handle({ filePath: "./results/junit.xml", format: "junit" }),
      ).rejects.toThrow("did not return a valid upload URL");
    });

    it("propagates ToolError thrown by uploadFileMultipart", async () => {
      mockApiClient.uploadFileMultipart.mockRejectedValue(
        new ToolError("Request failed with status 403: Request has expired"),
      );

      await expect(
        instance.handle({ filePath: "./results/junit.xml", format: "junit" }),
      ).rejects.toThrow("Request failed with status 403");
    });
  });

  // ─── Doc consistency ──────────────────────────────────────────────────────

  describe("doc consistency", () => {
    it("qtm4j-integration.md mentions the correct max file size in MB", () => {
      const maxMB = Math.round(
        AUTOMATION_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024),
      );
      const docPath = resolve(
        __dirname,
        "../../../../../../docs/products/SmartBear MCP Server/qtm4j-integration.md",
      );
      const content = readFileSync(docPath, "utf-8");
      expect(content).toContain(`${maxMB} MB`);
    });
  });
});
