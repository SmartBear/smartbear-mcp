import type { ToolParams } from "../../common/types.js";
import { QMetryToolsHandlers } from "../config/constants.js";
import {
  BuildArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ReleasesCyclesArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseStepsArgsSchema,
  TestCaseVersionDetailsArgsSchema,
} from "../types/common.js";

export interface QMetryToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}

export const TOOLS: QMetryToolParams[] = [
  {
    title: "Set QMetry Project Info",
    summary: "Set current QMetry project for your account",
    handler: QMetryToolsHandlers.SET_PROJECT_INFO,
    zodSchema: ProjectArgsSchema,
    purpose:
      "Switch the active QMetry project context for the current session. " +
      "This tool sets the default project that will be used for all subsequent QMetry operations. " +
      "Essential for multi-project QMetry instances where you need to work with specific projects.",
    useCases: [
      "Switch to a specific project before performing test case operations",
      "Set project context for batch operations on test cases",
      "Configure the default project for the current session",
      "Validate access to a specific project before proceeding with operations",
    ],
    examples: [
      {
        description: "Set default project as active",
        parameters: { projectKey: "default" },
        expectedOutput:
          "Project context set to 'default' with confirmation of project details",
      },
      {
        description: "Switch to UT project",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "Project context switched to 'UT' project with available configurations",
      },
      {
        description: "Set MAC project as active for test case operations",
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "Project context set to 'MAC' with viewIds and folder structure",
      },
    ],
    hints: [
      "Always set the project context before performing test case operations in multi-project environments",
      "Use the same project key that you'll use in subsequent test case operations",
      "Common project keys include 'default', 'UT', 'MAC', 'VT' - check with your QMetry admin for available projects",
      "This operation must be performed before fetching test cases if working with non-default projects",
      "The project context persists for the current session until changed again",
    ],
    outputFormat:
      "JSON object containing project configuration details, confirmation of project switch, and available project metadata",
    readOnly: false,
    idempotent: true,
  },
  {
    title: "Fetch QMetry Project Info",
    summary:
      "Fetch QMetry project information including viewId and folderPath needed for other operations",
    handler: QMetryToolsHandlers.FETCH_PROJECT_INFO,
    zodSchema: ProjectArgsSchema,
    purpose:
      "Prerequisite tool that provides project configuration data required by other QMetry operations. " +
      "The project key to fetch info for. Use 'default' if not specified. " +
      "Common project keys include 'UT', 'VT', 'MAC', etc. " +
      "If user doesn't specify a project key, this tool will use 'default' automatically.",
    useCases: [
      "Get project configuration before fetching test cases",
      "Retrieve available viewIds for test case listing",
      "Get folderPath information for project navigation",
      "Validate project access and permissions",
    ],
    examples: [
      {
        description: "Get default project info",
        parameters: {},
        expectedOutput:
          "Project configuration with viewIds, folderPaths, and project details",
      },
      {
        description: "Get specific project info",
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "MAC project configuration with available views and folders",
      },
    ],
    hints: [
      "Always call this first when user doesn't provide viewId or folderPath",
      "Use 'default' project key when user doesn't specify one",
      "Extract viewId from latestViews.TC.viewId for test case operations",
      "Use empty string '' as folderPath for root directory",
    ],
    outputFormat:
      "JSON object containing project details, viewIds, folderPaths, and project configuration",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Releases and Cycles",
    summary: "Fetch QMetry releases and cycles from the current project",
    handler: QMetryToolsHandlers.FETCH_RELEASES_CYCLES,
    zodSchema: ReleasesCyclesArgsSchema,
    purpose:
      "Retrieve release and cycle information from the current QMetry project. " +
      "Releases represent major versions or milestones, while cycles represent test execution phases within releases. " +
      "This tool provides the hierarchical structure of releases and their associated cycles.",
    useCases: [
      "Fetch associated releases and cycles of current project",
      "Fetch available releases and cycles of current project",
      "Get release and cycle information for test planning",
      "List all releases and cycles in a project",
      "Search for specific releases using release name or ID",
      "Fetch cycle lists based on release ID",
      "Search for specific cycles using cycle name or ID",
      "Get project structure for test planning and execution",
      "Retrieve release hierarchy for reporting purposes",
    ],
    examples: [
      {
        description: "Get active releases and cycles (default behavior)",
        parameters: {},
        expectedOutput:
          "List of active releases and cycles excluding archived ones (showArchive: false sent in payload)",
      },
      {
        description: "Get active/unarchived releases and cycles explicitly",
        parameters: { showArchive: false },
        expectedOutput:
          "List of active releases and cycles excluding archived ones (showArchive: false sent in payload)",
      },
      {
        description: "Get not active/archived releases and cycles",
        parameters: { showArchive: true },
        expectedOutput:
          "List of all releases and cycles including archived ones (showArchive: true sent in payload)",
      },
    ],
    hints: [
      "Use 'default' project key when user doesn't specify one",
      "PAYLOAD SCENARIOS:",
      "- No showArchive parameter → payload: {showArchive: false} → Returns only active releases/cycles",
      "- showArchive: false → payload: {showArchive: false} → Returns only active/non-archived releases/cycles",
      "- showArchive: true → payload: {showArchive: true} → Returns all releases/cycles including archived ones",
      "Default behavior always excludes archived items unless explicitly requested",
      "Releases contain cycles - use this hierarchy for test execution planning",
      "Each release can have multiple cycles representing different testing phases",
    ],
    outputFormat:
      "JSON object with project hierarchy containing releases and their associated cycles",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Builds",
    summary: "Fetch QMetry builds from the current project",
    handler: QMetryToolsHandlers.FETCH_BUILDS,
    zodSchema: BuildArgsSchema,
    purpose:
      "Retrieve builds information from the current QMetry project. " +
      "Builds represent specific versions or iterations of software that can be associated with test executions. " +
      "This tool provides a list of builds with their metadata for test planning and execution tracking.",
    useCases: [
      "Fetch all from the current project",
      "Fetch all available builds for test execution planning",
      "Get build metadata for test run assignments",
      "List builds for reporting and analytics",
      "Filter builds by name or archive status",
      "Get paginated build results for large projects",
      "Retrieve build information for CI/CD integration",
      "Search for specific builds using filters",
      "Get build details for test execution history",
    ],
    examples: [
      {
        description: "Get all builds (default behavior)",
        parameters: {},
        expectedOutput:
          "List of all builds with default pagination (10 items per page)",
      },
      {
        description: "Get builds with custom pagination",
        parameters: { page: 1, limit: 10, start: 0 },
        expectedOutput: "List of builds with custom pagination settings",
      },
      {
        description: "Filter builds by name",
        parameters: {
          filter: '[{"value":"Build 1.0","type":"string","field":"name"}]',
        },
        expectedOutput: "Filtered list of builds matching the name criteria",
      },
      {
        description: "Filter builds by archive status",
        parameters: {
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of builds filtered by archive status (archived and non-archived)",
      },
    ],
    hints: [
      "Use 'default' project key when user doesn't specify one",
      "Default pagination: start=0, page=1, limit=10",
      "Filter parameter should be a JSON string with filter criteria",
      "Common filter fields: 'name' (string), 'isArchived' (list of 0,1)",
      "Empty payload {} is sent when no parameters are provided",
      "Builds are also known as 'drops' in QMetry terminology",
      "Use builds for associating test executions with specific software versions",
    ],
    outputFormat: "JSON object with builds list and pagination metadata",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Platforms",
    summary: "Fetch QMetry platforms from the current project",
    handler: QMetryToolsHandlers.FETCH_PLATFORMS,
    zodSchema: PlatformArgsSchema,
    purpose:
      "Retrieve platforms information from the current QMetry project. " +
      "Platforms represent testing environments, operating systems, browsers, or devices " +
      "that can be associated with test case execution and reporting. " +
      "This tool provides a list of platforms with their metadata for test planning and execution tracking.",
    useCases: [
      "Fetch all platforms from the current project",
      "Get platform metadata for test execution planning",
      "List platforms for test environment selection",
      "Filter platforms by name or properties",
      "Get paginated platform results for large projects",
      "Retrieve platform information for cross-platform testing",
      "Search for specific platforms using filters",
      "Get platform details for test execution assignment",
    ],
    examples: [
      {
        description: "Get all platforms (default behavior)",
        parameters: {},
        expectedOutput:
          "List of all platforms with default pagination (10 items per page)",
      },
      {
        description: "Get platforms with custom pagination",
        parameters: { page: 1, limit: 10, start: 0 },
        expectedOutput: "List of platforms with custom pagination settings",
      },
      {
        description: "Filter platforms by name",
        parameters: {
          filter: '[{"value":"Chrome","type":"string","field":"name"}]',
        },
        expectedOutput: "Filtered list of platforms matching the name criteria",
      },
      {
        description: "Filter platforms by archive status",
        parameters: {
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of platforms filtered by archive status (archived and non-archived)",
      },
      {
        description: "Get only archived platforms",
        parameters: {
          filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only archived platforms",
      },
      {
        description: "Get only active/non-archived platforms",
        parameters: {
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only active/non-archived platforms",
      },
      {
        description: "Get platforms with custom sorting",
        parameters: {
          sort: '[{"property":"name","direction":"ASC"}]',
        },
        expectedOutput: "List of platforms sorted by name in ascending order",
      },
    ],
    hints: [
      "Use 'default' project key when user doesn't specify one",
      "Default pagination: start=0, page=1, limit=10",
      "Filter parameter should be a JSON string with filter criteria",
      "Sort parameter should be a JSON string with sort criteria",
      "Default sort: platformID descending",
      "Common filter fields: 'name' (string), 'isArchived' (list of 0,1) for archive status",
      "IMPORTANT: Always use 'isArchived' field for filtering by archive status, even though response shows 'isPlatformArchived'",
      "Archive status values: 0 = active/non-archived, 1 = archived",
      "Empty payload {} is sent when no parameters are provided",
      "Use platforms for cross-platform testing and environment selection",
    ],
    outputFormat: "JSON object with platforms list and pagination metadata",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Test Cases",
    summary:
      "Fetch QMetry test cases - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_TEST_CASES,
    zodSchema: TestCaseListArgsSchema,
    purpose:
      "Get test cases from QMetry. System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all test cases in a project",
      "Search for specific test cases using filters",
      "Browse test cases in specific folders",
      "Get paginated test case results",
    ],
    examples: [
      {
        description:
          "Get all test cases from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of test cases from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all test cases from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of test cases from UT project using UT's specific TC viewId",
      },
      {
        description: "Get test cases with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 167136, folderPath: "" },
        expectedOutput: "Test cases using manually specified viewId 167136",
      },
      {
        description:
          "List test cases from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId: "fetch specific project given projectKey Test Case ViewId",
          folderPath: "",
        },
        expectedOutput:
          "Test cases using manually specified viewId 167136 or projectKey",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and test case fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.TC.viewId",
      "Step 3: Use the SAME projectKey and the extracted TC viewId for fetching test cases",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and test case fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by test case key (like MAC-TC-1684), use filter: \'[{"type":"string","value":"MAC-TC-1684","field":"entityKeyId"}]\'',
    ],
    outputFormat:
      "JSON object with 'data' array containing test cases and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Test Case Details",
    summary:
      "Get detailed information for a specific QMetry test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS,
    zodSchema: TestCaseDetailsArgsSchema,
    purpose:
      "Retrieve comprehensive test case information including metadata, status, and basic properties",
    useCases: [
      "Get test case details by numeric ID",
      "Retrieve test case metadata for reporting",
      "Get test case summary and properties",
      "Fetch test case details before accessing steps or version details",
    ],
    examples: [
      {
        description: "Get test case details by numeric ID",
        parameters: { tcID: 4468020 },
        expectedOutput:
          "Detailed test case information including summary, description, status",
      },
    ],
    hints: [
      "⚠️ This API requires a numeric tcID parameter",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID",
      "After resolving entityKey → tcID, call this tool with the resolved numeric tcID",
      "This tool provides metadata and properties; use FETCH_TEST_CASE_STEPS for step-level details",
    ],
    outputFormat:
      "JSON object with test case details including ID, key, summary, description, and metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Version Details",
    summary:
      "Get QMetry test case details for a specific version by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS,
    zodSchema: TestCaseVersionDetailsArgsSchema,
    purpose:
      "Retrieve version-specific information for a test case including history and changes",
    useCases: [
      "Get specific version details of a test case",
      "Compare different versions of a test case",
      "Retrieve version history information",
      "Audit changes made across test case versions",
    ],
    examples: [
      {
        description: "Get version 2 details for test case ID 123",
        parameters: { id: 123, version: 2 },
        expectedOutput: "Version 2 details for test case 123",
      },
    ],
    hints: [
      "⚠️ Requires numeric ID, not entityKey",
      "If user provides entityKey (e.g., MAC-TC-1684), first resolve it to numeric ID using FETCH_TEST_CASES",
      "Version defaults to 1 if not specified",
      "Provides version-specific metadata and history",
    ],
    outputFormat: "JSON object with version-specific test case details",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Steps",
    summary:
      "Get detailed test case steps for a specific test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_STEPS,
    zodSchema: TestCaseStepsArgsSchema,
    purpose:
      "Retrieve step-by-step instructions and expected results for manual execution of a test case",
    useCases: [
      "Get step-by-step instructions with expected results",
      "Retrieve test case execution procedure for manual runs",
      "Export or display detailed test steps for documentation",
      "Fetch steps before automation mapping",
    ],
    examples: [
      {
        description: "Get steps for test case ID 123",
        parameters: { id: 123 },
        expectedOutput:
          "Detailed steps with actions and expected results for test case 123",
      },
    ],
    hints: [
      "⚠️ Requires numeric ID, not entityKey",
      "If user provides entityKey (e.g., MAC-TC-1684), resolve it first via FETCH_TEST_CASES to get the numeric ID",
      "Version defaults to 1 if not specified",
      "Use pagination for test cases with many steps",
    ],
    outputFormat:
      "JSON object with array of test steps including step description, expected result, and order",
    readOnly: true,
    idempotent: true,
  },
];
