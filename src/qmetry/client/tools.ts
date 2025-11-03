import type { ToolParams } from "../../common/types.js";
import { QMetryToolsHandlers } from "../config/constants.js";
import {
  BuildArgsSchema,
  CreateIssueArgsSchema,
  CreateTestCaseArgsSchema,
  CreateTestSuiteArgsSchema,
  ExecutionsByTestSuiteArgsSchema,
  IssuesLinkedToTestCaseArgsSchema,
  IssuesListArgsSchema,
  LinkedIssuesByTestCaseRunArgsSchema,
  LinkIssuesToTestcaseRunArgsSchema,
  LinkPlatformsToTestSuiteArgsSchema,
  LinkRequirementToTestCaseArgsSchema,
  LinkTestCasesToTestSuiteArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ProjectListArgsSchema,
  ReleasesCyclesArgsSchema,
  RequirementDetailsArgsSchema,
  RequirementListArgsSchema,
  RequirementsLinkedTestCasesToTestSuiteArgsSchema,
  RequirementsLinkedToTestCaseArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseExecutionsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseRunsByTestSuiteRunArgsSchema,
  TestCaseStepsArgsSchema,
  TestCasesByTestSuiteArgsSchema,
  TestCasesLinkedToRequirementArgsSchema,
  TestCaseVersionDetailsArgsSchema,
  TestSuiteListArgsSchema,
  TestSuitesForTestCaseArgsSchema,
  UpdateIssueArgsSchema,
  UpdateTestCaseArgsSchema,
  UpdateTestSuiteArgsSchema,
} from "../types/common.js";

export interface QMetryToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}

export const TOOLS: QMetryToolParams[] = [
  {
    title: "Fetch QMetry list Projects",
    summary:
      "Fetch QMetry projects list including projectID, name, projectKey, isArchived, viewIds and folderPath needed for other operations",
    handler: QMetryToolsHandlers.FETCH_PROJECTS,
    inputSchema: ProjectListArgsSchema,
    purpose:
      "Prerequisite tool that provides project list to user that associated to valid API Key. " +
      "The project key to fetch info for. Use 'default' if not specified. " +
      "Common project keys include 'UT', 'VT', 'MAC', etc. " +
      "If user doesn't specify a project key, this tool will use 'default' automatically.",
    useCases: [
      "Get project list to check user how many project access to particular apikey",
      "Retrieve available fields of each project list including projectID, name, projectKey, isArchived, viewIds and folderPath needed for other operations",
      "Validate project access and permissions",
    ],
    examples: [
      {
        description: "Get list of project available to user",
        parameters: {
          params: {
            showArchive: false,
          },
        },
        expectedOutput:
          "Project active/non archived list including some important fields like projectID, name, projectKey, isArchived, viewIds and folderPath needed for other operations",
      },
      {
        description: "Get projects with custom pagination",
        parameters: {
          params: {
            showArchive: false,
          },
          page: 1,
          limit: 10,
          start: 0,
        },
        expectedOutput: "List of projects with custom pagination settings",
      },
      {
        description: "Get not active/archived projects",
        parameters: {
          params: {
            showArchive: true,
          },
        },
        expectedOutput:
          "List of all projects including archived ones (showArchive: true sent in payload)",
      },
      {
        description: "Filter projects by name",
        parameters: {
          filter: '[{"value":"MAC","type":"string","field":"name"}]',
        },
        expectedOutput: "Filtered list of projects matching the name criteria",
      },
      {
        description: "Filter projects by project key",
        parameters: {
          filter: '[{"value":"MAC","type":"string","field":"projectKey"}]',
        },
        expectedOutput:
          "List of projects filtered by project key (e.g. 'MAC', 'UT', etc.)",
      },
    ],
    hints: [
      "Fetch list of projects available to user",
      "Use 'default' project key when user doesn't specify one",
      "Use params.showArchive: true/false to get archived/non-archived projects, default is false when not provided",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "Filter parameter should be a JSON string with filter criteria",
      "Common filter fields: 'name' (string), 'projectKey' (string)",
    ],
    outputDescription: "JSON object containing list of projects details",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Set QMetry Project Info",
    summary: "Set current QMetry project for your account",
    handler: QMetryToolsHandlers.SET_PROJECT_INFO,
    inputSchema: ProjectArgsSchema,
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
    outputDescription:
      "JSON object containing project configuration details, confirmation of project switch, and available project metadata",
    readOnly: false,
    idempotent: true,
  },
  {
    title: "Fetch QMetry Project Info",
    summary:
      "Fetch QMetry project information including viewId and folderPath needed for other operations",
    handler: QMetryToolsHandlers.FETCH_PROJECT_INFO,
    inputSchema: ProjectArgsSchema,
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
    outputDescription:
      "JSON object containing project details, viewIds, folderPaths, and project configuration",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Releases and Cycles",
    summary: "Fetch QMetry releases and cycles from the current project",
    handler: QMetryToolsHandlers.FETCH_RELEASES_CYCLES,
    inputSchema: ReleasesCyclesArgsSchema,
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
    outputDescription:
      "JSON object with project hierarchy containing releases and their associated cycles",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Builds",
    summary: "Fetch QMetry builds from the current project",
    handler: QMetryToolsHandlers.FETCH_BUILDS,
    inputSchema: BuildArgsSchema,
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
    outputDescription: "JSON object with builds list and pagination metadata",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Platforms",
    summary: "Fetch QMetry platforms from the current project",
    handler: QMetryToolsHandlers.FETCH_PLATFORMS,
    inputSchema: PlatformArgsSchema,
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
    outputDescription:
      "JSON object with platforms list and pagination metadata",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Create Test Case",
    summary:
      "Create a new test case in QMetry with steps, metadata, and release/cycle mapping.",
    handler: QMetryToolsHandlers.CREATE_TEST_CASE,
    inputSchema: CreateTestCaseArgsSchema,
    purpose:
      "Allows users to create a new test case in QMetry, including steps, custom fields, and release/cycle mapping. " +
      "Supports all major test case fields and step-level UDFs. " +
      "For fields like priority, owner, component, etc., fetch their valid values using the project info tool. " +
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info.",

    useCases: [
      "Create a basic test case with just a name and folder",
      "Add detailed steps with custom fields (UDFs) to a test case",
      "Associate test case with specific release/cycle for planning",
      "Set priority, owner, component, and other metadata using valid IDs from project info",
      "Create test cases for automation or manual testing types",
      "Add test case to a specific folder using tcFolderID",
      "Include estimated execution time and description",
      "Map test case to multiple cycles/releases",
    ],
    examples: [
      {
        description: "Create a test case in the root folder (auto-resolved)",
        parameters: {
          name: "Login Test Case",
        },
        expectedOutput:
          "Test case created in the root test case folder with ID and summary details",
      },
      {
        description: "Create a simple test case in folder 102653",
        parameters: {
          tcFolderID: "102653",
          name: "Login Test Case",
        },
        expectedOutput: "Test case created with ID and summary details",
      },
      {
        description: "Create a test case with steps and metadata",
        parameters: {
          tcFolderID: "102653",
          name: "Test Case 1",
          steps: [
            {
              orderId: 1,
              description: "First Step",
              inputData: "First Data",
              expectedOutcome: "First Outcome",
              UDF: {
                customField1: "Custom Field Data A",
                customField2: "Custom Field Data B",
              },
            },
          ],
          priority: 2025268,
          component: [2025328],
          testcaseOwner: 1467,
          testCaseState: 2025271,
          testCaseType: 2025282,
          estimatedTime: 10,
          description: "Description",
          testingType: 2025275,
          associateRelCyc: true,
          releaseCycleMapping: [
            {
              release: 14239,
              cycle: [21395],
              version: 1,
            },
          ],
        },
        expectedOutput: "Test case created with steps and metadata",
      },
    ],
    hints: [
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info (rootFolders.TC.id).",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found, skip the priority field (it is not required) and show a user-friendly message: 'Test case created without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case created without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case created without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case created without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case created without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case created without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Create test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the create payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case created without priority, as given priority is not available in the current project.'",
      "tcFolderID is required; use the root folder ID from project info or a specific folder.",
      "Steps are optional but recommended for manual test cases.",
      "If the user provides a prompt like 'create test case with steps as step 1 - Go to login page, step 2 - give credential, step 3 - go to test case page, step 4 - create test case', LLM should parse each step and convert it into the steps payload array, mapping each step to an object with orderId, description, and optionally inputData and expectedOutcome.",
      "Example mapping: 'step 1 - Go to login page' → { orderId: 1, description: 'Go to login page' }.",
      "LLM should increment orderId for each step, use the step text as description, and optionally infer inputData/expectedOutcome if provided in the prompt.",
      "Demo steps payload: steps: [ { orderId: 1, description: 'First Step', inputData: 'First Data', expectedOutcome: 'First Outcome', UDF: { customField1: 'Custom Field Data A', customField2: 'Custom Field Data B' } }, ... ]",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the test case, set associateRelCyc: true in the payload.",
      "If the user provides a release ID, map it from projects.releases[index].releaseID in the project info response, and use that ID in releaseCycleMapping.",
      "If the user provides both release and cycle IDs, validate both against the current project's releases and cycles; if valid, use them in releaseCycleMapping.",
      "When adding releaseCycleMapping, always include the 'version' field (usually set to 1) in each mapping object. The correct format is: { release: <releaseID>, cycle: [<cycleID>], version: 1 }. If 'version' is missing, the request will fail.",
      "If the user provides a release name, map it to its ID from project info; if a cycle name is provided, map it to its ID from the associated release's builds list.",
      "Example payload: releaseCycleMapping: [ { release: <releaseID>, cycle: [<cycleID>], version: 1 } ]",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Test case created without release/cycle association, as given release/cycle is not available in the current project.'",
      "All IDs (priority, owner, etc.) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
      "Estimated time is in minutes.",
      "Description and testingType are optional but recommended for clarity.",
    ],
    outputDescription:
      "JSON object containing the new test case ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Test Case",
    summary:
      "Update an existing QMetry test case by tcID and tcVersionID, with auto-resolution from entityKey.",
    handler: QMetryToolsHandlers.UPDATE_TEST_CASE,
    inputSchema: UpdateTestCaseArgsSchema,
    purpose:
      "Update a QMetry test case's metadata, steps, or other fields. " +
      "Requires tcID and tcVersionID, which can be auto-resolved from the test case entityKey using the test case list and version detail tools. " +
      "Supports updating summary, priority, owner, component, state, type, description, steps, and more. Only fields provided will be updated.",
    useCases: [
      "Update test case summary (name)",
      "Change priority, owner, or state of a test case",
      "Edit, add, or remove test steps",
      "Update only metadata (no steps)",
      "Bulk update using entityKey auto-resolution",
      "Modify test case description or estimated time",
      "Change test case type or component",
      "Update testing type or custom fields",
      "Update, add and remove test case steps",
    ],
    examples: [
      {
        description: "Update test case summary (updated name)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          name: "MAC Test11",
        },
        expectedOutput:
          "Test case summary updated. tcID and tcVersionID auto-resolved from entityKey. Only 'name' field changed.",
      },
      {
        description: "Update priority to High and owner to john.doe",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          priority: 505015,
          testcaseOwner: 6963,
        },
        expectedOutput:
          "Priority and owner updated. Field IDs auto-resolved from project info. tcID/tcVersionID resolved from entityKey.",
      },
      {
        description: "Update steps (edit, add, remove)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          steps: [
            {
              orderId: 1,
              description: "Step 22",
              inputData: "Input 22",
              expectedOutcome: "Outcome 22",
              tcStepID: 3014032,
            },
            {
              orderId: 2,
              description: "Step3",
              inputData: "Input 3",
              expectedOutcome: "Outcome 3",
            },
          ],
          removeSteps: [
            { tcStepID: 3014031, description: "Step 1", orderId: 1 },
          ],
          isStepUpdated: true,
        },
        expectedOutput:
          "Steps updated: Step 22 edited, Step3 added, Step 1 removed. tcID/tcVersionID auto-resolved.",
      },
      {
        description: "Update only metadata (no steps)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          updateOnlyMetadata: true,
          name: "New Name",
        },
        expectedOutput:
          "Metadata updated only. Steps unchanged. tcID/tcVersionID auto-resolved.",
      },
    ],
    hints: [
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID and tcVersionID.",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found, skip the priority field (it is not required) and show a user-friendly message: 'Test case updated without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case updated without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case updated without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case updated without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case updated without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case updated without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Update test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the update payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case updated without priority, as given priority is not available in the current project.'",
      "To update test case steps, use the following rules:",
      "- For steps to be added: omit tcStepID in the step object.",
      "- For steps to be updated: include tcStepID (from the existing step) in the step object.",
      "- For steps to be removed: add a full removeSteps object for each step to be deleted, matching the removeTestCaseStep interface.",
      "- Always set isStepUpdated: true if steps are added, updated, or removed.",
      "- Example: If user says 'Edit step 1 to say ...', find the tcStepID for step 1 and include it in the steps array with updated fields.",
      "- Example: If user says 'Add a new step after step 2', add a new object to steps array with no tcStepID.",
      "- Example: If user says 'Remove step 3', add the full step object to removeSteps array, including tcStepID and all required fields.",
      "- The payload should look like: { steps: [...], removeSteps: [...], isStepUpdated: true }.",
      "- If only metadata is updated (no steps), set updateOnlyMetadata: true and do not include steps/removeSteps.",
      "- Always increment orderId for new steps and preserve order for updates.",
      "- If user prompt is ambiguous, ask for clarification or show a user-friendly error.",
      "Steps are optional but recommended for manual test cases.",
      "If the user provides a prompt like 'update test case with steps as step 1 - Go to login page, step 2 - give credential, step 3 - go to test case page, step 4 - create test case', LLM should parse each step and convert it into the steps payload array, mapping each step to an object with orderId, description, and optionally inputData and expectedOutcome.",
      "Example mapping: 'step 1 - Go to login page' → { orderId: 1, description: 'Go to login page' }.",
      "LLM should increment orderId for each step, use the step text as description, and optionally infer inputData/expectedOutcome if provided in the prompt.",
      "Demo steps payload: steps: [ { orderId: 1, description: 'First Step', inputData: 'First Data', expectedOutcome: 'First Outcome', UDF: { customField1: 'Custom Field Data A', customField2: 'Custom Field Data B' } }, ... ]",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "All IDs (priority, owner, etc.) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
      "executionMinutes time is in minutes.",
      "Description and testingType are optional but recommended for clarity.",
    ],
    outputDescription:
      "JSON object containing the new test case ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Cases",
    summary:
      "Fetch QMetry test cases - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_TEST_CASES,
    inputSchema: TestCaseListArgsSchema,
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
    outputDescription:
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
    inputSchema: TestCaseDetailsArgsSchema,
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
    outputDescription:
      "JSON object with test case details including ID, key, summary, description, and metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Version Details",
    summary:
      "Get QMetry test case details for a specific version by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS,
    inputSchema: TestCaseVersionDetailsArgsSchema,
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
    outputDescription: "JSON object with version-specific test case details",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Steps",
    summary:
      "Get detailed test case steps for a specific test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_STEPS,
    inputSchema: TestCaseStepsArgsSchema,
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
    outputDescription:
      "JSON object with array of test steps including step description, expected result, and order",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Executions",
    summary: "Get execution records for a specific test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_EXECUTIONS,
    inputSchema: TestCaseExecutionsArgsSchema,
    purpose:
      "Retrieve execution history and results for a specific test case. " +
      "This tool provides detailed execution information including test suite names, platforms, " +
      "execution status, executed by, project, release, cycle, execution date, and test case versions.",
    useCases: [
      "Get execution history for a specific test case",
      "Retrieve test case execution results for reporting",
      "Filter executions by test suite, platform, or execution status",
      "Get execution data for test case analysis",
      "Monitor test case execution trends over time",
      "Filter executions by release, cycle, or execution date",
      "Get execution details for specific test case versions",
      "Audit test execution history for compliance",
      "Analyze test case execution performance across different environments",
      "Track test execution by specific users or teams",
    ],
    examples: [
      {
        description: "Get all executions for test case ID 1223922",
        parameters: { tcid: 1223922 },
        expectedOutput:
          "List of execution records for test case with execution details, status, and metadata",
      },
      {
        description: "Get executions for specific test case version",
        parameters: { tcid: 1223922, tcversion: 2 },
        expectedOutput: "Execution records for version 2 of the test case",
      },
      {
        description: "Filter executions by test suite and platform",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":"Sample Test Suite","type":"string","field":"testSuiteName"},{"value":[12345],"type":"list","field":"platformID"}]',
        },
        expectedOutput:
          "Filtered execution records matching test suite and platform criteria",
      },
      {
        description: "Filter executions by execution status",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":["PASS"],"type":"list","field":"executionStatus"}]',
        },
        expectedOutput: "Execution records with PASS status only",
      },
      {
        description: "Filter executions by release and cycle",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Execution records filtered by specific release and cycle",
      },
      {
        description: "Filter executions by date range",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":"2024-01-01","type":"date","field":"executedDate","comparison":"gt"},{"value":"2024-12-31","type":"date","field":"executedDate","comparison":"lt"}]',
        },
        expectedOutput: "Execution records within the specified date range",
      },
      {
        description: "Filter executions by user",
        parameters: {
          tcid: 1223922,
          filter: '[{"value":["john.doe"],"type":"list","field":"executedBy"}]',
        },
        expectedOutput: "Execution records executed by specific user",
      },
    ],
    hints: [
      "This API requires a numeric tcid parameter, not entity key",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with filter on entityKeyId to resolve the tcid",
      "After resolving entityKey → tcid, call this tool with the resolved numeric tcid",
      "tcversion parameter is optional - omit to get executions for all versions",
      "",
      "CRITICAL WORKFLOW FOR LINKED ISSUES: When user asks 'fetch linked issues of test case [ID]' or 'linked issues of execution':",
      "YOU MUST FIRST get the execution data using this tool to extract tcRunID before fetching issues!",
      "",
      "COMPLETE WORKFLOW FOR TEST CASE → LINKED ISSUES:",
      "STEP 1: Resolve Test Case ID (if needed) - Use FETCH_TEST_CASES if user provides entity key",
      "STEP 2: Fetch Test Case Executions (THIS TOOL) - Input: tcid, Extract: data[].tcRunID values",
      "STEP 3: Fetch Linked Issues - Tool: FETCH_LINKED_ISSUES_BY_TESTCASE_RUN, Input: entityId = tcRunID",
      "",
      "ID MAPPING CRITICAL UNDERSTANDING:",
      "- tcid/tcID = Test Case ID (for getting execution data with this tool)",
      "- tcRunID = Test Case Run/Execution ID (THIS is entityId for linked issues API)",
      "- entityId = tcRunID (what the linked issues API actually needs)",
      "",
      "NEVER USE tcid DIRECTLY as entityId for linked issues!",
      "ALWAYS get tcRunID from executions and use THAT as entityId!",
      "",
      "EXAMPLE RESPONSE STRUCTURE FROM THIS TOOL:",
      '{ "data": [{ "tcRunID": 58312120, "testSuiteName": "Suite 1", "executionStatus": "PASS" }] }',
      "→ Use tcRunID (58312120) as entityId for linked issues API",
      "",
      "FILTER CAPABILITIES: Support extensive filtering by test suite, platform, status, user, release, cycle, dates, and archive status",
      "FILTER FIELDS: testSuiteName (string), platformID (list), executionStatus (list), executedBy (list), project (list), release (list), cycle (list), executedDate (date with comparison), isPlatformArchived (list), isTestSuiteArchived (list), executedVersion (numeric)",
      "DATE FILTERING: Use 'gt' (greater than) and 'lt' (less than) comparisons for executedDate field",
      "EXECUTION STATUS: Common values include 'PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED', 'WIP' (verify with your QMetry instance)",
      "PLATFORM/SUITE ARCHIVE: Use [1,0] for both archived and non-archived, [1] for archived only, [0] for active only",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large execution result sets (start, page, limit parameters)",
      "Get platform IDs from FETCH_PLATFORMS tool and release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool",
      "This tool is essential for test execution reporting, trend analysis, and compliance auditing",
      "Execution data includes timestamps, user information, environment details, and test results",
      "Use scope parameter to define retrieval context (project, folder, release, cycle)",
    ],
    outputDescription:
      "JSON object with executions array containing execution records, status, timestamps, and metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Requirements",
    summary:
      "Fetch QMetry requirements - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS,
    inputSchema: RequirementListArgsSchema,
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
    outputDescription:
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
    inputSchema: RequirementDetailsArgsSchema,
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
    outputDescription:
      "JSON object with requirement details including ID, key, summary, description, status, and all metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Requirements to Testcase",
    summary:
      "Link one or more requirements to a test case by entityKey and version IDs.",
    handler: QMetryToolsHandlers.LINK_REQUIREMENT_TO_TESTCASE,
    inputSchema: LinkRequirementToTestCaseArgsSchema,
    purpose:
      "Link requirements to a test case using the test case entityKey, version ID, and requirement version IDs. " +
      "This tool enables traceability and coverage mapping between requirements and test cases.",
    useCases: [
      "Link requirements to a test case for traceability",
      "Bulk link multiple requirements to a single test case",
      "Automate requirement coverage mapping",
    ],
    examples: [
      {
        description: "Link requirements to test case VT-TC-26",
        parameters: {
          tcID: "VT-TC-26",
          tcVersionId: 5448515,
          rqVersionIds: "5009939,5009937,4970699",
        },
        expectedOutput:
          "Requirements linked to test case VT-TC-26 successfully.",
      },
    ],
    hints: [
      "To get the tcID, call the Testcase/Fetch List for Bulk Operation API and use data[<index>].entityKey.",
      "To get the tcVersionId, call the Testcase/Fetch Versions API and use data[<index>].tcVersionID.",
      "To get the rqVersionIds, call the requirement/List Versions API and use data[<index>].rqVersionID.",
      "If user provides requirement entityKey (e.g., VT-RQ-18), first call requirements list with a filter on entityKeyId to resolve the rqVersionIds",
      "If user provides testcase entityKey (e.g., VT-TC-26), first call testcase list with a filter on entityKeyId to resolve the tcVersionId and tcID.",
      "rqVersionIds must be a comma-separated string of requirement version IDs.",
    ],
    outputDescription: "JSON object with success status and linkage details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Cases Linked to Requirement",
    summary:
      "Get test cases that are linked (or not linked) to a specific requirement in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT,
    inputSchema: TestCasesLinkedToRequirementArgsSchema,
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
    outputDescription:
      "JSON object with test cases array, traceability information, and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Requirements Linked to Test Case",
    summary:
      "Get requirements that are linked (or not linked) to a specific test case in QMetry",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS_LINKED_TO_TESTCASE,
    inputSchema: RequirementsLinkedToTestCaseArgsSchema,
    purpose:
      "Retrieve requirements that have traceability links to a specific test case. " +
      "This tool is essential for test case traceability analysis, coverage verification, " +
      "and impact analysis when test cases change. You can get linked or unlinked requirements, " +
      "filter by various criteria for comprehensive traceability reporting.",
    useCases: [
      "Get all requirements linked to a specific test case for traceability analysis",
      "Find requirements that are NOT linked to a test case (gap analysis)",
      "Verify test case coverage by checking linked requirements",
      "Impact analysis - see which requirements are affected when a test case changes",
      "Generate traceability matrix between test cases and requirements",
      "Filter linked requirements by various criteria",
      "Audit test case-requirement relationships for compliance",
      "Identify orphaned requirements or test cases without proper links",
      "Plan requirement validation based on test case-requirement associations",
      "Quality assurance - ensure all test cases have proper requirement coverage",
    ],
    examples: [
      {
        description: "Get all requirements linked to test case ID 594294",
        parameters: { tcID: 594294 },
        expectedOutput:
          "List of requirements that are linked to test case MAC-TC-1684",
      },
      {
        description: "Get requirements NOT linked to test case (gap analysis)",
        parameters: { tcID: 594294, getLinked: false },
        expectedOutput:
          "List of requirements that are NOT linked to test case MAC-TC-1684",
      },
      {
        description: "Get linked requirements from specific folder",
        parameters: {
          tcID: 594294,
          rqFolderPath: "/CodeSnippets",
        },
        expectedOutput:
          "Linked requirements located in the '/CodeSnippets' folder",
      },
      {
        description: "Search linked requirements by entity key",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"string","value":"MAC-RQ-730,MAC-RQ-731","field":"entityKeyId"}]',
        },
        expectedOutput: "Linked requirements matching specific entity keys",
      },
      {
        description: "Filter linked requirements by status",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"list","value":[1,2],"field":"requirementStateAlias"}]',
        },
        expectedOutput: "Linked requirements with Open or Approved status",
      },
      {
        description: "Filter linked requirements by priority",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"list","value":[1],"field":"priorityAlias"}]',
        },
        expectedOutput: "Linked requirements with High priority",
      },
      {
        description: "Filter linked requirements by archive status",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"list","value":[0],"field":"isArchived"}]',
        },
        expectedOutput: "Active (non-archived) linked requirements",
      },
      {
        description: "Search linked requirements by name content",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"string","value":"authentication","field":"name"}]',
        },
        expectedOutput:
          "Linked requirements with 'authentication' in their name",
      },
      {
        description: "Filter linked requirements by test case version",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"string","value":"1","field":"tcVersion"}]',
        },
        expectedOutput: "Requirements linked to version 1 of the test case",
      },
      {
        description: "Filter linked requirements by release and cycle",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"list","value":[55178],"field":"release"},{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput: "Linked requirements in Release 8.12 and Cycle 8.12.1",
      },
    ],
    hints: [
      "This API requires a numeric tcID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with filter on entityKeyId to resolve the numeric tcID",
      "After resolving entityKey → tcID, call this tool with the resolved numeric tcID",
      "TRACEABILITY WORKFLOW: Use this tool to establish test case-requirement traceability matrix",
      "getLinked=true (default): Returns requirements that ARE linked to the test case",
      "getLinked=false: Returns requirements that are NOT linked to the test case (useful for gap analysis)",
      "rqFolderPath: Use empty string '' for root folder or specific path like '/CodeSnippets'",
      "FILTER CAPABILITIES: Support same filters as regular requirement listing",
      "FILTER FIELDS: name, entityKeyId, requirementStateAlias, priorityAlias, createdByAlias, tcVersion, release, cycle, isArchived, componentAlias",
      "Multiple filter conditions are combined with AND logic",
      "For entity key search, use comma-separated values: 'MAC-RQ-1,MAC-RQ-2,MAC-RQ-3'",
      "This tool is crucial for compliance, traceability audits, and impact analysis",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "Use this tool to verify that test cases properly cover requirements",
      "Essential for requirement validation and test case completeness analysis",
    ],
    outputDescription:
      "JSON object with requirements array, traceability information, and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Create Test Suite",
    summary:
      "Create a new test suite in QMetry with metadata and release/cycle mapping.",
    handler: QMetryToolsHandlers.CREATE_TEST_SUITE,
    inputSchema: CreateTestSuiteArgsSchema,
    purpose:
      "Allows users to create a new test suite in QMetry, including metadata and release/cycle mapping. " +
      "Supports all major test suite fields. " +
      "For fields like testsuiteOwner, testSuiteState, etc., fetch their valid values using the project info tool. " +
      "If parentFolderId is not provided, it will be auto-resolved to the root test suite folder using project info.",

    useCases: [
      "Create a basic test suite with just a name and folder",
      "Add detailed like description to a test suite",
      "Associate test suite with specific release/cycle for planning",
      "Set testsuiteOwner, testSuiteState, and other metadata using valid IDs from project info",
      "Create test suites for isAutomatedFlag true or false for automated or manual types, default is false",
      "Add test suite to a specific folder using parentFolderId",
      "Map test suite to multiple cycles/releases and build ID",
    ],
    examples: [
      {
        description: "Create a test suite in the root folder (auto-resolved)",
        parameters: {
          name: "Demo Test Suite",
        },
        expectedOutput:
          "Test suite created in the root test suite folder with ID and summary details",
      },
      {
        description: "Create a simple test suite in folder 102653",
        parameters: {
          parentFolderId: "102653",
          name: "Login Test Suite",
        },
        expectedOutput: "Test suite created with ID and summary details",
      },
      {
        description: "Create a test suite with some details and metadata",
        parameters: {
          parentFolderId: "113557",
          isAutomatedFlag: false,
          name: "Testsuite Summary",
          description: "desc",
          testsuiteOwner: 6963,
          testSuiteState: 505035,
          associateRelCyc: true,
          releaseCycleMapping: [
            {
              buildID: 18411,
              releaseId: 10286,
            },
          ],
        },
        expectedOutput:
          "Test suite created with details and metadata. Example uses: parentFolderId=113557 (MAC root TS folder from rootFolders.TS.id), testsuiteOwner=6963 (umang.savaliya from customListObjs.owner[index].id), testSuiteState=505035 (New from customListObjs.testSuiteState[index].id), releaseId=10286 (Air release from projects[index].releases[index].releaseID), buildID=18411 (Air Q1-19 cycle from projects[index].releases[index].builds[index].buildID)",
      },
    ],
    hints: [
      "If parentFolderId is not provided, it will be auto-resolved to the root test suite folder using project info (rootFolders.TS.id).",
      "To get valid values for testsuiteOwner, testSuiteState, etc., call the 'Admin/Get info Service' API (FETCH_PROJECT_INFO tool) and use the returned customListObjs IDs.",
      "CRITICAL: For testsuiteOwner mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.owner[<index>].id. Match the user by customListObjs.owner[<index>].name.",
      "If the user provides an owner name (testsuiteOwner), fetch project info, find the matching owner in customListObjs.owner[index].name or customListObjs.owner[index].uniqueLabel, and use its ID in the payload as testsuiteOwner. If the name is not found, skip the testsuiteOwner field (it is not required) and show a user-friendly message: 'Test suite created without owner, as given owner is not available in the current project.'",
      "CRITICAL: For testSuiteState mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.testSuiteState[<index>].id. Match the state by customListObjs.testSuiteState[<index>].name.",
      "If the user provides a test suite state name(testSuiteState), fetch project info, find the matching state in customListObjs.testSuiteState[index].name, and use its ID in the payload as testSuiteState. If the name is not found, skip the testSuiteState field (it is not required) and show a user-friendly message: 'Test suite created without test suite state, as given state is not available in the current project.'",
      "parentFolderId is required; use the root folder ID from project info (rootFolders.TS.id) or a specific folder.",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the test suite, set associateRelCyc: true in the payload.",
      "CRITICAL: For releaseCycleMapping.releaseId - Call API 'Release/List' (or use project info projects[<index>].releases[<index>].releaseID), from the response get value from data[<index>].releaseID or projects[<index>].releases[<index>].releaseID. Match the release by name.",
      "CRITICAL: For releaseCycleMapping.buildID - Call API 'Cycle/List' (or use project info projects[<index>].releases[<index>].builds[<index>].buildID), from the response get value from data[<index>].buildID or projects[<index>].releases[<index>].builds[<index>].buildID. Match the build/cycle by name.",
      "If the user provides a release name, map it to its ID from projects[<index>].releases[<index>].releaseID in the project info response, and use that ID as releaseId in releaseCycleMapping.",
      "If the user provides a build/cycle name, map it to its ID from projects[<index>].releases[<index>].builds[<index>].buildID in the project info response, and use that ID as buildID in releaseCycleMapping.",
      "Example payload: releaseCycleMapping: [ { releaseId: <releaseID>, buildID: <buildID> } ]",
      "Example: For 'Air' release and 'Air Q1-19' cycle in MAC project, use releaseId: 10286 and buildID: 18411",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Test suite created without release/cycle association, as given release/cycle is not available in the current project.'",
      "All IDs (testSuiteState from customListObjs.testSuiteState[index].id, testsuiteOwner from customListObjs.owner[index].id, releaseId from projects.releases[index].releaseID, buildID from projects.releases.builds[index].buildID) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
    ],
    outputDescription:
      "JSON object containing the new test suite ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Test Suite",
    summary:
      "Update an existing QMetry test suite by id(testsuite numeric id), with auto-resolution from entityKey.",
    handler: QMetryToolsHandlers.UPDATE_TEST_SUITE,
    inputSchema: UpdateTestSuiteArgsSchema,
    purpose:
      "Update a QMetry test suite's metadata, description, or other fields. " +
      "Requires id(testsuite numeric id),  which can be auto-resolved from the test suite entityKey using the test suite list tools. " +
      "Supports updating name, description, owner, state, and more. Only fields provided will be updated.",
    useCases: [
      "Update test suite summary (name)",
      "Change owner, or state of a test suite",
      "Bulk update using entityKey auto-resolution",
      "Modify test suite description",
    ],
    examples: [
      {
        description: "Update test suite summary (updated name)",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          name: "MAC Test11",
        },
        expectedOutput:
          "Test suite summary updated. Only 'name' field changed. Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved. from the project info. info on rootFolders.TS.id.",
      },
      {
        description: "Update state to Open and owner of the test suite",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          testSuiteState: 505036,
          testsuiteOwner: 6963,
        },
        expectedOutput:
          "State and owner updated. Example uses: testSuiteState=505036 (Open from customListObjs.testSuiteState[index].id), testsuiteOwner=6963 (umang.savaliya from customListObjs.owner[index].id). Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved from the project info rootFolders.TS.id.",
      },
      {
        description: "Update only description of the test suite",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          description: "Updated description for the test suite.",
        },
        expectedOutput:
          "description updated only. Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved. from the project info. info on rootFolders.TS.id.",
      },
    ],
    hints: [
      "If user provides entityKey (e.g., MAC-TS-7), first call Fetch Test Suites with a filter on entityKeyId to resolve the id (test suite numeric id) and TsFolderID from rootFolders.TS.id.",
      "To get valid values for owner, state, etc., call the 'Admin/Get info Service' API (FETCH_PROJECT_INFO tool) and use the returned customListObjs IDs.",
      "CRITICAL: For testsuiteOwner mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.owner[<index>].id. Match the user by customListObjs.owner[<index>].name.",
      "If the user provides an owner name, fetch project info, find the matching user in customListObjs.owner[index].name, and use its ID in the payload as testsuiteOwner. If the name is not found, skip the testsuiteOwner field (it is not required) and show a user-friendly message: 'Test suite updated without owner, as given owner is not available in the current project.'",
      "CRITICAL: For testSuiteState mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.testSuiteState[<index>].id. Match the state by customListObjs.testSuiteState[<index>].name.",
      "If the user provides a test suite state name, fetch project info, find the matching state in customListObjs.testSuiteState[index].name, and use its ID in the payload as testSuiteState. If the name is not found, skip the testSuiteState field (it is not required) and show a user-friendly message: 'Test suite updated without test suite state, as given state is not available in the current project.'",
      "If either owner or state is not found in project info, the update for that field will be skipped and a user-friendly message will be shown to the user.",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "All IDs (testSuiteState from customListObjs.testSuiteState[index].id, testsuiteOwner from customListObjs.owner[index].id) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
    ],
    outputDescription:
      "JSON object containing the new test suite ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Suites",
    summary:
      "Fetch QMetry test suites - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_TEST_SUITES,
    inputSchema: TestSuiteListArgsSchema,
    purpose:
      "Get test suites from QMetry. System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all test suites in a project",
      "Search for specific test suites using filters",
      "Browse test suites in specific folders",
      "Get paginated test suite results",
    ],
    examples: [
      {
        description:
          "Get all test suites from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of test suites from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all test suites from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of test suites from UT project using UT's specific TS viewId",
      },
      {
        description:
          "Get test suites with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 103097, folderPath: "" },
        expectedOutput: "Test suites using manually specified viewId 103097",
      },
      {
        description:
          "List test suites from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId: "fetch specific project given projectKey Test Suite ViewId",
          folderPath: "",
        },
        expectedOutput:
          "Test suites using manually specified viewId 103097 or projectKey",
      },
      {
        description: "Get test suites by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Test suites associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test suites by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All test suites associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get test suites by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All test suites associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific test suite by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TS-1684","field":"entityKeyId"}]',
        },
        expectedOutput: "Test suites matching the entity key criteria",
      },
      {
        description:
          "Search for multiple test suites by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TS-1684,MAC-TS-1685,MAC-TS-1686","field":"entityKeyId"}]',
        },
        expectedOutput: "Test suites matching any of the specified entity keys",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and test suite fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.TS.viewId",
      "Step 3: Use the SAME projectKey and the extracted TS viewId for fetching test suites",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and test suite fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by test suite key (like MAC-TS-1684), use filter: \'[{"type":"string","value":"MAC-TS-1684","field":"entityKeyId"}]\'',
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: name, release, cycle, platform, isArchived, testsuiteStatus, createdByAlias, createdDate, entityKeyId, attachmentCount, linkedPlatformCount, linkedTcCount, updatedByAlias, updatedDate, owner, remExecutionTime, and totalExecutionTime",
      "SORT FIELDS: entityKey, name, testsuiteStatus, linkedPlatformCount, linkedTcCount, createdDate, createdByAlias, updatedDate, updatedByAlias, attachmentCount, remExecutionTime, and totalExecutionTime",
      "For multiple entity keys, use comma-separated values in filter",
      "Use empty string '' as folderPath for root directory",
    ],
    outputDescription:
      "JSON object with 'data' array containing test suites and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Test Suites for Test Case",
    summary:
      "Get test suites that can be linked to test cases in QMetry with automatic viewId resolution",
    handler: QMetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE,
    inputSchema: TestSuitesForTestCaseArgsSchema,
    purpose:
      "Retrieve test suites available for linking with test cases. " +
      "This tool helps organize test cases into test suites for better test management, " +
      "execution planning, and reporting. You can filter test suites by various criteria " +
      "to find the most appropriate suites for test case organization. " +
      "The tsFolderID parameter is required and represents the Test Suite folder ID. " +
      "The viewId parameter is automatically resolved from project info (latestViews.TSFS.viewId) " +
      "if not provided, making the tool easier to use.",
    useCases: [
      "Get test suites available for linking with test cases",
      "Find appropriate test suites for test case organization",
      "Browse test suites in specific folders for better management",
      "Filter test suites by release, cycle, or archive status",
      "Organize test execution by grouping test cases into test suites",
      "Plan test suite structure for comprehensive test coverage",
      "Manage test case categorization for reporting purposes",
      "Search for existing test suites before creating new ones",
      "Get root test suite folder contents using project info",
    ],
    examples: [
      {
        description:
          "Get test suites from root folder using auto-resolved viewId",
        parameters: { tsFolderID: 113557 },
        expectedOutput:
          "List of test suites available in the root test suite folder with auto-resolved viewId",
      },
      {
        description:
          "Get test suites with custom pagination and auto-resolved viewId",
        parameters: { tsFolderID: 113557, page: 1, limit: 20 },
        expectedOutput: "Paginated list of test suites with 20 items per page",
      },
      {
        description: "Filter test suites by release with auto-resolved viewId",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"type":"list","value":[55178],"field":"release"}]',
        },
        expectedOutput: "Test suites associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Filter test suites by cycle with auto-resolved viewId",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput: "Test suites associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get only active (non-archived) test suites",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of active test suites (not archived)",
      },
      {
        description: "Filter test suites by release and cycle",
        parameters: {
          tsFolderID: 113557,
          filter:
            '[{"type":"list","value":[55178],"field":"release"},{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput:
          "Test suites associated with both Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test suites with column information",
        parameters: { tsFolderID: 113557, getColumns: true },
        expectedOutput:
          "Test suites list with detailed column metadata for better interpretation",
      },
      {
        description:
          "Search test suites from specific sub-folder with manual viewId",
        parameters: { tsFolderID: 42, viewId: 104316 },
        expectedOutput:
          "Test suites available in specific folder ID 42 for test case linking",
      },
    ],
    hints: [
      "CRITICAL: tsFolderID is REQUIRED - Test Suite folder ID will be auto-resolved if not provided",
      "viewId will be AUTOMATICALLY RESOLVED from project info if not provided",
      "HOW TO GET tsFolderID:",
      "1. Call FETCH_PROJECT_INFO tool first to get project configuration",
      "2. From the response, use rootFolders.TS.id for the root test suite folder",
      "3. Example: rootFolders.TS.id = 113557 (MAC project root TS folder)",
      "4. If user doesn't specify tsFolderID, automatically use rootFolders.TS.id from project info",
      "VIEWID AUTO-RESOLUTION:",
      "1. System automatically fetches project info using the projectKey",
      "2. Extracts latestViews.TSFS.viewId automatically",
      "3. Example: latestViews.TSFS.viewId = 104316 (MAC project TSFS view)",
      "4. Manual viewId only needed if you want to override the automatic resolution",
      "WORKFLOW: System automatically handles project info if tsFolderID or viewId is not provided",
      "PROJECT INFO STRUCTURE: clientData.rootFolders.TS.id contains the root test suite folder ID",
      "PROJECT INFO STRUCTURE: latestViews.TSFS.viewId contains the test suite folder view ID",
      "For sub-folders: Use specific folder IDs if you know them, or call folder listing APIs",
      "FILTER CAPABILITIES: Same as other QMetry list operations",
      "FILTER FIELDS: release, cycle, isArchived, name, status, priority",
      "RELEASE/CYCLE FILTERING: Use numeric IDs in list format (get from FETCH_RELEASES_AND_CYCLES)",
      "ARCHIVE FILTERING: 0=Active, 1=Archived",
      "getColumns=true provides additional metadata for result interpretation",
      "Multiple filter conditions are combined with AND logic",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "This tool helps organize test cases into logical test suites",
      "Essential for test execution planning and test case management",
      "Use this before creating new test suites to check existing ones",
    ],
    outputDescription:
      "JSON object with test suites array and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Test Cases to Test Suite",
    summary: "Link test cases to a test suite in QMetry.",
    handler: QMetryToolsHandlers.LINK_TESTCASES_TO_TESTSUITE,
    inputSchema: LinkTestCasesToTestSuiteArgsSchema,
    purpose:
      "Link one or more test cases to a test suite. " +
      "Requires tcvdIDs, which can be auto-resolved from the test case entityKey using the test case list and version detail tools. " +
      "Supports direct test case linkage.",
    useCases: [
      "Link test cases to a test suite by entity keys",
      "Bulk link multiple test cases to a suite",
      "Automate test suite composition from test cases",
    ],
    examples: [
      {
        description: "Link test cases to a test suite",
        parameters: {
          tsID: 8674,
          tcvdIDs: [5448504, 5448503],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases QTM-TC-32 and QTM-TC-35 linked to test suite 8674.",
      },
      {
        description:
          "Link test cases directly to test suites with test cases entityKeys VT-TC-9, VT-TC-10 to test suite id 1487397",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases VT-TC-9 and VT-TC-10 linked to test suite 1487397.",
      },
      {
        description:
          "Link test case VT-TC-4, VT-TC-1,VT-TC-101, VT-TC-22 to test suite VT-TS-3",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503, 5448505, 5448506],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases VT-TC-4, VT-TC-1, VT-TC-101, and VT-TC-22 linked to test suite VT-TS-3.",
      },
    ],
    hints: [
      "To get the tsID, call the Fetch Test Suites for Test Case API with rootFolderId otherwise if given folderid so use that and from response get the id.",
      "To get the tcvdIDs by testcase entityKey, call the Testcase/Fetch Versions API and use data[<index>].tcVersionID.",
      "Set fromReqs to false to direct test case linkage.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Requirements Linked Test Cases to Test Suite",
    summary:
      "Link test cases (including those linked to requirements) to a test suite in QMetry.",
    handler: QMetryToolsHandlers.REQUIREMENTS_LINKED_TESTCASES_TO_TESTSUITE,
    inputSchema: RequirementsLinkedTestCasesToTestSuiteArgsSchema,
    purpose:
      "Link one or more test cases to a test suite. " +
      "Requires tcvdIDs, which can be auto-resolved from the Fetch Test Cases Linked to Requirement API by <requirementEntityKey> to fetch If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID and get the linked test cases version ids from the tools." +
      "Supports requirement-based test case linkage.",
    useCases: [
      "Link requirements linked test cases to a test suite",
      "Bulk link multiple requirements linked test cases to a suite",
      "Automate test suite composition from requirements linked test cases",
    ],
    examples: [
      {
        description: "VT-RQ-18 Requirements Linked test cases to a test suite",
        parameters: { tsID: 8674, tcvdIDs: [5448504, 5448503], fromReqs: true },
        expectedOutput:
          "Test cases QTM-TC-32 and QTM-TC-35 linked to test suite 8674.",
      },
      {
        description:
          "VT-RQ-19 Requirements Linked test cases to test suites id 1487397",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: true,
        },
        expectedOutput:
          "Test cases VT-TC-9 and VT-TC-10 linked to test suite 1487397.",
      },
      {
        description:
          "VT-RQ-20 Requirements Linked test case to test suite VT-TS-3",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503, 5448505, 5448506],
          fromReqs: true,
        },
        expectedOutput:
          "Test cases VT-TC-4, VT-TC-1, VT-TC-101, and VT-TC-22 linked to test suite VT-TS-3.",
      },
    ],
    hints: [
      "To get the tsID, call the Fetch Test Suites for Test Case API with rootFolderId otherwise if given folderid so use that and from response get the id.",
      "To get the requirement linked tcvdIDs by requirement entityKey, call the Fetch Test Cases Linked to Requirement API by <requirementEntityKey> to fetch If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID and get the linked test cases version ids.",
      "Set fromReqs to true to link requirements linked test cases instead of direct test case linkage.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Link Platforms to Test Suite",
    summary: "Link one or more platforms to a QMetry Test Suite.",
    handler: QMetryToolsHandlers.LINK_PLATFORMS_TO_TESTSUITE,
    inputSchema: LinkPlatformsToTestSuiteArgsSchema,
    purpose:
      "Associate testing platforms (browsers, OS, devices, or environments) with a specific Test Suite. " +
      "This enables tracking which platforms a test suite should be executed on and helps organize test execution across different environments.",
    useCases: [
      "Link a single platform to a test suite",
      "Link multiple platforms to a test suite for cross-platform testing",
      "Define execution environments for a test suite",
      "Organize test suites by supported platforms",
      "Set up platform-specific test suite configurations",
    ],
    examples: [
      {
        description: "Link single platform to a test suite",
        parameters: {
          qmTsId: 1511970,
          qmPlatformId: "63004",
        },
        expectedOutput:
          "Platform 63004 linked to test suite 1511970 successfully.",
      },
      {
        description: "Link multiple platforms to a test suite",
        parameters: {
          qmTsId: 1511970,
          qmPlatformId: "63004,63005,63006",
        },
        expectedOutput:
          "Platforms 63004, 63005, 63006 linked to test suite 1511970 successfully.",
      },
    ],
    hints: [
      "CRITICAL: qmTsId and qmPlatformId are REQUIRED parameters",
      "To get the qmTsId (Test Suite ID):",
      "  1. Call 'Testsuite/Fetch Testsuite' API",
      "  2. From response, use data[<index>].id",
      "  3. Example: Test Suite 'Login Tests' might have ID 1511970",
      "To get the qmPlatformId (Platform ID):",
      "  1. Call 'Platform/List' API (Fetch Platforms tool)",
      "  2. From response, use data[<index>].platformID",
      "  3. Example: Platform 'Chrome' might have ID 63004",
      "qmPlatformId accepts comma-separated values for multiple platforms",
      "Format for multiple platforms: '63004,63005,63006'",
      "No spaces in the comma-separated list",
      "If test suite entity key (e.g., VT-TS-12) is provided, first fetch test suites to resolve numeric ID",
      "Platforms represent browsers, operating systems, devices, or custom environments",
      "This tool helps organize cross-platform test execution",
      "Essential for comprehensive platform coverage testing",
    ],
    outputDescription:
      "JSON object with linkage status, success message, and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Issues Linked to Test Case",
    summary:
      "Get issues that are linked (or not linked) to a specific test case in QMetry",
    handler: QMetryToolsHandlers.FETCH_ISSUES_LINKED_TO_TESTCASE,
    inputSchema: IssuesLinkedToTestCaseArgsSchema,
    purpose:
      "Retrieve issues/defects that are linked to a specific test case. " +
      "This tool provides traceability between test cases and issues, helping with " +
      "defect tracking, impact analysis, and test case validation. " +
      "The getLinked parameter is optional and defaults to true for fetching linked issues.",
    useCases: [
      "Get all issues linked to a specific test case for defect tracking",
      "Find issues that are NOT linked to a test case (gap analysis)",
      "Generate traceability reports between test cases and issues",
      "Filter issues by type, priority, status, or owner",
      "Monitor issue resolution progress for specific test cases",
      "Audit issue-test case relationships for compliance",
      "Filter issues by summary content or execution version",
      "Get issue details for test execution planning",
      "Track linkage level (Test Case vs Test Step level)",
      "Quality assurance - ensure proper issue tracking",
    ],
    examples: [
      {
        description:
          "Get all issues linked to test case ID 4495658 (default behavior)",
        parameters: { tcID: 4495658 },
        expectedOutput:
          "List of issues linked to the test case with issue details, status, and metadata",
      },
      {
        description: "Get all issues linked to test case ID 4495658 (explicit)",
        parameters: { tcID: 4495658, getLinked: true },
        expectedOutput:
          "List of issues linked to the test case with issue details, status, and metadata",
      },
      {
        description: "Get issues NOT linked to test case (gap analysis)",
        parameters: { tcID: 4495658, getLinked: false },
        expectedOutput: "List of issues that are NOT linked to the test case",
      },
      {
        description: "Get linked issues with pagination",
        parameters: { tcID: 4495658, getLinked: true, limit: 25, page: 1 },
        expectedOutput: "Paginated list of issues linked to the test case",
      },
      {
        description:
          "Filter linked issues by summary content (using default getLinked=true)",
        parameters: {
          tcID: 4495658,
          filter: '[{"value":"login","type":"string","field":"summary"}]',
        },
        expectedOutput:
          "Issues linked to test case that contain 'login' in their summary",
      },
      {
        description: "Filter linked issues by status and priority",
        parameters: {
          tcID: 4495658,
          getLinked: true,
          filter:
            '[{"value":[1,2],"type":"list","field":"issueState"},{"value":[1],"type":"list","field":"issuePriority"}]',
        },
        expectedOutput: "High priority issues in Open or In Progress status",
      },
      {
        description: "Filter issues by execution version",
        parameters: {
          tcID: 4495658,
          getLinked: true,
          filter: '[{"value":"2","type":"string","field":"executedVersion"}]',
        },
        expectedOutput: "Issues linked to version 2 of the test case execution",
      },
    ],
    hints: [
      "CRITICAL: tcID parameter is REQUIRED - this is the Test Case numeric ID",
      "getLinked parameter is OPTIONAL - defaults to true if not provided",
      "HOW TO GET tcID:",
      "1. Call FETCH_TEST_CASES with filter on entityKeyId to resolve test case key to numeric ID",
      "2. From response, use data[index].tcID field",
      "3. Example: MAC-TC-1684 → tcID: 4495658",
      "getLinked=true (default): Returns issues that ARE linked to the test case",
      "getLinked=false: Returns issues that are NOT linked to the test case (useful for gap analysis)",
      "If getLinked is not specified, it defaults to true (linked issues)",
      "FILTER CAPABILITIES: Extensive filtering by issue properties",
      "FILTER FIELDS: summary (string), executedVersion (string), linkageLevel (string), issueType (list), issuePriority (list), issueState (list), owner (list)",
      "LINKAGE LEVEL: 'Test Case' for test case level links, 'Test Step' for step level links",
      "ISSUE TYPE IDs: Typically 1=Bug, 2=Enhancement, 3=Task (verify with your QMetry instance)",
      "ISSUE PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "ISSUE STATUS IDs: Typically 1=Open, 2=In Progress, 3=Resolved, 4=Closed (verify with your QMetry instance)",
      "OWNER IDs: Use numeric user IDs from QMetry user management",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large issue result sets (start, page, limit parameters)",
      "This tool is essential for defect tracking and traceability audits",
      "Helps establish relationships between test failures and reported issues",
      "Critical for impact analysis when test cases change",
      "Use for compliance reporting and quality metrics",
    ],
    outputDescription:
      "JSON object with issues array containing issue details, priorities, status, and linkage information",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Cases Linked to Test Suite",
    summary:
      "Get test cases that are linked (or not linked) to a specific test suite in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASES_BY_TESTSUITE,
    inputSchema: TestCasesByTestSuiteArgsSchema,
    purpose:
      "Retrieve test cases that are linked to a specific test suite. " +
      "This tool provides the ability to see which test cases belong to a test suite, " +
      "helping with test execution planning, suite management, and coverage analysis. " +
      "The tsID parameter represents the Test Suite ID obtained from test suite listings. " +
      "The getLinked parameter is optional and defaults to true for fetching linked test cases.",
    useCases: [
      "Get all test cases linked to a specific test suite for execution planning",
      "Find test cases that are NOT linked to a test suite (gap analysis)",
      "Analyze test suite composition and coverage",
      "Filter linked test cases by various criteria",
      "Plan test execution based on test suite structure",
      "Generate test suite reports and documentation",
      "Validate test suite contents before execution",
      "Manage test case organization within test suites",
      "Export test suite details for external reporting",
      "Verify test case assignments in test suites",
    ],
    examples: [
      {
        description:
          "Get all test cases linked to test suite ID 1497291 (default behavior)",
        parameters: { tsID: 1497291 },
        expectedOutput:
          "List of test cases linked to the test suite with test case details and metadata",
      },
      {
        description:
          "Get all test cases linked to test suite ID 1497291 (explicit)",
        parameters: { tsID: 1497291, getLinked: true },
        expectedOutput:
          "List of test cases linked to the test suite with test case details and metadata",
      },
      {
        description: "Get test cases NOT linked to test suite (gap analysis)",
        parameters: { tsID: 1497291, getLinked: false },
        expectedOutput:
          "List of test cases that are NOT linked to the test suite",
      },
      {
        description: "Get linked test cases with custom pagination",
        parameters: { tsID: 1497291, getLinked: true, page: 1, limit: 50 },
        expectedOutput:
          "Paginated list of linked test cases with 50 items per page",
      },
      {
        description:
          "Filter linked test cases by priority (using default getLinked=true)",
        parameters: {
          tsID: 1497291,
          filter: '[{"value":[1,2],"type":"list","field":"priorityAlias"}]',
        },
        expectedOutput:
          "High and medium priority test cases linked to the suite",
      },
      {
        description: "Filter linked test cases by status",
        parameters: {
          tsID: 1497291,
          getLinked: true,
          filter: '[{"value":[1],"type":"list","field":"testCaseStateAlias"}]',
        },
        expectedOutput: "Active test cases linked to the test suite",
      },
    ],
    hints: [
      "CRITICAL: tsID parameter is REQUIRED - this is the Test Suite numeric ID",
      "getLinked parameter is OPTIONAL - defaults to true if not provided",
      "HOW TO GET tsID:",
      "1. Call API 'Testsuite/Fetch Testsuite' to get available test suites",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite 'Regression Suite' might have ID 1497291",
      "tsID is NOT the same as tsFolderID - tsID refers to a specific test suite, not a folder",
      "getLinked=true (default): Returns test cases that ARE linked to the test suite",
      "getLinked=false: Returns test cases that are NOT linked to the test suite (useful for gap analysis)",
      "If getLinked is not specified, it defaults to true (linked test cases)",
      "FILTER CAPABILITIES: Support filtering by test case properties",
      "FILTER FIELDS: priorityAlias (list), testCaseStateAlias (list), testingTypeAlias (list), testCaseTypeAlias (list), componentAlias (list), owner (list)",
      "PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "STATUS IDs: Typically 1=Active, 2=Review, 3=Deprecated (verify with your QMetry instance)",
      "TESTING TYPE IDs: Typically 1=Manual, 2=Automated (verify with your QMetry instance)",
      "TYPE IDs: Typically 1=Functional, 2=Integration, 3=System (verify with your QMetry instance)",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for test suite management and execution planning",
      "Helps verify test suite composition before test runs",
      "Critical for understanding test coverage within specific suites",
      "Use for test suite analysis and optimization",
    ],
    outputDescription:
      "JSON object with test cases array containing test case details, properties, and suite linkage information",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Executions by Test Suite",
    summary: "Get executions for a given test suite in QMetry",
    handler: QMetryToolsHandlers.FETCH_EXECUTIONS_BY_TESTSUITE,
    inputSchema: ExecutionsByTestSuiteArgsSchema,
    purpose:
      "Retrieve test executions that belong to a specific test suite. " +
      "This tool provides comprehensive execution data including test results, " +
      "execution status, platforms, releases, cycles, and other execution metadata. " +
      "Essential for test execution reporting, trend analysis, and test suite performance monitoring.",
    useCases: [
      "Get all executions for a specific test suite for reporting purposes",
      "Analyze test execution results and trends within a test suite",
      "Filter executions by release, cycle, platform, or automation status",
      "Monitor test suite execution performance across different environments",
      "Generate execution reports for specific test suites",
      "Track execution history and patterns for test suite optimization",
      "Validate test suite execution coverage across releases and cycles",
      "Audit test execution data for compliance and quality assurance",
      "Export execution data for external reporting and analytics",
    ],
    examples: [
      {
        description: "Get all executions for test suite ID 194955",
        parameters: { tsID: 194955 },
        expectedOutput:
          "List of executions for the test suite with execution details, status, and metadata",
      },
      {
        description: "Get executions with test suite folder and view ID",
        parameters: {
          tsID: 194955,
          tsFolderID: 126554,
          viewId: 41799,
        },
        expectedOutput:
          "Executions filtered by test suite folder and specific view configuration",
      },
      {
        description: "Filter executions by release and cycle",
        parameters: {
          tsID: 194955,
          filter:
            '[{"type":"list","value":[55178],"field":"releaseID"},{"type":"list","value":[111577],"field":"cycleID"}]',
        },
        expectedOutput:
          "Executions filtered by specific release (55178) and cycle (111577)",
      },
      {
        description: "Filter executions by platform and automation status",
        parameters: {
          tsID: 194955,
          filter:
            '[{"type":"list","value":[12345],"field":"platformID"},{"type":"boolean","value":true,"field":"isAutomatedFlag"}]',
        },
        expectedOutput:
          "Automated executions filtered by specific platform (12345)",
      },
      {
        description: "Get only active (non-archived) executions",
        parameters: {
          tsID: 194955,
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "Active executions that are not archived",
      },
      {
        description: "Get executions with custom pagination and grid name",
        parameters: {
          tsID: 194955,
          gridName: "TESTEXECUTIONLIST",
          page: 1,
          limit: 25,
        },
        expectedOutput:
          "Paginated list of executions with 25 items per page using specific grid configuration",
      },
    ],
    hints: [
      "CRITICAL: tsID parameter is REQUIRED - this is the Test Suite numeric ID",
      "HOW TO GET tsID:",
      "1. Call API 'Testsuite/Fetch Testsuite' to get available test suites",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite 'Regression Suite' might have ID 194955",
      "HOW TO GET tsFolderID (optional):",
      "1. Call API 'Testsuite/List of folders' to get test suite folders",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite folder might have ID 126554",
      "FILTER CAPABILITIES: Extensive filtering by execution properties",
      "FILTER FIELDS: releaseID (list), cycleID (list), platformID (list), isAutomatedFlag (boolean), isArchived (list)",
      "RELEASE/CYCLE FILTERING: Use numeric IDs in list format (get from FETCH_RELEASES_AND_CYCLES)",
      "PLATFORM FILTERING: Use numeric platform IDs (get from FETCH_PLATFORMS)",
      "AUTOMATION STATUS: Use boolean true/false for isAutomatedFlag field",
      "ARCHIVE STATUS: 0=Active executions, 1=Archived executions",
      "GRID NAME: Default is 'TESTEXECUTIONLIST' - used for execution list display configuration",
      "VIEW ID: Optional numeric identifier for specific execution view configurations",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large execution result sets (start, page, limit parameters)",
      "This tool is essential for test execution analysis and reporting",
      "Critical for monitoring test suite performance and execution trends",
      "Use for compliance reporting and execution audit trails",
      "Essential for test execution planning and resource optimization",
    ],
    outputDescription:
      "JSON object with executions array containing execution details, status, platforms, releases, and execution metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Runs by Test Suite Run",
    summary:
      "Get test case runs under a specific test suite run execution in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    inputSchema: TestCaseRunsByTestSuiteRunArgsSchema,
    purpose:
      "Retrieve detailed test case run information for a specific test suite run execution. " +
      "This tool provides comprehensive test case run data including execution status, " +
      "test results, tester information, execution dates, and other run metadata. " +
      "Essential for detailed execution analysis, test run reporting, and execution audit trails. " +
      "NOTE: Uses simplified payload structure with only essential parameters (start, page, limit, tsrunID, viewId).",
    useCases: [
      "Get all test case runs under a specific test suite run execution",
      "Analyze individual test case execution results and status",
      "Monitor test case run performance and execution trends",
      "Generate detailed test execution reports for specific runs",
      "Track test case run history and execution patterns",
      "Validate test case run coverage and execution completeness",
      "Audit test case run data for compliance and quality assurance",
      "Export detailed test case run data for external reporting",
      "Retrieve paginated test case run results for large test suite executions",
    ],
    examples: [
      {
        description: "Get all test case runs for test suite run ID '107021'",
        parameters: { tsrunID: "107021", viewId: 6887 },
        expectedOutput:
          "List of test case runs with execution details, status, and metadata",
      },
      {
        description: "Get test case runs with linked defects",
        parameters: {
          tsrunID: "107021",
          viewId: 6887,
          page: 1,
          limit: 25,
        },
        expectedOutput:
          "Paginated list of test case runs with 25 items per page",
      },
      {
        description: "Get test case runs for test suite run ID '2362144'",
        parameters: {
          tsrunID: "2362144",
          viewId: 104123,
          start: 0,
          page: 1,
          limit: 10,
        },
        expectedOutput:
          "Test case runs from the specified test suite run execution",
      },
    ],
    hints: [
      "CRITICAL: tsrunID and viewId parameters are REQUIRED",
      "tsrunID is a STRING identifier for the test suite run execution",
      "viewId is a NUMERIC identifier for the test execution view",
      "HOW TO GET tsrunID:",
      "1. Call API 'Execution/Fetch Executions' to get available executions",
      "2. From the response, get value of following attribute -> data[<index>].tsRunID",
      "3. Example: Test Suite Run might have ID '107021'",
      "HOW TO GET viewId:",
      "1. Call API 'Admin/Get info Service' to get project info",
      "2. From the response, get value of following attribute -> latestViews.TE.viewId",
      "3. Example: Test Execution view might have ID 6887",
      "SIMPLIFIED PAYLOAD: API only accepts essential parameters",
      "SUPPORTED PARAMETERS: start, page, limit, tsrunID, viewId",
      "REMOVED PARAMETERS: filter, sort, showTcWithDefects, udfFilter (cause API errors)",
      "PAGINATION: Use start, page, and limit for result pagination",
      "API REQUIREMENT: Must use exact payload structure that works in Postman",
      'PAYLOAD FORMAT: {"start": 0, "page": 1, "limit": 10, "tsrunID": "2362144", "viewId": 104123}',
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for detailed test execution analysis and reporting",
      "Critical for monitoring individual test case execution performance",
      "Use for compliance reporting and execution audit trails",
      "Essential for test execution quality assurance and trend analysis",
    ],
    outputDescription:
      "JSON object with test case runs array containing detailed execution information, status, tester details, and run metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Linked Issues of Test Case Run",
    summary:
      "Get issues that are linked (or not linked) to a specific test case run in QMetry",
    handler: QMetryToolsHandlers.FETCH_LINKED_ISSUES_BY_TESTCASE_RUN,
    inputSchema: LinkedIssuesByTestCaseRunArgsSchema,
    purpose:
      "CRITICAL: This tool requires entityId which is the Test Case Run ID (tcRunID), NOT any other ID! " +
      "When user asks for 'linked issues of test execution' or 'linked issues of test suite' or 'linked issues of test run', " +
      "you MUST first fetch the test run data to get the proper tcRunID values, then use those as entityId. " +
      "NEVER use user-provided IDs directly as entityId without validation! " +
      "This tool retrieves issues linked to specific test case runs for defect tracking and traceability analysis.",
    useCases: [
      "Get all issues linked to a specific test case run for defect tracking",
      "Find issues that are NOT linked to a test case run (gap analysis)",
      "Generate defect reports and traceability matrix for test case runs",
      "Monitor issue resolution progress for specific test case executions",
      "Analyze test execution quality by examining linked defects",
      "Filter issues by type, priority, status, or owner for test case runs",
      "Audit issue-test case run relationships for compliance",
      "Track defect lifecycle in relation to test execution results",
      "Quality assurance - ensure proper issue tracking for failed test runs",
      "Impact analysis - see which issues affect specific test executions",
    ],
    examples: [
      {
        description: "Get all issues linked to test case run ID 1121218",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
        },
        expectedOutput:
          "List of issues linked to the test case run with issue details, status, and metadata",
      },
      {
        description: "Get issues NOT linked to test case run (gap analysis)",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: false,
        },
        expectedOutput:
          "List of issues that are NOT linked to test case run for gap analysis",
      },
      {
        description: "Filter linked issues by issue type and status",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"list","value":[1],"field":"typeAlias"},{"type":"list","value":[1,2],"field":"stateAlias"}]',
        },
        expectedOutput: "Bug type issues in Open or In Progress status",
      },
      {
        description: "Search linked issues by name and priority",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"string","value":"login","field":"name"},{"type":"list","value":[1],"field":"priorityAlias"}]',
        },
        expectedOutput: "High priority issues containing 'login' in their name",
      },
      {
        description: "Filter issues by date range and entity key",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"value":"2024-01-01","type":"date","field":"createdDate","comparison":"gt"},{"value":"2024-12-31","type":"date","field":"createdDate","comparison":"lt"},{"type":"string","value":"BUG-001,BUG-002","field":"entityKeyId"}]',
        },
        expectedOutput: "Specific issues created within date range",
      },
      {
        description: "Filter issues by owner and created system",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"list","value":[123],"field":"dfOwner"},{"type":"list","value":["QMetry"],"field":"createdSystem"}]',
        },
        expectedOutput: "Issues owned by specific user and created in QMetry",
      },
    ],
    hints: [
      "WORKFLOW CRITICAL: NEVER use user-provided IDs directly as entityId!",
      "ALWAYS fetch execution data first to get proper tcRunID values!",
      "",
      "WHEN USER ASKS: 'fetch linked issues of test suite [ID]' OR 'linked issues of test run [ID]':",
      "STEP 1: Identify what type of ID the user provided",
      "STEP 2A: If Test Suite ID → fetch executions by test suite → get tsRunID → fetch test runs → get tcRunID",
      "STEP 2B: If Test Run ID → fetch test case runs by test suite run → get tcRunID",
      "STEP 2C: If Test Case ID → fetch test case executions → get tcRunID",
      "STEP 3: Use tcRunID as entityId for this tool",
      "",
      "ID HIERARCHY: Test Suite → Test Suite Runs → Test Case Runs (tcRunID = entityId)",
      "ID HIERARCHY: Test Case → Test Case Executions (tcRunID = entityId)",
      "",
      "CRITICAL: entityId parameter is REQUIRED - this is the Test Case Run numeric ID (tcRunID)",
      "HOW TO GET entityId:",
      "1. Call appropriate execution APIs to get test case runs",
      "2. From the response, extract data[<index>].tcRunID",
      "3. Use tcRunID as entityId for this tool",
      "4. Example: tcRunID 1121218 becomes entityId: 1121218",
      "",
      "getLinked=true (default): Returns issues that ARE linked to the test case run",
      "getLinked=false: Returns issues that are NOT linked to the test case run (useful for gap analysis)",
      "istcrFlag=true (default): Set to true for test case run operations",
      "getColumns=true (default): Include column metadata in response",
      "",
      "FILTER CAPABILITIES: Support extensive filtering by issue properties",
      "FILTER FIELDS: name (string), typeAlias (list), stateAlias (list), entityKeyId (string), createdDate (date with comparison), createdByAlias (list), updatedDate (date with comparison), createdSystem (list), updatedByAlias (list), dfOwner (list), priorityAlias (list), linkedTcrCount (numeric), linkedRqCount (numeric), attachmentCount (numeric), componentAlias (list), environmentText (string), affectedRelease (list)",
      "ISSUE TYPE IDs: Typically 1=Bug, 2=Enhancement, 3=Task (verify with your QMetry instance)",
      "ISSUE STATE IDs: Typically 1=Open, 2=In Progress, 3=Resolved, 4=Closed (verify with your QMetry instance)",
      "ISSUE PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "DATE FILTERING: Use 'gt' (greater than) and 'lt' (less than) comparisons for date fields",
      "ENTITY KEY SEARCH: Use comma-separated values for multiple issue keys",
      "CREATED SYSTEM: Use 'QMetry' or 'JIRA' to filter by creation system",
      "OWNER IDs: Use numeric user IDs from QMetry user management",
      "COMPONENT/LABEL IDs: Use numeric IDs for component/label filtering",
      "ENVIRONMENT TEXT: Filter by environment description text",
      "AFFECTED RELEASE: Use release IDs for filtering by affected releases",
      "LINKED COUNT FILTERS: Use numeric values for linkedTcrCount, linkedRqCount, attachmentCount",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for defect tracking and traceability audits",
      "Critical for understanding test execution quality and issue relationships",
      "Use for compliance reporting and issue lifecycle management",
      "Helps establish relationships between test failures and reported issues",
      "Essential for impact analysis when test case runs change or fail",
    ],
    outputDescription:
      "JSON object with issues array containing issue details, priorities, status, owner information, and linkage metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Create Defect or Issue",
    summary:
      "Create a new defect/issue internal for link it to a test execution in QMetry.",
    handler: QMetryToolsHandlers.CREATE_ISSUE,
    inputSchema: CreateIssueArgsSchema,
    purpose:
      "Allows users to create a new defect/issue in QMetry, including issueType, issuePriority, issueOwner and summary. " +
      "Supports all major defect/issue fields. " +
      "For fields like sync_with, issueType, issuePriority, issueOwner, component, affectedRelease etc., fetch their valid values using the project info tool. " +
      "If tcRunID is not provided, it will be auto-resolved to the fetch test case run id but it's optional field.",

    useCases: [
      "Create a basic defect/issue with just a summary",
      "Set issueType, issueOwner, component, and affectedRelease using valid IDs from project info",
      "Create defects/issues for automation or manual testing types",
      "Link defects/issues to specific test case runs using tcRunID",
    ],
    examples: [
      {
        description: "Create an issue with summary 'Login Issue'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput: "Issue created in summary details",
      },
      {
        description:
          "Create a an issue with Major priority and Bug type to Bug with summary 'Login Issue'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput:
          "Issue created in summary details with priority and Bug type",
      },
      {
        description:
          "Create a an issue with summary 'Login Issue' and set issueOwner to 'John Doe'",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput:
          "Issue created in summary details with owner, priority and Bug type",
      },
      {
        description:
          "Create a an issue with summary 'Login Issue' and link it to test case run ID 567890",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          tcRunID: 567890,
        },
        expectedOutput:
          "Issue created in summary details and linked to test case run ID 567890",
      },
      {
        description:
          "Create a an issue with summary 'Login Issue' and set description to 'User is unable to login' and owner to 'John Doe' and link it to test case run ID 567890",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          tcRunID: 567890,
          description: "User is unable to login",
        },
        expectedOutput:
          "Issue created in summary details with description, owner, priority, Bug type and linked to test case run ID 567890",
      },
      {
        description:
          "Create a an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycles and owner to 'John Doe'",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          affectedRelease: [111840],
          affectedCycles: [112345, 112346],
        },
        expectedOutput:
          "Issue created in summary details with release and associated all cycles, owner",
      },
      {
        description:
          "Create a an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycle 'Cycle 1.0.1', 'Cycle 1.0.2'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
          affectedRelease: [111840],
          affectedCycles: [112345, 112346],
        },
        expectedOutput:
          "Issue created in summary details with release and cycles",
      },
    ],
    hints: [
      "CRITICAL: name (summary), issueType, issuePriority are REQUIRED fields to create an issue",
      "OPTIONAL: issueOwner, component, affectedRelease, description, tcRunID can also be provided",
      "To get valid values for sync_with (igConfigurationID or internalTrackerId), issueType, issuePriority, issueOwner, component, affectedRelease, and tcRunID, call the 'project get info tools' use the following mappings:",
      "- sync_with: customListObjs.component[<index>].igConfigurationID or internalTrackerId",
      "- issueType: customListObjs.issueType[<index>].id",
      "- issuePriority: customListObjs.issuePriority[<index>].id",
      "- issueOwner: customListObjs.users[<index>].id",
      "- affectedRelease: data[<index>].releaseID",
      "- tcRunID: data[<index>].tcRunID (from 'Execution/Fetch Testcase Run ID')",
      "If the user provides a issuePriority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.issuePriority[index].name, and use its ID in the payload. If the name is not found, skip the issuePriority field and show a user-friendly message: 'Defect/issue created without issuePriority, as given issuePriority is not available in the current project.'",
      "If the user provides an issueOwner name, fetch project info, find the matching issueOwner in customListObjs.users[index].name, and use its ID in the payload as issueOwner. If the name is not found, skip the issueOwner field and show a user-friendly message: 'Defect/issue created without issueOwner, as given issueOwner is not available in the current project.'",
      "If the user provides an issue type name, fetch project info, find the matching type in customListObjs.issueType[index].name, and use its ID in the payload as issueType. If the name is not found, skip the issueType field and show a user-friendly message: 'Defect/issue created without issue type, as given type is not available in the current project.'",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the issue, follow these rules:",
      "If the user provides a release ID, map it from projects.releases[index].releaseID in the project info response, and use that ID in affectedRelease as an array of numeric IDs.",
      "If the user provides both release and cycle IDs, validate both against the current project's releases and cycles; if valid, use them in affectedCycles and affectedRelease as arrays of numeric IDs respectively.",
      "If the user provides a release name, map it to its ID from project info; if a cycle name is provided, map it to its ID and use it in payload as value of field affectedRelease and affectedCycles.",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Issue created without release/cycle association, as given release/cycle is not available in the current project.'",
      "Ensure all IDs used are valid for the current QMetry project context",
      "This tool is essential for defect management and test execution linkage",
      "Helps maintain traceability between test executions and reported issues",
      "Critical for quality assurance and defect lifecycle management",
      "Use for creating issues directly from test execution contexts",
    ],
    outputDescription:
      "JSON object containing the new create issue with id, dfid(defectID).",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Issue",
    summary: "Update an existing QMetry issue by DefectId and/or entityKey.",
    handler: QMetryToolsHandlers.UPDATE_ISSUE,
    inputSchema: UpdateIssueArgsSchema,
    purpose:
      "Update an existing QMetry issue by DefectId and/or entityKey. " +
      "Only fields provided will be updated. " +
      "Refer to the Create Issue tool for field mapping and valid values.",
    useCases: [
      "Update issue summary (title)",
      "Change issue priority, type, or owner",
      "Update affected release or cycles",
      "Update description or environment",
      "Bulk update using DefectId and/or entityKey",
    ],
    examples: [
      {
        description: "Update issue summary",
        parameters: {
          DefectId: 118150,
          summary:
            "Money withdrawal is success even if insufficient amount_updated",
        },
        expectedOutput: "Issue summary updated successfully.",
      },
      {
        description: "Update issue priority",
        parameters: { DefectId: 118150, issuePriority: 189340 },
        expectedOutput: "Issue priority updated successfully.",
      },
      {
        description: "Update issue type",
        parameters: { DefectId: 118150, issueType: 189337 },
        expectedOutput: "Issue type updated successfully.",
      },
      {
        description: "Update affected release",
        parameters: { DefectId: 118150, affectedRelease: 3730 },
        expectedOutput: "Affected release updated successfully.",
      },
    ],
    hints: [
      "To get the DefectId, call the Issue/Fetch issue tool and use data[<index>].id from the response.",
      "if you have pass issue key (VT-IS-5, MAC-IS-10 etc.) then first fetch issue by issue key to get issue id.",
      "Along with DefectId, pass only those fields which are to be updated.",
      "Refer to the Create Issue tool for valid field mappings and values.",
      "You can update summary, priority, type, affectedRelease, affectedCycles, description, sync_with, issueOwner, component, environment, tcRunID, etc.",
      "If you provide entityKey, it will be used for additional validation but DefectId is required.",
    ],
    outputDescription: "JSON object with update status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Defects or Issues",
    summary:
      "Fetch QMetry defects or issues - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_ISSUES,
    inputSchema: IssuesListArgsSchema,
    purpose:
      "Get defects or issues from QMetry. System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all issues in a project",
      "Search for specific issues using filters",
      "Get paginated issue results",
    ],
    examples: [
      {
        description:
          "Get all issues from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of issues from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all issues from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of issues from UT project using UT's specific IS viewId",
      },
      {
        description: "Get issues with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 166065 },
        expectedOutput: "Issues using manually specified viewId 166065",
      },
      {
        description:
          "List issues from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId:
            "fetch specific project given projectKey defects or issues ViewId",
        },
        expectedOutput:
          "Issues using manually specified viewId 103097 or projectKey",
      },
      {
        description: "Get issues by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Issues associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get issues by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All defects or issues associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get issues by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All defects or issues associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific issue by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-IS-636","field":"entityKeyId"}]',
        },
        expectedOutput: "Issues matching the entity key criteria",
      },
      {
        description:
          "Search for multiple defects or issues by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-IS-636,MAC-IS-637,MAC-IS-638","field":"entityKeyId"}]',
        },
        expectedOutput: "Issues matching any of the specified entity keys",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and issues fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.IS.viewId",
      "Step 3: Use the SAME projectKey and the extracted IS viewId for fetching issues",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and issues fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by issues key (like MAC-IS-1684), use filter: \'[{"type":"string","value":"MAC-IS-1684","field":"entityKeyId"}]\'',
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: name, stateAlias, typeAlias, entityKeyId, createdDate, createdByAlias, updatedDate, updatedByAlias, createdSystem, dfOwner, priorityAlias, linkedTcrCount, linkedRqCount, attachmentCount, componentAlias, environmentText",
      "SORT FIELDS: entityKey, name, typeAlias, stateAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, priorityAlias, createdSystem, linkedTcrCount, linkedRqCount, dfOwner, attachmentCount, environmentText",
      "For multiple entity keys, use comma-separated values in filter",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for defect management and issue tracking",
      "Critical for quality assurance and defect lifecycle analysis",
      "Use for compliance reporting and issue traceability",
      "Helps maintain visibility into project defects and issues",
    ],
    outputDescription:
      "JSON object with 'data' array containing issues and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Link Issues to Testcase Run",
    summary: "Link one or more issues to a QMetry Testcase Run (execution).",
    handler: QMetryToolsHandlers.LINK_ISSUES_TO_TESTCASE_RUN,
    inputSchema: LinkIssuesToTestcaseRunArgsSchema,
    purpose:
      "Link existing QMetry issues to a specific Testcase Run (execution) by providing their IDs. " +
      "This is used to associate defects with a test execution for traceability and reporting.",
    useCases: [
      "Link a single issue to a testcase run",
      "Link multiple issues to a testcase run",
      "Automate defect association during test execution",
      "Maintain traceability between defects and test runs",
    ],
    examples: [
      {
        description: "Link one issue to a testcase run",
        parameters: { issueIds: ["5054834"], tcrId: 567890 },
        expectedOutput:
          "Issue 5054834 linked to testcase run 567890 successfully.",
      },
      {
        description: "Link multiple issues to a testcase run",
        parameters: { issueIds: ["5054834", "5054835"], tcrId: 567890 },
        expectedOutput:
          "Issues 5054834, 5054835 linked to testcase run 567890 successfully.",
      },
    ],
    hints: [
      "if you have pass issue key (VT-IS-5, MAC-IS-10 etc.) then first fetch issue by issue key to get issue id.",
      "To get the issueIds, call the Fetch issues linked with testcases tool and use data[<index>].defectID from the response.",
      "To get the tcrId, call the Execution/Fetch Testcase Run ID tool and use data[<index>].tcRunID from the response.",
      "Both issueIds and tcrId are required.",
      "You can link multiple issues at once by providing an array of IDs.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
];
