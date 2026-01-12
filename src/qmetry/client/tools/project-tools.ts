import { QMetryToolsHandlers } from "../../config/constants";
import {
  BuildArgsSchema,
  CreateCycleArgsSchema,
  CreateReleaseArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ProjectListArgsSchema,
  ReleasesCyclesArgsSchema,
  UpdateCycleArgsSchema,
} from "../../types/common";
import type { QMetryToolParams } from "./types";

export const PROJECT_TOOLS: QMetryToolParams[] = [
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
    title: "Create Release",
    summary:
      "Create a new release in QMetry with optional cycle for test planning and execution tracking",
    handler: QMetryToolsHandlers.CREATE_RELEASE,
    inputSchema: CreateReleaseArgsSchema,
    purpose:
      "Create a new release in QMetry to organize test execution phases. " +
      "Releases represent major versions or milestones in your project. " +
      "Optionally create a cycle within the release for more granular test execution planning. " +
      "This tool helps establish the test planning hierarchy and enables better test execution tracking.",
    useCases: [
      "Create a new release for a major product version (e.g., v2.0, Q1 Release)",
      "Create a release with an initial cycle for immediate test planning",
      "Set up release dates for sprint planning and milestone tracking",
      "Organize test execution by product versions and cycles",
      "Create release hierarchy for better test planning and reporting",
      "Establish test execution phases with releases and cycles",
    ],
    examples: [
      {
        description: "Create a basic release with just a name",
        parameters: {
          release: {
            name: "Release 2.0",
          },
        },
        expectedOutput:
          "Release 'Release 2.0' created successfully with generated release ID",
      },
      {
        description: "Create a release with description and dates",
        parameters: {
          release: {
            name: "Q1 2024 Release",
            description: "First quarter release for 2024",
            startDate: "01-01-2024",
            targetDate: "31-03-2024",
          },
        },
        expectedOutput:
          "Release 'Q1 2024 Release' created with start date 01-01-2024 and target date 31-03-2024",
      },
      {
        description: "Create a release with an initial cycle",
        parameters: {
          release: {
            name: "Release 3.0",
            description: "Major product update",
          },
          cycle: {
            name: "Sprint 1",
            isLocked: false,
            isArchived: false,
          },
        },
        expectedOutput:
          "Release 'Release 3.0' created with cycle 'Sprint 1' for test execution planning",
      },
      {
        description: "Create a release with all details",
        parameters: {
          release: {
            name: "Summer 2024 Release",
            description: "Summer product release with new features",
            startDate: "01-06-2024",
            targetDate: "31-08-2024",
          },
          cycle: {
            name: "Beta Testing Cycle",
            isLocked: false,
          },
        },
        expectedOutput:
          "Release 'Summer 2024 Release' created with dates and 'Beta Testing Cycle' for test execution",
      },
    ],
    hints: [
      "CRITICAL: release.name is REQUIRED - must provide a name for the release",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY",
      "Check your QMetry instance settings to determine the correct date format",
      "If dates are in wrong format, QMetry will return an error - verify format with admin",
      "projectID is optional in the release object - it will be auto-resolved from the project key if not provided",
      "To explicitly set projectID, first call FETCH_PROJECT_INFO to get the numeric project ID",
      "cycle parameter is completely optional - omit it if you only want to create a release",
      "If providing cycle, cycle.name is REQUIRED",
      "cycle.isLocked defaults to false if not provided - set to true to prevent modifications",
      "cycle.isArchived defaults to false if not provided - set to true to archive immediately (rare)",
      "Releases can have multiple cycles added later using other tools",
      "Use descriptive release names like 'Release 2.0', 'Q1 2024', 'Sprint 15' for better organization",
      "startDate and targetDate help with sprint planning and milestone tracking",
      "Creating a release with a cycle is useful for immediate test planning after release creation",
      "Release hierarchy: Project → Release → Cycle → Test Execution",
      "After creating a release, you can associate test suites and test cases with it",
      "Use FETCH_RELEASES_CYCLES tool after creation to verify the release was created successfully",
    ],
    outputDescription:
      "JSON object containing the created release ID, release details, and cycle information if provided",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Create Cycle",
    summary:
      "Create a new cycle within an existing release in QMetry for test execution planning",
    handler: QMetryToolsHandlers.CREATE_CYCLE,
    inputSchema: CreateCycleArgsSchema,
    purpose:
      "Create a new cycle within an existing release to organize test execution phases. " +
      "Cycles represent specific testing iterations, sprints, or phases within a release. " +
      "This tool requires an existing release and creates a cycle associated with it. " +
      "Essential for granular test planning and sprint-based test execution tracking.",
    useCases: [
      "Create a new test cycle for a sprint within an existing release",
      "Add additional testing phases to an existing release",
      "Set up regression testing cycles for a specific release",
      "Organize test execution by sprints, phases, or iterations",
      "Create cycles with specific date ranges for milestone tracking",
      "Establish test execution phases within release planning",
    ],
    examples: [
      {
        description: "Create a basic cycle with just a name in a release",
        parameters: {
          cycle: {
            name: "Sprint 2",
            releaseID: 12345,
          },
        },
        expectedOutput:
          "Cycle 'Sprint 2' created successfully in release ID 12345",
      },
      {
        description: "Create a cycle with description and dates",
        parameters: {
          cycle: {
            name: "Regression Testing Cycle",
            description: "Full regression testing for release 2.0",
            startDate: "15-01-2024",
            targetDate: "31-01-2024",
            releaseID: 12345,
          },
        },
        expectedOutput:
          "Cycle 'Regression Testing Cycle' created with start date 15-01-2024 and target date 31-01-2024 in release 12345",
      },
      {
        description: "Create a locked cycle to prevent modifications",
        parameters: {
          cycle: {
            name: "Final QA Cycle",
            description: "Locked cycle for final QA testing",
            isLocked: true,
            isArchived: false,
            releaseID: 12345,
          },
        },
        expectedOutput:
          "Locked cycle 'Final QA Cycle' created in release 12345 to prevent modifications",
      },
      {
        description:
          "Create a cycle with all details including project ID and dates",
        parameters: {
          cycle: {
            name: "Sprint 3 - Feature Testing",
            description: "Testing new features for Sprint 3",
            startDate: "01-02-2024",
            targetDate: "15-02-2024",
            isLocked: false,
            isArchived: false,
            projectID: 67890,
            releaseID: 12345,
          },
        },
        expectedOutput:
          "Cycle 'Sprint 3 - Feature Testing' created with dates and project context in release 12345",
      },
    ],
    hints: [
      "CRITICAL: cycle.releaseID is REQUIRED - must provide the release ID to associate this cycle with",
      "CRITICAL: cycle.name is REQUIRED - must provide a name for the cycle",
      "HOW TO GET releaseID:",
      "1. Call FETCH_RELEASES_CYCLES tool to get all releases and their IDs",
      "2. From the response, get value from projects.releases[<index>].releaseID",
      "3. Use that numeric releaseID in the cycle.releaseID parameter",
      "Example: Release 'Q1 2024' might have releaseID: 12345",
      "CRITICAL WORKFLOW - IF USER PROVIDES RELEASE NAME:",
      "1. User says: 'Create cycle Sprint 2 in release Q1 2024'",
      "2. You MUST first call FETCH_RELEASES_CYCLES tool to get all releases",
      "3. Search the response for release with name 'Q1 2024'",
      "4. Extract projects.releases[<index>].releaseID from matching release",
      "5. Use that releaseID in cycle.releaseID parameter",
      "6. If release name not found, inform user and list available releases",
      "Example workflow:",
      "- User request: 'Create cycle Sprint 2 in Release 2.0'",
      "- Step 1: Call FETCH_RELEASES_CYCLES",
      "- Step 2: Find release where name = 'Release 2.0', get its releaseID (e.g., 12345)",
      "- Step 3: Call CREATE_CYCLE with cycle.releaseID = 12345",
      "RELEASE NAME RESOLUTION:",
      "- NEVER assume or guess release IDs - always fetch from API",
      "- Release names are user-defined strings (e.g., 'Q1 2024', 'Release 2.0', 'Sprint 15')",
      "- Release IDs are numeric identifiers assigned by QMetry (e.g., 12345, 67890)",
      "- Match release names case-insensitively when searching",
      "- If multiple releases match the name, ask user to clarify or use the most recent one",
      "- FETCH_RELEASES_CYCLES returns: projects.releases[] array with name and releaseID fields",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY",
      "Check your QMetry instance settings to determine the correct date format",
      "If dates are in wrong format, QMetry will return an error - verify format with admin",
      "projectID is optional in the cycle object - it will be auto-resolved from the project key if not provided",
      "To explicitly set projectID, first call FETCH_PROJECT_INFO to get the numeric project ID",
      "cycle.isLocked defaults to false if not provided - set to true to prevent modifications",
      "cycle.isArchived defaults to false if not provided - set to true to archive immediately (rare)",
      "Use descriptive cycle names like 'Sprint 2', 'Regression Cycle', 'Alpha Testing' for better organization",
      "startDate and targetDate help with sprint planning and milestone tracking",
      "Cycle hierarchy: Project → Release → Cycle → Test Execution",
      "After creating a cycle, you can associate test suites and test cases with it",
      "Use FETCH_RELEASES_CYCLES tool after creation to verify the cycle was created successfully",
      "DIFFERENCE FROM CREATE_RELEASE: This tool creates a cycle in an EXISTING release, while CREATE_RELEASE can create a release with an optional cycle",
      "If you need to create both a release and a cycle together, use CREATE_RELEASE tool instead",
      "If release doesn't exist yet, create it first with CREATE_RELEASE, then add more cycles with this tool",
    ],
    outputDescription:
      "JSON object containing the created cycle ID, cycle details, and association with the release",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Cycle",
    summary: "Update an existing cycle in QMetry for test execution planning",
    handler: QMetryToolsHandlers.UPDATE_CYCLE,
    inputSchema: UpdateCycleArgsSchema,
    purpose:
      "Update an existing cycle within a release to modify test execution phase details. " +
      "Cycles represent specific testing iterations, sprints, or phases within a release. " +
      "This tool requires buildID and releaseID to identify the cycle to update. " +
      "Essential for maintaining accurate test planning and sprint-based test execution tracking.",
    useCases: [
      "Update cycle name for better organization",
      "Modify cycle dates to reflect schedule changes",
      "Adjust testing phase timelines within a release",
      "Update cycle metadata for sprint tracking",
      "Revise milestone dates for test execution planning",
      "Rename cycles to match updated sprint naming conventions",
    ],
    examples: [
      {
        description: "Update cycle name",
        parameters: {
          cycle: {
            name: "Alpha_v1_Updated",
            buildID: 1494,
            releaseID: 3729,
          },
        },
        expectedOutput:
          "Cycle updated successfully with new name 'Alpha_v1_Updated'",
      },
      {
        description: "Update cycle dates",
        parameters: {
          cycle: {
            startDate: "10-10-2018",
            targetDate: "11-11-2018",
            buildID: 1494,
            releaseID: 3729,
          },
        },
        expectedOutput:
          "Cycle dates updated successfully with new start date 10-10-2018 and target date 11-11-2018",
      },
      {
        description: "Update cycle name and dates together",
        parameters: {
          cycle: {
            name: "Sprint 2 - Updated",
            startDate: "15-01-2024",
            targetDate: "31-01-2024",
            buildID: 1494,
            releaseID: 3729,
          },
        },
        expectedOutput: "Cycle updated with new name and dates successfully",
      },
    ],
    hints: [
      "CRITICAL: cycle.buildID is REQUIRED - must provide the build ID to identify the cycle to update",
      "CRITICAL: cycle.releaseID is REQUIRED - must provide the release ID to identify the cycle to update",
      "HOW TO GET buildID and releaseID:",
      "1. Call FETCH_RELEASES_CYCLES tool (API: 'Cycle/List') to get all cycles",
      "2. From the response, get buildID from projects.releases[<index>].builds[<index>].buildID",
      "3. From the response, get releaseID from projects.releases[<index>].releaseID",
      "4. Use those numeric IDs in cycle.buildID and cycle.releaseID parameters",
      "Example: Cycle 'Sprint 2' might have buildID: 1494 and releaseID: 3729",
      "CRITICAL WORKFLOW - IF USER PROVIDES CYCLE NAME:",
      "1. User says: 'Update cycle Sprint 2 to change dates'",
      "2. You MUST first call FETCH_RELEASES_CYCLES tool to get all cycles",
      "3. Search the response for cycle with matching name 'Sprint 2'",
      "4. Extract buildID and releaseID from the matching cycle",
      "5. Use those IDs in cycle.buildID and cycle.releaseID parameters",
      "6. If cycle name not found, inform user and list available cycles",
      "Example workflow:",
      "- User request: 'Update cycle Alpha_v1 name to Alpha_v1_Updated'",
      "- Step 1: Call FETCH_RELEASES_CYCLES",
      "- Step 2: Find cycle where name = 'Alpha_v1', get its buildID (e.g., 1494) and releaseID (e.g., 3729)",
      "- Step 3: Call UPDATE_CYCLE with cycle.buildID = 1494 and cycle.releaseID = 3729",
      "CYCLE IDENTIFICATION:",
      "- NEVER assume or guess buildID or releaseID - always fetch from API",
      "- Cycle names are user-defined strings (e.g., 'Sprint 2', 'Alpha_v1', 'Regression Cycle')",
      "- buildID and releaseID are numeric identifiers assigned by QMetry",
      "- Match cycle names case-insensitively when searching",
      "- If multiple cycles match the name, ask user to clarify or use the most recent one",
      "- FETCH_RELEASES_CYCLES returns: projects.releases[].builds[] array with name, buildID, and releaseID",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY",
      "Check your QMetry instance settings to determine the correct date format",
      "NOTE: To verify/update the Date Format - Go to QMetry -> User Profile",
      "If dates are in wrong format, QMetry will return an error - verify format with admin",
      "You can update name, startDate, or targetDate independently or together",
      "Only include the fields you want to update - other fields will remain unchanged",
      "startDate and targetDate help with sprint planning and milestone tracking",
      "Cycle hierarchy: Project → Release → Cycle → Test Execution",
      "After updating a cycle, you can verify changes using FETCH_RELEASES_CYCLES tool",
      "DIFFERENCE FROM CREATE_CYCLE: This tool updates an EXISTING cycle, while CREATE_CYCLE creates a new one",
    ],
    outputDescription:
      "JSON object containing the updated cycle details and confirmation of update",
    readOnly: false,
    idempotent: true,
  },
];
