import type { ToolParams } from "../../common/types.js";
import { QMetryToolsHandlers } from "../config/constants.js";
import {
  BuildArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ReleasesCyclesArgsSchema,
  RequirementDetailsArgsSchema,
  RequirementListArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseStepsArgsSchema,
  TestCasesLinkedToRequirementArgsSchema,
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
      {
        description: "Get test cases by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Test cases associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test cases by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All test cases associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get test cases by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All test cases associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific test case by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TC-1684","field":"entityKeyId"}]',
        },
        expectedOutput: "Test cases matching the entity key criteria",
      },
      {
        description:
          "Search for multiple test cases by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TC-1684,MAC-TC-1685,MAC-TC-1686","field":"entityKeyId"}]',
        },
        expectedOutput: "Test cases matching any of the specified entity keys",
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
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: entityKeyId, priorityAlias, createdByAlias, updatedByAlias, testCaseStateAlias, testingTypeAlias, testCaseTypeAlias, componentAlias, owner, release, cycle",
      "SORT FIELDS: entityKey, name, associatedVersion, priorityAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, testCaseStateAlias, testingTypeAlias, executionMinutes",
      "For multiple entity keys, use comma-separated values in filter",
      "Use empty string '' as folderPath for root directory",
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
      "This API requires a numeric tcID parameter",
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
      "Requires numeric ID, not entityKey",
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
      "Requires numeric ID, not entityKey",
      "If user provides entityKey (e.g., MAC-TC-1684), resolve it first via FETCH_TEST_CASES to get the numeric ID",
      "Version defaults to 1 if not specified",
      "Use pagination for test cases with many steps",
    ],
    outputFormat:
      "JSON object with array of test steps including step description, expected result, and order",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Requirements",
    summary:
      "Fetch QMetry requirements - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS,
    zodSchema: RequirementListArgsSchema,
    purpose:
      "Get requirements from QMetry. System automatically gets correct requirement viewId from project info if not provided.",
    useCases: [
      "List all requirements in a project",
      "Search for specific requirements using filters",
      "Browse requirements in specific folders",
      "Get paginated requirement results",
      "Filter requirements by name or properties",
      "Get requirement metadata for test planning",
    ],
    examples: [
      {
        description:
          "Get all requirements from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of requirements from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all requirements from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of requirements from UT project using UT's specific RQ viewId",
      },
      {
        description:
          "Get requirements with manual viewId (skip auto-resolution)",
        parameters: {
          projectKey: "MAC",
          viewId: 7397,
          folderPath: "/APIARY 88",
        },
        expectedOutput: "Requirements using manually specified viewId 7397",
      },
      {
        description: "Search for specific requirements by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-RQ-123","field":"entityKeyId"}]',
        },
        expectedOutput:
          "Filtered requirements matching the entity key criteria",
      },
      {
        description:
          "Search for multiple requirements by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-RQ-123,MAC-RQ-456,MAC-RQ-789","field":"entityKeyId"}]',
        },
        expectedOutput:
          "Requirements matching any of the specified entity keys",
      },
      {
        description: "Filter requirements by state (e.g., Open, Approved)",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"Open","field":"requirementStateAlias"}]',
        },
        expectedOutput: "Requirements with 'Open' state",
      },
      {
        description: "Filter requirements by priority",
        parameters: {
          projectKey: "MAC",
          filter: '[{"type":"string","value":"High","field":"priorityAlias"}]',
        },
        expectedOutput: "Requirements with 'High' priority",
      },
      {
        description: "Filter requirements by archive status",
        parameters: {
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of requirements filtered by archive status (archived and non-archived)",
      },
      {
        description: "Get only archived requirements",
        parameters: {
          filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only archived requirements",
      },
      {
        description: "Sort requirements by name in ascending order",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"name","direction":"ASC"}]',
        },
        expectedOutput: "Requirements sorted alphabetically by name",
      },
      {
        description: "Sort requirements by creation date (newest first)",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"createdDate","direction":"DESC"}]',
        },
        expectedOutput: "Requirements sorted by creation date, newest first",
      },
      {
        description: "Sort requirements by entity key",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"entityKey","direction":"ASC"}]',
        },
        expectedOutput:
          "Requirements sorted by entity key (MAC-RQ-1, MAC-RQ-2, etc.)",
      },
      {
        description: "Sort requirements by linked test case count",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"linkedTcCount","direction":"DESC"}]',
        },
        expectedOutput:
          "Requirements sorted by number of linked test cases, highest first",
      },
      {
        description:
          "Complex filter: Requirements by owner with specific state",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"john.doe","field":"owner"},{"type":"string","value":"Approved","field":"requirementStateAlias"}]',
        },
        expectedOutput: "Requirements owned by john.doe with 'Approved' state",
      },
      {
        description: "Multi-field sort: Priority first, then creation date",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"priorityAlias","direction":"DESC"},{"property":"createdDate","direction":"ASC"}]',
        },
        expectedOutput:
          "Requirements sorted by priority (High to Low), then by creation date (oldest first)",
      },
      {
        description: "Filter requirements by specific release and cycle",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Requirements associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Filter requirements by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All requirements associated with Release 8.12 (ID: 55178)",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and requirement fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.RQ.viewId",
      "Step 3: Use the SAME projectKey and the extracted RQ viewId for fetching requirements",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and requirement fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by requirement key (like MAC-RQ-123), use filter: \'[{"type":"string","value":"MAC-RQ-123","field":"entityKeyId"}]\'',
      'For multiple entity keys, use comma-separated values: \'[{"type":"string","value":"MAC-RQ-123,MAC-RQ-456","field":"entityKeyId"}]\'',
      "Use empty string '' as folderPath for root directory",
      "Filter supports QMETRY and JIRA types - default is QMETRY",
      "FILTER FIELDS: entityKeyId, name, requirementStateAlias, priorityAlias, owner, createdByAlias, updatedByAlias, createdSystem",
      "SORT FIELDS: name, entityKey, associatedVersion, priorityAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, requirementStateAlias, linkedTcCount, linkedDfCount, attachmentCount, createdSystem, owner",
      "SORT DIRECTIONS: ASC (ascending), DESC (descending)",
      "Multiple filters: Use array with multiple objects for AND conditions",
      "Multiple sort criteria: Use array with multiple objects, first takes priority",
      "Filter format: [{'type':'string','value':'filterValue','field':'fieldName'}]",
      "Sort format: [{'property':'fieldName','direction':'ASC|DESC'}]",
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs from fetch_releases_and_cycles tool",
      'For specific release: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For specific cycle: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For release AND cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Example: Release 8.12 (ID: 55178) + Cycle 8.12.1 (ID: 111577) = filter with both IDs",
    ],
    outputFormat:
      "JSON object with 'data' array containing requirements and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Requirement Details",
    summary:
      "Get detailed information for a specific QMetry requirement by numeric ID",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENT_DETAILS,
    zodSchema: RequirementDetailsArgsSchema,
    purpose:
      "Retrieve comprehensive requirement information including metadata, status, and all fields for a specific requirement",
    useCases: [
      "Get requirement details by numeric ID",
      "Retrieve requirement metadata for reporting",
      "Get requirement summary and properties",
      "Fetch requirement details before linking or updating",
      "Access requirement field values and custom fields",
      "Get requirement version-specific information",
    ],
    examples: [
      {
        description: "Get requirement details by numeric ID",
        parameters: { id: 4791316, version: 1 },
        expectedOutput:
          "Detailed requirement information including summary, description, status, and all fields",
      },
    ],
    hints: [
      "This API requires a numeric ID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-RQ-730), first call FETCH_REQUIREMENTS with a filter on entityKeyId to resolve the numeric ID",
      "After resolving entityKey → numeric ID, call this tool with the resolved numeric ID",
      "Version parameter is required - use 1 for the latest version unless user specifies otherwise",
      "This tool provides complete requirement information including all custom fields",
      "Use this tool to get detailed requirement information that's not available in the list view",
    ],
    outputFormat:
      "JSON object with requirement details including ID, key, summary, description, status, and all metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Cases Linked to Requirement",
    summary:
      "Get test cases that are linked (or not linked) to a specific requirement in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT,
    zodSchema: TestCasesLinkedToRequirementArgsSchema,
    purpose:
      "Retrieve test cases that have traceability links to a specific requirement. " +
      "This tool is essential for requirement traceability analysis, coverage verification, " +
      "and impact analysis when requirements change. You can get linked or unlinked test cases, " +
      "filter by release/cycle, and apply various other filters for comprehensive traceability reporting.",
    useCases: [
      "Get all test cases linked to a specific requirement for traceability analysis",
      "Find test cases that are NOT linked to a requirement (gap analysis)",
      "Verify requirement coverage by checking linked test cases",
      "Impact analysis - see which test cases are affected when a requirement changes",
      "Generate traceability matrix between requirements and test cases",
      "Filter linked test cases by release, cycle, or other criteria",
      "Audit requirement-test case relationships for compliance",
      "Identify orphaned test cases or requirements without proper links",
      "Plan test execution based on requirement-test case associations",
      "Quality assurance - ensure all requirements have adequate test coverage",
    ],
    examples: [
      {
        description: "Get all test cases linked to requirement ID 4791316",
        parameters: { rqID: 4791316 },
        expectedOutput:
          "List of test cases that are linked to requirement MAC-RQ-1011",
      },
      {
        description: "Get test cases NOT linked to requirement (gap analysis)",
        parameters: { rqID: 4791316, getLinked: false },
        expectedOutput:
          "List of test cases that are NOT linked to requirement MAC-RQ-1011",
      },
      {
        description: "Get linked test cases filtered by specific release",
        parameters: { rqID: 4791316, releaseID: "55178" },
        expectedOutput:
          "Linked test cases associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get linked test cases filtered by release and cycle",
        parameters: {
          rqID: 4791316,
          releaseID: "55178",
          cycleID: "111577",
          showEntityWithReleaseCycle: true,
        },
        expectedOutput: "Linked test cases in Release 8.12 and Cycle 8.12.1",
      },
      {
        description: "Get linked test cases from specific folder",
        parameters: {
          rqID: 4791316,
          tcFolderPath: "/Sample Template",
        },
        expectedOutput:
          "Linked test cases located in the '/Sample Template' folder",
      },
      {
        description: "Search linked test cases by entity key",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"string","value":"MAC-TC-1684,MAC-TC-1685","field":"entityKeyId"}]',
        },
        expectedOutput: "Linked test cases matching specific entity keys",
      },
      {
        description: "Filter linked test cases by priority",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1,2],"field":"priorityAlias"}]',
        },
        expectedOutput: "Linked test cases with High or Medium priority",
      },
      {
        description: "Filter linked test cases by status",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"list","value":[1,2],"field":"testCaseStateAlias"}]',
        },
        expectedOutput: "Linked test cases with Active or Review status",
      },
      {
        description: "Filter linked test cases by test case type",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1],"field":"testCaseTypeAlias"}]',
        },
        expectedOutput: "Linked functional test cases",
      },
      {
        description: "Filter linked test cases by testing type (automation)",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[2],"field":"testingTypeAlias"}]',
        },
        expectedOutput: "Linked automated test cases",
      },
      {
        description: "Get only parameterized linked test cases",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1],"field":"isParameterized"}]',
        },
        expectedOutput:
          "Linked test cases that are parameterized (data-driven)",
      },
      {
        description: "Filter linked test cases by archive status",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[0],"field":"isArchived"}]',
        },
        expectedOutput: "Active (non-archived) linked test cases",
      },
      {
        description: "Search linked test cases by summary content",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"string","value":"login","field":"summary"}]',
        },
        expectedOutput: "Linked test cases with 'login' in their summary",
      },
      {
        description: "Filter linked test cases by requirement version",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"string","value":"1","field":"rqVersion"}]',
        },
        expectedOutput: "Test cases linked to version 1 of the requirement",
      },
      {
        description:
          "Complex filter: Active, high priority, automated test cases",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"list","value":[0],"field":"isArchived"},{"type":"list","value":[1],"field":"priorityAlias"},{"type":"list","value":[2],"field":"testingTypeAlias"}]',
        },
        expectedOutput:
          "Active, high priority, automated test cases linked to requirement",
      },
    ],
    hints: [
      "This API requires a numeric rqID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID",
      "After resolving entityKey → rqID, call this tool with the resolved numeric rqID",
      "TRACEABILITY WORKFLOW: Use this tool to establish requirement-test case traceability matrix",
      "getLinked=true (default): Returns test cases that ARE linked to the requirement",
      "getLinked=false: Returns test cases that are NOT linked to the requirement (useful for gap analysis)",
      "showEntityWithReleaseCycle=true: Only show test cases that have the specified release and cycle",
      "showEntityWithReleaseCycle=false (default): Show all test cases regardless of release/cycle",
      "RELEASE/CYCLE FILTERING: Use string IDs, not numeric (e.g., releaseID: '55178', cycleID: '111577')",
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "tcFolderPath: Use empty string '' for root folder or specific path like '/Sample Template'",
      "FILTER CAPABILITIES: Support same filters as regular test case listing",
      "FILTER FIELDS: summary, rqVersion, priorityAlias, testCaseStateAlias, createdByAlias, testCaseTypeAlias, testingTypeAlias, release, cycle, isArchived, isParameterized, componentAlias, entityKeyId",
      "PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "STATUS IDs: Typically 1=Active, 2=Review, 3=Deprecated (verify with your QMetry instance)",
      "TYPE IDs: Typically 1=Functional, 2=Integration, 3=System (verify with your QMetry instance)",
      "TESTING TYPE IDs: Typically 1=Manual, 2=Automated (verify with your QMetry instance)",
      "PARAMETERIZED: 1=Yes (parameterized), 0=No (non-parameterized)",
      "ARCHIVED: 1=Archived, 0=Active (non-archived)",
      "Multiple filter conditions are combined with AND logic",
      "For entity key search, use comma-separated values: 'MAC-TC-1,MAC-TC-2,MAC-TC-3'",
      "This tool is crucial for compliance, traceability audits, and impact analysis",
      "Use getColumns=true to get column metadata for better result interpretation",
      "Pagination supported for large result sets (start, page, limit parameters)",
    ],
    outputFormat:
      "JSON object with test cases array, traceability information, and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
];
