import { QMetryToolsHandlers } from "../../config/constants.js";
import {
  BuildArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ProjectListArgsSchema,
  ReleasesCyclesArgsSchema,
} from "../../types/common.js";
import type { QMetryToolParams } from "./types.js";

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
];
