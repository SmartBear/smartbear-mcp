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

  describe("Fetch QMetry list Projects", () => {
    it("should fetch project list with default parameters", async () => {
      (project.getProjects as any).mockResolvedValue({
        data: [
          {
            projectID: 1,
            name: "Project A",
            projectKey: "PA",
            isArchived: false,
          },
          {
            projectID: 2,
            name: "Project B",
            projectKey: "PB",
            isArchived: false,
          },
        ],
        total: 2,
      });

      const handler = getHandler("Fetch QMetry list Projects");
      const result = await handler({ params: { showArchive: false } });

      expect(project.getProjects).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          params: { showArchive: false },
        }),
      );

      expect(result.content[0].text).toContain("Project A");
      expect(result.content[0].text).toContain("Project B");
    });

    it("should fetch project list with filter and pagination", async () => {
      (project.getProjects as any).mockResolvedValue({
        data: [
          {
            projectID: 3,
            name: "MAC Project",
            projectKey: "MAC",
            isArchived: false,
          },
        ],
        total: 1,
      });

      const handler = getHandler("Fetch QMetry list Projects");
      const result = await handler({
        params: { showArchive: true },
        filter: '[{"value":"MAC","type":"string","field":"name"}]',
        limit: 10,
        page: 1,
      });

      expect(project.getProjects).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          params: { showArchive: true },
          filter: '[{"value":"MAC","type":"string","field":"name"}]',
          limit: 10,
          page: 1,
        }),
      );

      expect(result.content[0].text).toContain("MAC Project");
    });
  });

  describe("Set QMetry Project Info", () => {
    it("should set project info with default project key", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        id: 1,
        name: "default",
        projectKey: "default",
      });

      const handler = getHandler("Set QMetry Project Info");
      const result = await handler({});

      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        {},
      );

      expect(result.content[0].text).toContain("default");
    });

    it("should set project info with custom project key", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        id: 2,
        name: "MAC Project",
        projectKey: "MAC",
      });

      const handler = getHandler("Set QMetry Project Info");
      const result = await handler({ projectKey: "MAC" });

      expect(project.getProjectInfo).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "MAC",
        {},
      );

      expect(result.content[0].text).toContain("MAC");
    });
  });

  describe("Fetch Releases and Cycles", () => {
    it("should fetch releases and cycles with default parameters", async () => {
      (project.getReleasesCycles as any).mockResolvedValue({
        projects: [
          {
            releases: [
              { releaseID: 123, name: "Release 1.0", isArchived: false },
              { releaseID: 124, name: "Release 2.0", isArchived: false },
            ],
          },
        ],
      });

      const handler = getHandler("Fetch Releases and Cycles");
      const result = await handler({});

      expect(project.getReleasesCycles).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        {},
      );

      expect(result.content[0].text).toContain("Release 1.0");
      expect(result.content[0].text).toContain("Release 2.0");
    });

    it("should fetch releases including archived with showArchive true", async () => {
      (project.getReleasesCycles as any).mockResolvedValue({
        projects: [
          {
            releases: [
              { releaseID: 125, name: "Archived Release", isArchived: true },
            ],
          },
        ],
      });

      const handler = getHandler("Fetch Releases and Cycles");
      const result = await handler({ showArchive: true });

      expect(project.getReleasesCycles).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({ showArchive: true }),
      );

      expect(result.content[0].text).toContain("Archived Release");
    });
  });

  describe("Fetch Builds", () => {
    it("should fetch builds with default pagination", async () => {
      (project.getBuilds as any).mockResolvedValue({
        data: [
          { buildID: 1, name: "Build 1.0", isArchived: false },
          { buildID: 2, name: "Build 1.1", isArchived: false },
        ],
        total: 2,
      });

      const handler = getHandler("Fetch Builds");
      const result = await handler({});

      expect(project.getBuilds).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({}),
      );

      expect(result.content[0].text).toContain("Build 1.0");
      expect(result.content[0].text).toContain("Build 1.1");
    });

    it("should fetch builds with filter by name", async () => {
      (project.getBuilds as any).mockResolvedValue({
        data: [{ buildID: 3, name: "Build 2.0", isArchived: false }],
        total: 1,
      });

      const handler = getHandler("Fetch Builds");
      const result = await handler({
        filter: '[{"value":"Build 2.0","type":"string","field":"name"}]',
        limit: 20,
      });

      expect(project.getBuilds).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          filter: '[{"value":"Build 2.0","type":"string","field":"name"}]',
          limit: 20,
        }),
      );

      expect(result.content[0].text).toContain("Build 2.0");
    });
  });

  describe("Fetch Platforms", () => {
    it("should fetch platforms with default parameters", async () => {
      (project.getPlatforms as any).mockResolvedValue({
        data: [
          { platformID: 1, name: "Chrome", isPlatformArchived: false },
          { platformID: 2, name: "Firefox", isPlatformArchived: false },
        ],
        total: 2,
      });

      const handler = getHandler("Fetch Platforms");
      const result = await handler({});

      expect(project.getPlatforms).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({}),
      );

      expect(result.content[0].text).toContain("Chrome");
      expect(result.content[0].text).toContain("Firefox");
    });

    it("should fetch platforms with archive filter", async () => {
      (project.getPlatforms as any).mockResolvedValue({
        data: [{ platformID: 3, name: "Safari", isPlatformArchived: false }],
        total: 1,
      });

      const handler = getHandler("Fetch Platforms");
      const result = await handler({
        filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
      });

      expect(project.getPlatforms).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        }),
      );

      expect(result.content[0].text).toContain("Safari");
    });
  });

  describe("Create Test Case", () => {
    it("should create test case with required parameters", async () => {
      (testcase.createTestCases as any).mockResolvedValue({
        id: 12345,
        entityKey: "TC-001",
        name: "New Test Case",
      });

      const handler = getHandler("Create Test Case");
      const result = await handler({
        tcFolderID: "102653",
        name: "New Test Case",
      });

      expect(testcase.createTestCases).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcFolderID: "102653",
          name: "New Test Case",
        }),
      );

      expect(result.content[0].text).toContain("TC-001");
      expect(result.content[0].text).toContain("New Test Case");
    });

    it("should create test case with steps and metadata", async () => {
      (testcase.createTestCases as any).mockResolvedValue({
        id: 12346,
        entityKey: "TC-002",
        name: "Test with Steps",
      });

      const handler = getHandler("Create Test Case");
      const result = await handler({
        tcFolderID: "102653",
        name: "Test with Steps",
        steps: [
          {
            orderId: 1,
            description: "Step 1",
            inputData: "Input 1",
            expectedOutcome: "Outcome 1",
          },
        ],
        priority: 123,
      });

      expect(testcase.createTestCases).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcFolderID: "102653",
          name: "Test with Steps",
          steps: expect.arrayContaining([
            expect.objectContaining({
              orderId: 1,
              description: "Step 1",
            }),
          ]),
          priority: 123,
        }),
      );

      expect(result.content[0].text).toContain("TC-002");
    });
  });

  describe("Update Test Case", () => {
    it("should update test case with basic fields", async () => {
      (testcase.updateTestCase as any).mockResolvedValue({
        id: 4519260,
        entityKey: "TC-003",
        name: "Updated Test Case",
      });

      const handler = getHandler("Update Test Case");
      const result = await handler({
        tcID: 4519260,
        tcVersionID: 5448492,
        name: "Updated Test Case",
      });

      expect(testcase.updateTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcID: 4519260,
          tcVersionID: 5448492,
          name: "Updated Test Case",
        }),
      );

      expect(result.content[0].text).toContain("Updated Test Case");
    });

    it("should update test case with steps", async () => {
      (testcase.updateTestCase as any).mockResolvedValue({
        id: 4519260,
        entityKey: "TC-004",
        name: "Test with Updated Steps",
      });

      const handler = getHandler("Update Test Case");
      const result = await handler({
        tcID: 4519260,
        tcVersionID: 5448492,
        steps: [
          {
            orderId: 1,
            description: "Updated Step",
            tcStepID: 3014032,
          },
        ],
        isStepUpdated: true,
      });

      expect(testcase.updateTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcID: 4519260,
          tcVersionID: 5448492,
          steps: expect.arrayContaining([
            expect.objectContaining({
              orderId: 1,
              description: "Updated Step",
            }),
          ]),
          isStepUpdated: true,
        }),
      );

      expect(result.content[0].text).toContain("TC-004");
    });
  });

  describe("Create Test Suite", () => {
    it("should create test suite with required parameters", async () => {
      (testsuite.createTestSuites as any).mockResolvedValue({
        id: 1505898,
        entityKey: "TS-001",
        name: "New Test Suite",
      });

      const handler = getHandler("Create Test Suite");
      const result = await handler({
        parentFolderId: "113557",
        name: "New Test Suite",
      });

      expect(testsuite.createTestSuites).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          parentFolderId: "113557",
          name: "New Test Suite",
        }),
      );

      expect(result.content[0].text).toContain("TS-001");
      expect(result.content[0].text).toContain("New Test Suite");
    });

    it("should create test suite with metadata and release mapping", async () => {
      (testsuite.createTestSuites as any).mockResolvedValue({
        id: 1505899,
        entityKey: "TS-002",
        name: "Suite with Metadata",
      });

      const handler = getHandler("Create Test Suite");
      const result = await handler({
        parentFolderId: "113557",
        name: "Suite with Metadata",
        description: "Test suite description",
        testsuiteOwner: 6963,
        associateRelCyc: true,
        releaseCycleMapping: [{ buildID: 18411, releaseId: 10286 }],
      });

      expect(testsuite.createTestSuites).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          parentFolderId: "113557",
          name: "Suite with Metadata",
          testsuiteOwner: 6963,
          associateRelCyc: true,
        }),
      );

      expect(result.content[0].text).toContain("TS-002");
    });
  });

  describe("Update Test Suite", () => {
    it("should update test suite name", async () => {
      (testsuite.updateTestSuite as any).mockResolvedValue({
        id: 1505898,
        entityKey: "TS-003",
        name: "Updated Suite Name",
      });

      const handler = getHandler("Update Test Suite");
      const result = await handler({
        id: 1505898,
        entityKey: "TS-003",
        TsFolderID: 1644087,
        name: "Updated Suite Name",
      });

      expect(testsuite.updateTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          id: 1505898,
          entityKey: "TS-003",
          TsFolderID: 1644087,
          name: "Updated Suite Name",
        }),
      );

      expect(result.content[0].text).toContain("Updated Suite Name");
    });

    it("should update test suite state and owner", async () => {
      (testsuite.updateTestSuite as any).mockResolvedValue({
        id: 1505898,
        entityKey: "TS-004",
        testSuiteState: 505036,
        testsuiteOwner: 6963,
      });

      const handler = getHandler("Update Test Suite");
      const result = await handler({
        id: 1505898,
        entityKey: "TS-004",
        TsFolderID: 1644087,
        testSuiteState: 505036,
        testsuiteOwner: 6963,
      });

      expect(testsuite.updateTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          id: 1505898,
          testSuiteState: 505036,
          testsuiteOwner: 6963,
        }),
      );

      expect(result.content[0].text).toContain("505036");
    });
  });

  describe("Fetch Test Suites", () => {
    it("should auto-resolve viewId and fetch test suites", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { TS: { viewId: 103097 } },
      });
      (testsuite.fetchTestSuites as any).mockResolvedValue({
        data: [
          { id: 1, name: "Suite 1", entityKey: "TS-001" },
          { id: 2, name: "Suite 2", entityKey: "TS-002" },
        ],
      });

      const handler = getHandler("Fetch Test Suites");
      const result = await handler({});

      expect(project.getProjectInfo).toHaveBeenCalled();
      expect(testsuite.fetchTestSuites).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 103097,
          folderPath: "",
        }),
      );

      expect(result.content[0].text).toContain("Suite 1");
      expect(result.content[0].text).toContain("Suite 2");
    });

    it("should skip auto-resolution when viewId provided", async () => {
      (testsuite.fetchTestSuites as any).mockResolvedValue({
        data: [{ id: 3, name: "Suite 3", entityKey: "TS-003" }],
      });

      const handler = getHandler("Fetch Test Suites");
      const result = await handler({ viewId: 99999, folderPath: "" });

      expect(project.getProjectInfo).not.toHaveBeenCalled();
      expect(testsuite.fetchTestSuites).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 99999,
          folderPath: "",
        }),
      );

      expect(result.content[0].text).toContain("Suite 3");
    });
  });

  describe("Fetch Test Suites for Test Case", () => {
    it("should fetch test suites for test case with auto-resolution", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { TSFS: { viewId: 104316 } },
      });
      (testsuite.fetchTestSuitesForTestCase as any).mockResolvedValue({
        data: [
          { id: 101, name: "Available Suite 1" },
          { id: 102, name: "Available Suite 2" },
        ],
      });

      const handler = getHandler("Fetch Test Suites for Test Case");
      const result = await handler({ tsFolderID: 113557 });

      expect(project.getProjectInfo).toHaveBeenCalled();
      expect(testsuite.fetchTestSuitesForTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsFolderID: 113557,
          viewId: 104316,
        }),
      );

      expect(result.content[0].text).toContain("Available Suite 1");
    });

    it("should fetch test suites with filter", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { TSFS: { viewId: 104316 } },
      });
      (testsuite.fetchTestSuitesForTestCase as any).mockResolvedValue({
        data: [{ id: 103, name: "Filtered Suite" }],
      });

      const handler = getHandler("Fetch Test Suites for Test Case");
      const result = await handler({
        tsFolderID: 113557,
        filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
      });

      expect(testsuite.fetchTestSuitesForTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsFolderID: 113557,
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        }),
      );

      expect(result.content[0].text).toContain("Filtered Suite");
    });
  });

  describe("Link Requirements to Testcase", () => {
    it("should link requirements to test case", async () => {
      (testcase.linkRequirementToTestCase as any).mockResolvedValue({
        success: true,
        message: "Requirements linked successfully",
      });

      const handler = getHandler("Link Requirements to Testcase");
      const result = await handler({
        tcID: "VT-TC-26",
        tcVersionId: 5448515,
        rqVersionIds: "5009939,5009937",
      });

      expect(testcase.linkRequirementToTestCase).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcID: "VT-TC-26",
          tcVersionId: 5448515,
          rqVersionIds: "5009939,5009937",
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (testcase.linkRequirementToTestCase as any).mockRejectedValue(
        new Error("Test case not found"),
      );

      const handler = getHandler("Link Requirements to Testcase");
      const result = await handler({
        tcID: "VT-TC-99",
        tcVersionId: 999,
        rqVersionIds: "111",
      });

      expect(result.content[0].success).toBe(false);
      expect(result.content[0].text).toContain("Test case not found");

      consoleSpy.mockRestore();
    });
  });

  describe("Fetch Requirements Linked to Test Case", () => {
    it("should fetch requirements linked to test case", async () => {
      (requirement.fetchRequirementsLinkedToTestCase as any).mockResolvedValue({
        data: [
          { entityKey: "RQ-001", name: "Requirement 1" },
          { entityKey: "RQ-002", name: "Requirement 2" },
        ],
      });

      const handler = getHandler("Fetch Requirements Linked to Test Case");
      const result = await handler({ tcID: 594294 });

      expect(
        requirement.fetchRequirementsLinkedToTestCase,
      ).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcID: 594294,
        }),
      );

      expect(result.content[0].text).toContain("RQ-001");
      expect(result.content[0].text).toContain("Requirement 1");
    });

    it("should fetch unlinked requirements with getLinked false", async () => {
      (requirement.fetchRequirementsLinkedToTestCase as any).mockResolvedValue({
        data: [{ entityKey: "RQ-003", name: "Unlinked Requirement" }],
      });

      const handler = getHandler("Fetch Requirements Linked to Test Case");
      const result = await handler({ tcID: 594294, getLinked: false });

      expect(
        requirement.fetchRequirementsLinkedToTestCase,
      ).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tcID: 594294,
          getLinked: false,
        }),
      );

      expect(result.content[0].text).toContain("RQ-003");
    });
  });

  describe("Link Test Cases to Test Suite", () => {
    it("should link test cases to test suite", async () => {
      (testsuite.linkTestCasesToTestSuite as any).mockResolvedValue({
        success: true,
        message: "Test cases linked successfully",
      });

      const handler = getHandler("Link Test Cases to Test Suite");
      const result = await handler({
        tsID: 1487397,
        tcvdIDs: [5448504, 5448503],
        fromReqs: false,
      });

      expect(testsuite.linkTestCasesToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: false,
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });

    it("should handle linking multiple test cases", async () => {
      (testsuite.linkTestCasesToTestSuite as any).mockResolvedValue({
        success: true,
        linkedCount: 4,
      });

      const handler = getHandler("Link Test Cases to Test Suite");
      const result = await handler({
        tsID: 1487397,
        tcvdIDs: [5448504, 5448503, 5448505, 5448506],
        fromReqs: false,
      });

      expect(testsuite.linkTestCasesToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 1487397,
          tcvdIDs: expect.arrayContaining([5448504, 5448503, 5448505, 5448506]),
        }),
      );

      expect(result.content[0].text).toContain("4");
    });
  });

  describe("Requirements Linked Test Cases to Test Suite", () => {
    it("should link requirement-linked test cases to test suite", async () => {
      (testsuite.reqLinkedTestCasesToTestSuite as any).mockResolvedValue({
        success: true,
        message: "Requirement-linked test cases linked successfully",
      });

      const handler = getHandler(
        "Requirements Linked Test Cases to Test Suite",
      );
      const result = await handler({
        tsID: 1487397,
        tcvdIDs: [5448504, 5448503],
        fromReqs: true,
      });

      expect(testsuite.reqLinkedTestCasesToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: true,
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });

    it("should link multiple requirement-linked test cases", async () => {
      (testsuite.reqLinkedTestCasesToTestSuite as any).mockResolvedValue({
        success: true,
        linkedCount: 4,
      });

      const handler = getHandler(
        "Requirements Linked Test Cases to Test Suite",
      );
      const result = await handler({
        tsID: 8674,
        tcvdIDs: [5448504, 5448503, 5448505, 5448506],
        fromReqs: true,
      });

      expect(testsuite.reqLinkedTestCasesToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          tsID: 8674,
          fromReqs: true,
        }),
      );

      expect(result.content[0].text).toContain("4");
    });
  });

  describe("Create Defect or Issue", () => {
    it("should create issue with required parameters", async () => {
      (issues.createIssue as any).mockResolvedValue({
        id: 5057882,
        entityKey: "IS-001",
        summary: "Login button not working",
      });

      const handler = getHandler("Create Defect or Issue");
      const result = await handler({
        summary: "Login button not working",
        issueType: 2231983,
        issuePriority: 2231988,
      });

      expect(issues.createIssue).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          summary: "Login button not working",
          issueType: 2231983,
          issuePriority: 2231988,
        }),
      );

      expect(result.content[0].text).toContain("IS-001");
      expect(result.content[0].text).toContain("Login button not working");
    });

    it("should create issue with all optional parameters", async () => {
      (issues.createIssue as any).mockResolvedValue({
        id: 5057883,
        entityKey: "IS-002",
        summary: "Complete Issue",
      });

      const handler = getHandler("Create Defect or Issue");
      const result = await handler({
        summary: "Complete Issue",
        issueType: 2231983,
        issuePriority: 2231988,
        issueOwner: 15112,
        description: "Detailed description",
        affectedRelease: [111840],
        affectedCycles: [112345],
        tcRunID: 567890,
      });

      expect(issues.createIssue).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          summary: "Complete Issue",
          issueOwner: 15112,
          affectedRelease: [111840],
          tcRunID: 567890,
        }),
      );

      expect(result.content[0].text).toContain("IS-002");
    });
  });

  describe("Update Issue", () => {
    it("should update issue summary", async () => {
      (issues.updateIssue as any).mockResolvedValue({
        id: 118150,
        summary: "Updated summary",
      });

      const handler = getHandler("Update Issue");
      const result = await handler({
        DefectId: 118150,
        summary: "Updated summary",
      });

      expect(issues.updateIssue).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          DefectId: 118150,
          summary: "Updated summary",
        }),
      );

      expect(result.content[0].text).toContain("Updated summary");
    });

    it("should update issue priority and type", async () => {
      (issues.updateIssue as any).mockResolvedValue({
        id: 118150,
        issuePriority: 189340,
        issueType: 189337,
      });

      const handler = getHandler("Update Issue");
      const result = await handler({
        DefectId: 118150,
        issuePriority: 189340,
        issueType: 189337,
      });

      expect(issues.updateIssue).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          DefectId: 118150,
          issuePriority: 189340,
          issueType: 189337,
        }),
      );

      expect(result.content[0].text).toContain("189340");
    });
  });

  describe("Fetch Defects or Issues", () => {
    it("should auto-resolve viewId and fetch issues", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { IS: { viewId: 169424 } },
      });
      (issues.fetchIssues as any).mockResolvedValue({
        data: [
          { id: 1, entityKey: "IS-001", name: "Issue 1" },
          { id: 2, entityKey: "IS-002", name: "Issue 2" },
        ],
      });

      const handler = getHandler("Fetch Defects or Issues");
      const result = await handler({});

      expect(project.getProjectInfo).toHaveBeenCalled();
      expect(issues.fetchIssues).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          viewId: 169424,
        }),
      );

      expect(result.content[0].text).toContain("IS-001");
      expect(result.content[0].text).toContain("IS-002");
    });

    it("should fetch issues with filter", async () => {
      (project.getProjectInfo as any).mockResolvedValue({
        latestViews: { IS: { viewId: 169424 } },
      });
      (issues.fetchIssues as any).mockResolvedValue({
        data: [{ id: 3, entityKey: "IS-003", name: "Filtered Issue" }],
      });

      const handler = getHandler("Fetch Defects or Issues");
      const result = await handler({
        filter: '[{"type":"string","value":"IS-003","field":"entityKeyId"}]',
      });

      expect(issues.fetchIssues).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          filter: '[{"type":"string","value":"IS-003","field":"entityKeyId"}]',
        }),
      );

      expect(result.content[0].text).toContain("IS-003");
    });
  });

  describe("Link Issues to Testcase Run", () => {
    it("should link single issue to testcase run", async () => {
      (issues.linkIssuesToTestcaseRun as any).mockResolvedValue({
        success: true,
        message: "Issue linked successfully",
      });

      const handler = getHandler("Link Issues to Testcase Run");
      const result = await handler({
        issueIds: ["5054834"],
        tcrId: 567890,
      });

      expect(issues.linkIssuesToTestcaseRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          issueIds: ["5054834"],
          tcrId: 567890,
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });

    it("should link multiple issues to testcase run", async () => {
      (issues.linkIssuesToTestcaseRun as any).mockResolvedValue({
        success: true,
        linkedCount: 2,
      });

      const handler = getHandler("Link Issues to Testcase Run");
      const result = await handler({
        issueIds: ["5054834", "5054835"],
        tcrId: 567890,
      });

      expect(issues.linkIssuesToTestcaseRun).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          issueIds: ["5054834", "5054835"],
          tcrId: 567890,
        }),
      );

      expect(result.content[0].text).toContain("2");
    });
  });

  describe("Link Platforms to Test Suite", () => {
    it("should link single platform to test suite", async () => {
      (testsuite.linkPlatformsToTestSuite as any).mockResolvedValue({
        success: true,
        message: "Platform linked successfully",
      });

      const handler = getHandler("Link Platforms to Test Suite");
      const result = await handler({
        qmTsId: 1511970,
        qmPlatformId: "63004",
      });

      expect(testsuite.linkPlatformsToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          qmTsId: 1511970,
          qmPlatformId: "63004",
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });

    it("should link multiple platforms to test suite", async () => {
      (testsuite.linkPlatformsToTestSuite as any).mockResolvedValue({
        success: true,
        linkedCount: 3,
      });

      const handler = getHandler("Link Platforms to Test Suite");
      const result = await handler({
        qmTsId: 1511970,
        qmPlatformId: "63004,63005,63006",
      });

      expect(testsuite.linkPlatformsToTestSuite).toHaveBeenCalledWith(
        "fake-token",
        "https://qmetry.example",
        "default",
        expect.objectContaining({
          qmTsId: 1511970,
          qmPlatformId: "63004,63005,63006",
        }),
      );

      expect(result.content[0].text).toContain("linked");
    });
  });
});
