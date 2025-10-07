import { beforeEach, describe, expect, it, vi } from "vitest";
import { QmetryClient } from "../../../qmetry/client";

// Mock API clients
import * as project from "../../../qmetry/client/project.js";
import * as requirement from "../../../qmetry/client/requirement.js";
import * as testcase from "../../../qmetry/client/testcase.js";

vi.mock("../../../qmetry/client/project.js");
vi.mock("../../../qmetry/client/testcase.js");
vi.mock("../../../qmetry/client/requirement.js");

describe("QmetryClient tools", () => {
  let client: QmetryClient;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new QmetryClient("fake-token", "https://qmetry.example");
    mockRegister = vi.fn();
    vi.clearAllMocks();
  });

  const getHandler = (title: string) => {
    client.registerTools(mockRegister, vi.fn());
    const call = mockRegister.mock.calls.find((c) => c[0].title === title);
    if (!call) throw new Error(`Tool not registered: ${title}`);
    return call[1]; // handler fn
  };

  describe("Fetch QMetry Project Info", () => {
    it("should fetch project info with defaults", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        id: 1,
        name: "Proj",
      });

      const handler = getHandler("Fetch QMetry Project Info");
      const result = await handler({});

      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default", // from QMETRY_DEFAULTS
        {}, // empty payload object
      );

      expect(result.content[0].text).toContain("Proj");
    });

    it("should handle API errors gracefully", async () => {
      // Mock console.error to suppress expected error logging during test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (project.getProjectInfo as any).mockRejectedValue(new Error("boom"));

      const handler = getHandler("Fetch QMetry Project Info");
      const result = await handler({});

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: boom",
          },
        ],
      });

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe("Fetch Test Cases", () => {
    it("should auto-resolve viewId and call fetchTestCases with default pagination", async () => {
      // Mock project info response for auto-resolution
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { TC: { viewId: 12345 } },
      });
      (testcase.fetchTestCases as any).mockResolvedValue({
        data: [
          { id: 1, name: "Test1" },
          { id: 2, name: "Test2" },
        ],
      });

      const handler = getHandler("Fetch Test Cases");
      const result = await handler({});

      // Auto-resolution is now working correctly - getProjectInfo should be called
      // when viewId is not provided to auto-resolve it
      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
      );

      // fetchTestCases should be called with auto-resolved viewId and folderPath
      expect(testcase.fetchTestCases).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 12345, // Auto-resolved from project info
          folderPath: "", // Auto-set to empty string for root
        }),
      );

      expect(result.content[0].text).toContain("Test1");
      expect(result.content[0].text).toContain("Test2");
    });

    it("should skip auto-resolution when viewId is provided", async () => {
      (testcase.fetchTestCases as any).mockResolvedValue({
        data: [{ id: 4, name: "Test4" }],
      });

      const handler = getHandler("Fetch Test Cases");
      const result = await handler({ viewId: 99999, folderPath: "test" });

      // Should not call getProjectInfo when viewId is provided
      expect(project.getProjectInfo).not.toHaveBeenCalled();

      // Should call fetchTestCases directly with provided viewId
      expect(testcase.fetchTestCases).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 99999,
          folderPath: "test",
        }),
      );

      expect(result.content[0].text).toContain("Test4");
    });

    it("should handle auto-resolution failure gracefully", async () => {
      // Mock console.error to suppress expected error logging during test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock getProjectInfo to fail during auto-resolution
      (project.getProjectInfo as any).mockRejectedValue(
        new Error("Project not found"),
      );

      const handler = getHandler("Fetch Test Cases");
      const result = await handler({});

      // Auto-resolution should be attempted and fail gracefully
      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
      );

      expect(result.content[0].success).toBe(false);
      expect(result.content[0].text).toContain(
        "Failed to auto-resolve viewId/folderPath",
      );
      expect(result.content[0].text).toContain("Project not found");

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe("Fetch Test Case Details", () => {
    it("should pass tcID and pagination correctly", async () => {
      (testcase.fetchTestCaseDetails as any).mockResolvedValue({ id: "TC-1" });

      const handler = getHandler("Fetch Test Case Details");
      const result = await handler({ tcID: "TC-1" });

      expect(testcase.fetchTestCaseDetails).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({ tcID: "TC-1" }),
      );

      expect(result.content[0].text).toContain("TC-1");
    });
  });

  describe("Fetch Test Case Version Details", () => {
    it("should pass id and version", async () => {
      (testcase.fetchTestCaseVersionDetails as any).mockResolvedValue({
        id: "TC-2",
        version: 3,
      });

      const handler = getHandler("Fetch Test Case Version Details");
      const result = await handler({ id: "TC-2", version: 3 });

      expect(testcase.fetchTestCaseVersionDetails).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({ id: "TC-2", version: 3 }),
      );

      expect(result.content[0].text).toContain("version");
    });
  });

  describe("Fetch Test Case Steps", () => {
    it("should fetch steps with defaults", async () => {
      (testcase.fetchTestCaseSteps as any).mockResolvedValue({
        steps: ["step1", "step2"],
      });

      const handler = getHandler("Fetch Test Case Steps");
      const result = await handler({ id: "TC-3" });

      expect(testcase.fetchTestCaseSteps).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({ id: "TC-3" }),
      );

      expect(result.content[0].text).toContain("step1");
    });
  });

  describe("Fetch Requirements", () => {
    it("should auto-resolve viewId and call fetchRequirements with default pagination", async () => {
      // Mock project info response for auto-resolution
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { RQ: { viewId: 54321 } },
      });
      (requirement.fetchRequirements as any).mockResolvedValue({
        data: [
          { id: 1, name: "Requirement1", entityKey: "MAC-RQ-1" },
          { id: 2, name: "Requirement2", entityKey: "MAC-RQ-2" },
        ],
      });

      const handler = getHandler("Fetch Requirements");
      const result = await handler({});

      // Auto-resolution should call getProjectInfo to resolve RQ viewId
      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
      );

      // fetchRequirements should be called with auto-resolved viewId and folderPath
      expect(requirement.fetchRequirements).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 54321,
          folderPath: "",
        }),
      );

      expect(result.content[0].text).toContain("Requirement1");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (project.getProjectInfo as any).mockRejectedValue(
        new Error("API failure"),
      );

      const handler = getHandler("Fetch Requirements");
      const result = await handler({});

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: Failed to auto-resolve viewId/folderPath for Requirements in project default. Please provide them manually or check project access. Error: API failure",
          },
        ],
      });

      consoleSpy.mockRestore();
    });

    it("should use manual viewId when provided", async () => {
      // Mock project info for auto-resolution of folderPath
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { RQ: { viewId: 54321 } },
      });
      (requirement.fetchRequirements as any).mockResolvedValue({
        data: [{ id: 1, name: "Requirement1" }],
      });

      const handler = getHandler("Fetch Requirements");
      const result = await handler({ viewId: 99999, projectKey: "TEST" });

      // Even when viewId is provided, auto-resolution still calls getProjectInfo to resolve folderPath
      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "TEST",
      );

      expect(requirement.fetchRequirements).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "TEST",
        expect.objectContaining({
          viewId: 99999,
        }),
      );

      expect(result.content[0].text).toContain("Requirement1");
    });
  });

  describe("Fetch Requirement Details", () => {
    it("should fetch requirement details with required parameters", async () => {
      (requirement.fetchRequirementDetails as any).mockResolvedValue({
        id: 12345,
        entityKey: "MAC-RQ-748",
        name: "Test Requirement",
        summary: "This is a test requirement",
        version: 1,
      });

      const handler = getHandler("Fetch Requirement Details");
      const result = await handler({ id: 12345, version: 1 });

      expect(requirement.fetchRequirementDetails).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          id: 12345,
          version: 1,
        }),
      );

      expect(result.content[0].text).toContain("MAC-RQ-748");
      expect(result.content[0].text).toContain("Test Requirement");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (requirement.fetchRequirementDetails as any).mockRejectedValue(
        new Error("Requirement not found"),
      );

      const handler = getHandler("Fetch Requirement Details");
      const result = await handler({ id: 99999, version: 1 });

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: Requirement not found",
          },
        ],
      });

      consoleSpy.mockRestore();
    });

    it("should use custom project key when provided", async () => {
      (requirement.fetchRequirementDetails as any).mockResolvedValue({
        id: 67890,
        entityKey: "PROJ-RQ-123",
      });

      const handler = getHandler("Fetch Requirement Details");
      const result = await handler({
        id: 67890,
        version: 2,
        projectKey: "PROJ",
      });

      expect(requirement.fetchRequirementDetails).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "PROJ",
        expect.objectContaining({
          id: 67890,
          version: 2,
        }),
      );

      expect(result.content[0].text).toContain("PROJ-RQ-123");
    });
  });

  describe("Fetch Test Cases Linked to Requirement", () => {
    it("should fetch linked test cases with required rqID", async () => {
      (testcase.fetchTestCasesLinkedToRequirement as any).mockResolvedValue({
        data: [
          {
            entityKey: "MAC-TC-1692",
            summary: "Table Testing functionality",
            testingTypeAlias: "Automated",
            latestExecutionStatus: "Passed",
          },
          {
            entityKey: "MAC-TC-1693",
            summary: "Login validation",
            testingTypeAlias: "Manual",
            latestExecutionStatus: "Not Run",
          },
        ],
        total: 2,
      });

      const handler = getHandler("Fetch Test Cases Linked to Requirement");
      const result = await handler({ rqID: 2499315 });

      expect(testcase.fetchTestCasesLinkedToRequirement).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          rqID: 2499315,
        }),
      );

      expect(result.content[0].text).toContain("MAC-TC-1692");
      expect(result.content[0].text).toContain("Table Testing functionality");
      expect(result.content[0].text).toContain("MAC-TC-1693");
    });

    it("should handle getLinked parameter for gap analysis", async () => {
      (testcase.fetchTestCasesLinkedToRequirement as any).mockResolvedValue({
        data: [
          {
            entityKey: "MAC-TC-9999",
            summary: "Unlinked test case",
            testingTypeAlias: "Manual",
          },
        ],
        total: 1,
      });

      const handler = getHandler("Fetch Test Cases Linked to Requirement");
      const result = await handler({
        rqID: 2499315,
        getLinked: false, // Get NOT linked test cases
      });

      expect(testcase.fetchTestCasesLinkedToRequirement).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          rqID: 2499315,
          getLinked: false,
        }),
      );

      expect(result.content[0].text).toContain("MAC-TC-9999");
      expect(result.content[0].text).toContain("Unlinked test case");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (testcase.fetchTestCasesLinkedToRequirement as any).mockRejectedValue(
        new Error("Requirement ID not found"),
      );

      const handler = getHandler("Fetch Test Cases Linked to Requirement");
      const result = await handler({ rqID: 99999 });

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: Requirement ID not found",
          },
        ],
      });

      consoleSpy.mockRestore();
    });
  });
});
