import { beforeEach, describe, expect, it, vi } from "vitest";
import { QmetryClient } from "../../../qmetry/client";
import * as issues from "../../../qmetry/client/issues.js";
// Mock API clients
import * as project from "../../../qmetry/client/project.js";
import * as requirement from "../../../qmetry/client/requirement.js";
import * as testcase from "../../../qmetry/client/testcase.js";
import * as testsuite from "../../../qmetry/client/testsuite.js";

vi.mock("../../../qmetry/client/project.js");
vi.mock("../../../qmetry/client/testcase.js");
vi.mock("../../../qmetry/client/requirement.js");
vi.mock("../../../qmetry/client/issues.js");
vi.mock("../../../qmetry/client/testsuite.js");

// Helper to create and configure a client
async function createConfiguredClient(
  apiKey = "fake-token",
  baseUrl = "https://qmetry.example",
): Promise<QmetryClient> {
  const client = new QmetryClient();
  await client.configure({} as any, {
    api_key: apiKey,
    base_url: baseUrl,
  });
  return client;
}

describe("QmetryClient tools", () => {
  let client: QmetryClient;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    client = await createConfiguredClient();
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
            text: "Error: Failed to auto-resolve viewId/folderPath/folderID for Requirements in project default. Please provide them manually or check project access. Error: API failure",
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

  describe("Fetch Test Case Executions", () => {
    it("should fetch test case executions with required tcid parameter", async () => {
      const mockExecutions = {
        data: [
          {
            id: 1,
            executionStatus: "PASS",
            testSuiteName: "Regression Suite",
            platformID: 12345,
            executedBy: "john.doe",
            executedDate: "2024-10-15T10:30:00Z",
            executedVersion: 1,
          },
          {
            id: 2,
            executionStatus: "FAIL",
            testSuiteName: "Smoke Suite",
            platformID: 67890,
            executedBy: "jane.smith",
            executedDate: "2024-10-14T14:20:00Z",
            executedVersion: 2,
          },
        ],
        totalCount: 2,
      };

      (testcase.fetchTestCaseExecutions as any).mockResolvedValue(
        mockExecutions,
      );

      const handler = getHandler("Fetch Test Case Executions");
      const result = await handler({ tcid: 1223922 });

      expect(testcase.fetchTestCaseExecutions).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcid: 1223922,
        }),
      );

      expect(result.content[0].text).toContain("PASS");
      expect(result.content[0].text).toContain("FAIL");
      expect(result.content[0].text).toContain("Regression Suite");
      expect(result.content[0].text).toContain("john.doe");
    });

    it("should fetch test case executions with filtering and optional parameters", async () => {
      const mockFilteredExecutions = {
        data: [
          {
            id: 3,
            executionStatus: "PASS",
            testSuiteName: "API Test Suite",
            platformID: 11111,
            executedBy: "automation.user",
            executedDate: "2024-10-15T16:45:00Z",
            executedVersion: 3,
          },
        ],
        totalCount: 1,
      };

      (testcase.fetchTestCaseExecutions as any).mockResolvedValue(
        mockFilteredExecutions,
      );

      const handler = getHandler("Fetch Test Case Executions");
      const result = await handler({
        tcid: 1223922,
        tcversion: 3,
        filter:
          '[{"value":["PASS"],"type":"list","field":"executionStatus"},{"value":"API Test Suite","type":"string","field":"testSuiteName"}]',
        limit: 5,
        page: 2,
      });

      expect(testcase.fetchTestCaseExecutions).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcid: 1223922,
          tcversion: 3,
          filter:
            '[{"value":["PASS"],"type":"list","field":"executionStatus"},{"value":"API Test Suite","type":"string","field":"testSuiteName"}]',
          limit: 5,
          page: 2,
        }),
      );

      expect(result.content[0].text).toContain("API Test Suite");
      expect(result.content[0].text).toContain("automation.user");
      expect(result.content[0].text).toContain("PASS");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (testcase.fetchTestCaseExecutions as any).mockRejectedValue(
        new Error("Test case ID not found"),
      );

      const handler = getHandler("Fetch Test Case Executions");
      const result = await handler({ tcid: 99999 });

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: Test case ID not found",
          },
        ],
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Fetch Issues Linked to Test Case", () => {
    it("should fetch issues linked to test case with required linkedAsset parameter", async () => {
      const mockIssues = {
        data: [
          {
            id: 1001,
            summary: "Login button not working",
            issueType: "Bug",
            issuePriority: "High",
            issueState: "Open",
            linkageLevel: "Test Case",
            executedVersion: "1",
            owner: "john.doe",
          },
          {
            id: 1002,
            summary: "UI alignment issue",
            issueType: "Enhancement",
            issuePriority: "Medium",
            issueState: "In Progress",
            linkageLevel: "Test Step",
            executedVersion: "2",
            owner: "jane.smith",
          },
        ],
        totalCount: 2,
      };

      (issues.fetchIssuesLinkedToTestCase as any).mockResolvedValue(mockIssues);

      const handler = getHandler("Fetch Issues Linked to Test Case");
      const result = await handler({
        linkedAsset: { type: "TC", id: 3878816 },
      });

      expect(issues.fetchIssuesLinkedToTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          linkedAsset: { type: "TC", id: 3878816 },
        }),
      );

      expect(result.content[0].text).toContain("Login button not working");
      expect(result.content[0].text).toContain("Bug");
      expect(result.content[0].text).toContain("High");
      expect(result.content[0].text).toContain("Test Case");
      expect(result.content[0].text).toContain("john.doe");
    });

    it("should fetch issues with filtering and optional parameters", async () => {
      const mockFilteredIssues = {
        data: [
          {
            id: 1003,
            summary: "Authentication timeout",
            issueType: "Bug",
            issuePriority: "High",
            issueState: "Open",
            linkageLevel: "Test Case",
            executedVersion: "3",
            owner: "test.user",
          },
        ],
        totalCount: 1,
      };

      (issues.fetchIssuesLinkedToTestCase as any).mockResolvedValue(
        mockFilteredIssues,
      );

      const handler = getHandler("Fetch Issues Linked to Test Case");
      const result = await handler({
        linkedAsset: { type: "TC", id: 3878816 },
        filter:
          '[{"value":"authentication","type":"string","field":"summary"},{"value":[1],"type":"list","field":"issuePriority"}]',
        limit: 20,
        page: 1,
      });

      expect(issues.fetchIssuesLinkedToTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          linkedAsset: { type: "TC", id: 3878816 },
          filter:
            '[{"value":"authentication","type":"string","field":"summary"},{"value":[1],"type":"list","field":"issuePriority"}]',
          limit: 20,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain("Authentication timeout");
      expect(result.content[0].text).toContain("High");
      expect(result.content[0].text).toContain("test.user");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (issues.fetchIssuesLinkedToTestCase as any).mockRejectedValue(
        new Error("Test case not found or no issues linked"),
      );

      const handler = getHandler("Fetch Issues Linked to Test Case");
      const result = await handler({
        linkedAsset: { type: "TC", id: 99999 },
      });

      expect(result).toEqual({
        content: [
          {
            success: false,
            type: "text",
            text: "Error: Test case not found or no issues linked",
          },
        ],
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Fetch Test Cases Linked to Test Suite", () => {
    it("should fetch test cases linked to test suite with defaults", async () => {
      (testsuite.fetchTestCasesByTestSuite as any).mockResolvedValue({
        data: [
          {
            tcID: 123456,
            entityKey: "MAC-TC-1684",
            name: "User Login Test",
            priorityAlias: "High",
            testCaseStateAlias: "Active",
            testingTypeAlias: "Manual",
            owner: "test.user",
          },
          {
            tcID: 123457,
            entityKey: "MAC-TC-1685",
            name: "Password Reset Test",
            priorityAlias: "Medium",
            testCaseStateAlias: "Active",
            testingTypeAlias: "Automated",
            owner: "test.user",
          },
        ],
        totalCount: 2,
        page: 1,
        limit: 10,
      });

      const handler = getHandler("Fetch Test Cases Linked to Test Suite");
      const result = await handler({ tsID: 92091 });

      expect(testsuite.fetchTestCasesByTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 92091,
        }),
      );

      expect(result.content[0].text).toContain("User Login Test");
      expect(result.content[0].text).toContain("MAC-TC-1684");
      expect(result.content[0].text).toContain("Password Reset Test");
      expect(result.content[0].text).toContain("MAC-TC-1685");
    });

    it("should fetch test cases with custom filters and pagination", async () => {
      (testsuite.fetchTestCasesByTestSuite as any).mockResolvedValue({
        data: [
          {
            tcID: 123456,
            entityKey: "MAC-TC-1684",
            name: "Automated Login Test",
            priorityAlias: "High",
            testCaseStateAlias: "Active",
            testingTypeAlias: "Automated",
            isShared: 0,
            owner: "automation.user",
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 25,
      });

      const handler = getHandler("Fetch Test Cases Linked to Test Suite");
      const result = await handler({
        tsID: 92091,
        filter:
          '[{"value":[2],"type":"list","field":"testingTypeAlias"},{"value":[1],"type":"list","field":"priorityAlias"}]',
        limit: 25,
        page: 1,
      });

      expect(testsuite.fetchTestCasesByTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 92091,
          filter:
            '[{"value":[2],"type":"list","field":"testingTypeAlias"},{"value":[1],"type":"list","field":"priorityAlias"}]',
          limit: 25,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain("Automated Login Test");
      expect(result.content[0].text).toContain("Automated");
      expect(result.content[0].text).toContain("High");
    });
  });

  describe("Fetch Executions by Test Suite", () => {
    it("should fetch executions by test suite with required tsID", async () => {
      (testsuite.fetchExecutionsByTestSuite as any).mockResolvedValue({
        data: [
          {
            executionID: 789123,
            testCaseName: "User Login Test",
            executionStatus: "PASS",
            executedBy: "test.user",
            executedDate: "2024-01-15T10:30:00Z",
            platformName: "Chrome",
            releaseName: "Release 8.12",
            cycleName: "Cycle 8.12.1",
            isAutomated: false,
          },
          {
            executionID: 789124,
            testCaseName: "Password Reset Test",
            executionStatus: "FAIL",
            executedBy: "automation.user",
            executedDate: "2024-01-15T11:00:00Z",
            platformName: "Firefox",
            releaseName: "Release 8.12",
            cycleName: "Cycle 8.12.1",
            isAutomated: true,
          },
        ],
        totalCount: 2,
        page: 1,
        limit: 10,
      });

      const handler = getHandler("Fetch Executions by Test Suite");
      const result = await handler({ tsID: 194955 });

      expect(testsuite.fetchExecutionsByTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 194955,
        }),
      );

      expect(result.content[0].text).toContain("User Login Test");
      expect(result.content[0].text).toContain("PASS");
      expect(result.content[0].text).toContain("Password Reset Test");
      expect(result.content[0].text).toContain("FAIL");
      expect(result.content[0].text).toContain("Chrome");
      expect(result.content[0].text).toContain("Firefox");
    });

    it("should fetch executions with filters and optional parameters", async () => {
      (testsuite.fetchExecutionsByTestSuite as any).mockResolvedValue({
        data: [
          {
            executionID: 789125,
            testCaseName: "Automated API Test",
            executionStatus: "PASS",
            executedBy: "automation.user",
            executedDate: "2024-01-15T12:00:00Z",
            platformName: "API Platform",
            releaseName: "Release 8.12",
            cycleName: "Cycle 8.12.1",
            isAutomated: true,
            isArchived: false,
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 25,
      });

      const handler = getHandler("Fetch Executions by Test Suite");
      const result = await handler({
        tsID: 194955,
        tsFolderID: 126554,
        viewId: 41799,
        gridName: "TESTEXECUTIONLIST",
        filter:
          '[{"type":"boolean","value":true,"field":"isAutomatedFlag"},{"value":[0],"type":"list","field":"isArchived"}]',
        limit: 25,
        page: 1,
      });

      expect(testsuite.fetchExecutionsByTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 194955,
          tsFolderID: 126554,
          viewId: 41799,
          gridName: "TESTEXECUTIONLIST",
          filter:
            '[{"type":"boolean","value":true,"field":"isAutomatedFlag"},{"value":[0],"type":"list","field":"isArchived"}]',
          limit: 25,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain("Automated API Test");
      expect(result.content[0].text).toContain("PASS");
      expect(result.content[0].text).toContain("automation.user");
    });
  });

  describe("Fetch Test Case Runs by Test Suite Run", () => {
    it("should fetch test case runs by test suite run with required parameters", async () => {
      (testsuite.fetchTestCaseRunsByTestSuiteRun as any).mockResolvedValue({
        data: [
          {
            id: 123456,
            entityKey: "MAC-TC-1001",
            name: "Login Authentication Test",
            executionStatus: "PASS",
            executedBy: "test.user",
            executedDate: "2024-01-15T10:30:00Z",
            platform: "Chrome Browser",
            version: 1,
            defectCount: 0,
          },
          {
            id: 123457,
            entityKey: "MAC-TC-1002",
            name: "Password Reset Test",
            executionStatus: "FAIL",
            executedBy: "test.user",
            executedDate: "2024-01-15T10:45:00Z",
            platform: "Chrome Browser",
            version: 1,
            defectCount: 2,
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
        },
      });

      const handler = getHandler("Fetch Test Case Runs by Test Suite Run");
      const result = await handler({
        tsrunID: 78901,
        viewId: 12345,
        projectKey: "MAC",
        start: 0,
        page: 1,
        limit: 10,
      });

      expect(testsuite.fetchTestCaseRunsByTestSuiteRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "MAC",
        expect.objectContaining({
          tsrunID: 78901,
          viewId: 12345,
          start: 0,
          page: 1,
          limit: 10,
        }),
      );

      expect(result.content[0].text).toContain("Login Authentication Test");
      expect(result.content[0].text).toContain("PASS");
      expect(result.content[0].text).toContain("Password Reset Test");
      expect(result.content[0].text).toContain("FAIL");
    });

    it("should fetch test case runs with filter and showTcWithDefects", async () => {
      (testsuite.fetchTestCaseRunsByTestSuiteRun as any).mockResolvedValue({
        data: [
          {
            id: 123458,
            entityKey: "MAC-TC-1003",
            name: "Data Validation Test",
            executionStatus: "BLOCKED",
            executedBy: "qa.user",
            executedDate: "2024-01-15T11:00:00Z",
            platform: "Firefox Browser",
            version: 2,
            defectCount: 1,
            defects: [
              {
                id: "BUG-001",
                summary: "Data validation error",
                status: "Open",
              },
            ],
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 25,
        },
      });

      const handler = getHandler("Fetch Test Case Runs by Test Suite Run");
      const result = await handler({
        tsrunID: 78901,
        viewId: 12345,
        projectKey: "MAC",
        showTcWithDefects: true,
        filter:
          '[{"type":"string","value":"BLOCKED","field":"executionStatus"}]',
        limit: 25,
        page: 1,
      });

      expect(testsuite.fetchTestCaseRunsByTestSuiteRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "MAC",
        expect.objectContaining({
          tsrunID: 78901,
          viewId: 12345,
          showTcWithDefects: true,
          filter:
            '[{"type":"string","value":"BLOCKED","field":"executionStatus"}]',
          limit: 25,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain("Data Validation Test");
      expect(result.content[0].text).toContain("BLOCKED");
      expect(result.content[0].text).toContain("BUG-001");
      expect(result.content[0].text).toContain("Data validation error");
    });
  });

  describe("Fetch Linked Issues of Test Case Run", () => {
    it("should fetch linked issues by test case run with required parameters", async () => {
      (testsuite.fetchLinkedIssuesByTestCaseRun as any).mockResolvedValue({
        data: [
          {
            id: 456789,
            entityKey: "BUG-001",
            name: "Login functionality failure",
            type: "Bug",
            state: "Open",
            priority: "High",
            owner: "dev.user",
            createdDate: "2024-01-15T09:00:00Z",
            updatedDate: "2024-01-15T14:30:00Z",
            linkedTcrCount: 3,
            linkedRqCount: 1,
            attachmentCount: 2,
          },
          {
            id: 456790,
            entityKey: "BUG-002",
            name: "Data validation error",
            type: "Bug",
            state: "In Progress",
            priority: "Medium",
            owner: "qa.user",
            createdDate: "2024-01-15T10:15:00Z",
            updatedDate: "2024-01-15T15:45:00Z",
            linkedTcrCount: 1,
            linkedRqCount: 2,
            attachmentCount: 0,
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
        },
      });

      const handler = getHandler("Fetch Linked Issues of Test Case Run");
      const result = await handler({
        entityId: 1121218,
        projectKey: "MAC",
        start: 0,
        page: 1,
        limit: 10,
      });

      expect(testsuite.fetchLinkedIssuesByTestCaseRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "MAC",
        expect.objectContaining({
          entityId: 1121218,
          start: 0,
          page: 1,
          limit: 10,
        }),
      );

      expect(result.content[0].text).toContain("Login functionality failure");
      expect(result.content[0].text).toContain("BUG-001");
      expect(result.content[0].text).toContain("Data validation error");
      expect(result.content[0].text).toContain("BUG-002");
    });

    it("should fetch issues with getLinked false and filter", async () => {
      (testsuite.fetchLinkedIssuesByTestCaseRun as any).mockResolvedValue({
        data: [
          {
            id: 456791,
            entityKey: "ENH-001",
            name: "Performance improvement request",
            type: "Enhancement",
            state: "New",
            priority: "Low",
            owner: "product.manager",
            createdDate: "2024-01-10T08:00:00Z",
            updatedDate: "2024-01-12T16:20:00Z",
            linkedTcrCount: 0,
            linkedRqCount: 3,
            attachmentCount: 1,
            environmentText: "Production",
            affectedRelease: "Release 8.12",
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 25,
        },
      });

      const handler = getHandler("Fetch Linked Issues of Test Case Run");
      const result = await handler({
        entityId: 1121218,
        projectKey: "MAC",
        getLinked: false,
        istcrFlag: true,
        filter:
          '[{"type":"list","value":[2],"field":"typeAlias"},{"type":"string","value":"Performance","field":"name"}]',
        limit: 25,
        page: 1,
      });

      expect(testsuite.fetchLinkedIssuesByTestCaseRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "MAC",
        expect.objectContaining({
          entityId: 1121218,
          getLinked: false,
          istcrFlag: true,
          filter:
            '[{"type":"list","value":[2],"field":"typeAlias"},{"type":"string","value":"Performance","field":"name"}]',
          limit: 25,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain(
        "Performance improvement request",
      );
      expect(result.content[0].text).toContain("ENH-001");
      expect(result.content[0].text).toContain("Enhancement");
      expect(result.content[0].text).toContain("Production");
    });
  });
});
