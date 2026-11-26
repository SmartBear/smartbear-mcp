import { QMetryToolsHandlers } from "../../config/constants";
import {
  ApiQuotaStatusArgsSchema,
  BuildArgsSchema,
  CreateCycleArgsSchema,
  CreateReleaseArgsSchema,
  PlatformArgsSchema,
  ProjectArgsSchema,
  ProjectListArgsSchema,
  ReleasesCyclesArgsSchema,
  UpdateCycleArgsSchema,
  UpdateReleaseArgsSchema,
} from "../../types/common";
import type { QMetryToolParams } from "./types";

export const PROJECT_TOOLS: QMetryToolParams[] = [
  {
    title: "Fetch QMetry list Projects",
    toolset: "Projects",
    summary:
      "Fetch QMetry projects list including projectID, name, projectKey, isArchived and folderPath needed for other operations",
    handler: QMetryToolsHandlers.FETCH_PROJECTS,
    inputSchema: ProjectListArgsSchema,
    purpose:
      "Prerequisite tool that lists the QMetry projects the API key's user can access. " +
      "Use it to find the projectKey of a project the user named (by name or key) before passing that key to other QMetry tools.",
    useCases: [
      "Get project list to check user how many project access to particular apikey",
      "Retrieve available fields of each project list including projectID, name, projectKey, isArchived and folderPath needed for other operations",
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
          "Project active/non archived list including some important fields like projectID, name, projectKey, isArchived and folderPath needed for other operations",
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
      "Use it to turn what the user said into the projectKey every project-scoped QMetry tool requires",
      'Project NAME: filter by name, e.g. filter: \'[{"value":"Mobile App","type":"string","field":"name"}]\', and use the matching row\'s projectKey. If several rows or none match, show the candidates and ask the user',
      "Project ID (numeric): there is no ID filter. Call without a filter, page through the results (start, page, limit) and use the projectKey of the row whose projectID matches. If no row matches, tell the user the ID is not a project they can access",
      "If nothing matches among active projects, retry with params.showArchive: true and tell the user when the project is archived",
      "If the user named no project, use this list to ask which project to work in",
      "projectKey is not needed for this tool; leave it out",
      "Use params.showArchive: true/false to get archived/non-archived projects, default is false when not provided",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "Filter parameter should be a JSON string with filter criteria",
      "Common filter fields: 'name' (string), 'projectKey' (string)",
    ],
    outputDescription:
      "JSON object containing list of projects details, including Version, Build Number(if greater than or equal to 1), Project ID, name, Project Key and Date Format",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch QMetry Project Info",
    toolset: "Projects",
    summary:
      "Fetch QMetry project information including folder details needed for other operations",
    handler: QMetryToolsHandlers.FETCH_PROJECT_INFO,
    inputSchema: ProjectArgsSchema,
    purpose:
      "Returns configuration of one QMetry project (custom lists, statuses, date format, root folders) for the given projectKey. " +
      "With projectKey omitted it returns the project currently selected in the QMetry UI for the API key's user " +
      "(currentProjectId, currentProjectName); do that ONLY when the user asks for the project selected in QMetry. " +
      "To find a project key from a name or ID, use 'Fetch QMetry list Projects' instead. " +
      "This tool does not change which project other tools use.",
    useCases: [
      "Get project configuration before fetching test cases",
      "Get folderPath information for project navigation",
      "Validate project access and permissions",
      "Find out which project is selected in the QMetry UI, only when the user asks for it",
    ],
    examples: [
      {
        description:
          "Get the configuration (custom lists, statuses, date format, root folders) of the project the task works in",
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "MAC project configuration with custom lists, statuses, date format and root folders",
      },
      {
        description:
          "Only when the user asks which project is selected in the QMetry UI",
        parameters: {},
        expectedOutput:
          "The selected project (currentProjectId, currentProjectName) and its configuration",
      },
    ],
    hints: [
      "Do NOT call this just to pick a project: when the user named no project, ask them and offer the list from 'Fetch QMetry list Projects'",
      "Omit projectKey only when the user asks for the project selected in QMetry; then tell the user which project it is (currentProjectName) and pass its key explicitly on the following calls",
      "Calling this tool does not switch projects: every QMetry tool uses its own 'projectKey' argument",
      "Use empty string '' as folderPath for root directory",
      "DATE FORMAT — IMPORTANT: response contains 'dateTimeFormatID' (number) and 'dateTimeFormatNew' (array).",
      "  dateTimeFormatID = active format ID for this project.",
      "  dateTimeFormatNew = [{ id, name, unique_value }] — find entry where id === dateTimeFormatID.",
      "  unique_value is the authoritative date format pattern using Java/QMetry conventions:",
      "    yyyy = 4-digit year  |  MM = 2-digit month (01-12)  |  dd = 2-digit day  |  MMM = 3-letter month (Jan/Feb/...)",
      "  Example mappings:",
      "    unique_value 'MM-dd-yyyy' → format: 12-25-2024",
      "    unique_value 'dd-MM-yyyy' → format: 25-12-2024",
      "    unique_value 'yyyy-MM-dd' → format: 2024-12-25",
      "    unique_value 'dd-MMM-yyyy' → format: 25-Dec-2024",
      "  Always use this format when sending date values in any create/update payload.",
      "  Always parse user-provided dates and reformat them to this pattern before sending to API.",
    ],
    outputDescription:
      "JSON object containing project details, folderPaths, project configuration, " +
      "'currentProjectId' and 'currentProjectName' (the project this response is for), " +
      "'projects' (short { id, key, name } list of the projects the user can access), " +
      "'dateTimeFormatID' (active date format ID), and 'dateTimeFormatNew' array " +
      "(each entry: { id, name, unique_value } — use unique_value of the matching entry as the date format pattern for all API date fields).",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Releases and Cycles",
    toolset: "Projects",
    summary:
      "Fetch QMetry releases and cycles from the project given by projectKey",
    handler: QMetryToolsHandlers.FETCH_RELEASES_CYCLES,
    inputSchema: ReleasesCyclesArgsSchema,
    purpose:
      "Retrieve release and cycle information from the QMetry project given by projectKey. " +
      "Releases represent major versions or milestones, while cycles represent test execution phases within releases. " +
      "This tool provides the hierarchical structure of releases and their associated cycles.",
    useCases: [
      "Fetch associated releases and cycles of the project",
      "Fetch available releases and cycles of the project",
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
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "List of active releases and cycles excluding archived ones (showArchive: false sent in payload)",
      },
      {
        description: "Get active/unarchived releases and cycles explicitly",
        parameters: { projectKey: "MAC", showArchive: false },
        expectedOutput:
          "List of active releases and cycles excluding archived ones (showArchive: false sent in payload)",
      },
      {
        description: "Get not active/archived releases and cycles",
        parameters: { projectKey: "MAC", showArchive: true },
        expectedOutput:
          "List of all releases and cycles including archived ones (showArchive: true sent in payload)",
      },
      {
        description:
          "Get releases and cycles of a project whose numeric ID is already known",
        parameters: { projectKey: "MAC", projectID: 12345 },
        expectedOutput:
          "Releases and cycles of project 12345 only (skips the project ID lookup)",
      },
      {
        description:
          "User explicitly asks for releases and cycles of ALL projects",
        parameters: { allProjects: true },
        expectedOutput:
          "Release/cycle tree for every project the user can access",
      },
    ],
    hints: [
      "projectKey is required (the project to read). Leave it out only together with allProjects: true",
      "By default only the CURRENT project's releases and cycles are returned (children has one project node). " +
        "Set allProjects: true ONLY when the user explicitly asks for every project's releases/cycles",
      "Pass projectID (numeric currentProjectId from Fetch QMetry Project Info) when you already know it, to skip the server-side lookup; never put the projectKey in projectID",
      "If the current project can't be determined, the full tree (all projects) is returned: pick the node whose projID matches the project you want",
      "RESPONSE SHAPE: { children: [ { projID, type: <project name>, children: [ { relID, type: <release name>, scope: 'release', startdate?, targetdate?, children: [ { cyclID, type: <cycle name>, scope: 'cycle' } ] } ] } ] }",
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
    toolset: "Projects",
    summary: "Fetch QMetry builds from the project given by projectKey",
    handler: QMetryToolsHandlers.FETCH_BUILDS,
    inputSchema: BuildArgsSchema,
    purpose:
      "Retrieve builds information from the QMetry project given by projectKey. " +
      "Builds represent specific versions or iterations of software that can be associated with test executions. " +
      "This tool provides a list of builds with their metadata for test planning and execution tracking.",
    useCases: [
      "Fetch all from the project given by projectKey",
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
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "List of all builds with default pagination (10 items per page)",
      },
      {
        description: "Get builds with custom pagination",
        parameters: { projectKey: "MAC", page: 1, limit: 10, start: 0 },
        expectedOutput: "List of builds with custom pagination settings",
      },
      {
        description: "Filter builds by name",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":"Build 1.0","type":"string","field":"name"}]',
        },
        expectedOutput: "Filtered list of builds matching the name criteria",
      },
      {
        description: "Filter builds by archive status",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of builds filtered by archive status (archived and non-archived)",
      },
    ],
    hints: [
      "projectKey is required: pass the key of the project to read",
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
    toolset: "Projects",
    summary: "Fetch QMetry platforms from the project given by projectKey",
    handler: QMetryToolsHandlers.FETCH_PLATFORMS,
    inputSchema: PlatformArgsSchema,
    purpose:
      "Retrieve platforms information from the QMetry project given by projectKey. " +
      "Platforms represent testing environments, operating systems, browsers, or devices " +
      "that can be associated with test case execution and reporting. " +
      "This tool provides a list of platforms with their metadata for test planning and execution tracking.",
    useCases: [
      "Fetch all platforms from the project given by projectKey",
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
        parameters: { projectKey: "MAC" },
        expectedOutput:
          "List of all platforms with default pagination (10 items per page)",
      },
      {
        description: "Get platforms with custom pagination",
        parameters: { projectKey: "MAC", page: 1, limit: 10, start: 0 },
        expectedOutput: "List of platforms with custom pagination settings",
      },
      {
        description: "Filter platforms by name",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":"Chrome","type":"string","field":"name"}]',
        },
        expectedOutput: "Filtered list of platforms matching the name criteria",
      },
      {
        description: "Filter platforms by archive status",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of platforms filtered by archive status (archived and non-archived)",
      },
      {
        description: "Get only archived platforms",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only archived platforms",
      },
      {
        description: "Get only active/non-archived platforms",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only active/non-archived platforms",
      },
      {
        description: "Get platforms with custom sorting",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"name","direction":"ASC"}]',
        },
        expectedOutput: "List of platforms sorted by name in ascending order",
      },
    ],
    hints: [
      "projectKey is required: pass the key of the project to read",
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
    title: "Fetch API Call Quota",
    toolset: "Projects",
    summary:
      "Fetch the hourly and daily QMetry Open API call limits, calls consumed, calls remaining, and reset times",
    handler: QMetryToolsHandlers.FETCH_API_QUOTA_STATUS,
    inputSchema: ApiQuotaStatusArgsSchema,
    purpose:
      "Check the Open API call quota for the QMetry account behind the configured API key. " +
      "Returns whether limits are enforced, plus the hourly and daily limit, consumed and remaining counts, " +
      "and when each window resets. Calls to this tool do not count toward the quota.",
    useCases: [
      "Check how many API calls remain before running a large batch of operations",
      "Diagnose rate-limit or quota-exceeded errors returned by other QMetry tools",
      "Find out when the hourly or daily quota will reset",
      "Confirm whether API call limits are enabled for the instance",
    ],
    examples: [
      {
        description: "Check the current API call quota",
        parameters: {},
        expectedOutput:
          "limitEnabled flag, hourly and daily { limit, consumed, remaining, resetsAt }, and serverTime",
      },
    ],
    hints: [
      "No parameters are needed — the quota belongs to the account/API key, not to a project",
      "Calling this tool is free: it does not consume hourly or daily quota",
      "If limitEnabled is false, no API call limits are enforced and the counts are informational only",
      "resetsAt and serverTime are UTC ISO-8601 timestamps — compare resetsAt with serverTime, not with local time, to compute time until reset",
      "Before a large batch of create/update/link calls, check hourly.remaining and daily.remaining and warn the user if the batch would exceed them",
      "If another QMetry tool fails with a rate-limit or quota error, call this tool to report remaining calls and the reset time",
    ],
    outputDescription:
      "JSON object: limitEnabled (boolean), hourly and daily objects each with limit, consumed, remaining (numbers) and resetsAt (UTC timestamp), and serverTime (UTC timestamp)",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Create Release",
    toolset: "Projects",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
      "release.projectID is the numeric project ID, not the projectKey. If omitted, the server fills it from the project given by projectKey. Pass projectKey for the target project; do not put the key in projectID",
      "To set projectID explicitly, use currentProjectId from Fetch QMetry Project Info for the same projectKey",
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
    toolset: "Projects",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
      "1. Call 'Fetch Releases and Cycles' (same projectKey) to get the project's releases and their IDs",
      "2. From the response, get the release node's relID (path: children[<p>].children[<r>].relID; the release name is in its 'type' field)",
      "3. Use that numeric relID as the cycle.releaseID parameter",
      "Example: Release 'Q1 2024' might have releaseID: 12345",
      "CRITICAL WORKFLOW - IF USER PROVIDES RELEASE NAME:",
      "1. User says: 'Create cycle Sprint 2 in release Q1 2024'",
      "2. You MUST first call 'Fetch Releases and Cycles' to get all releases",
      "3. Search the release nodes for one whose 'type' (name) is 'Q1 2024'",
      "4. Take that release node's relID",
      "5. Use that relID as the cycle.releaseID parameter",
      "6. If release name not found, inform user and list available releases",
      "Example workflow:",
      "- User request: 'Create cycle Sprint 2 in Release 2.0'",
      "- Step 1: Call 'Fetch Releases and Cycles'",
      "- Step 2: Find the release node where type = 'Release 2.0', get its relID (e.g., 12345)",
      "- Step 3: Call CREATE_CYCLE with cycle.releaseID = 12345",
      "RELEASE NAME RESOLUTION:",
      "- NEVER assume or guess release IDs - always fetch from API",
      "- Release names are user-defined strings (e.g., 'Q1 2024', 'Release 2.0', 'Sprint 15')",
      "- Release IDs are numeric identifiers assigned by QMetry (e.g., 12345, 67890)",
      "- Match release names case-insensitively when searching",
      "- If multiple releases match the name, ask user to clarify or use the most recent one",
      "- 'Fetch Releases and Cycles' returns: { children: [ { projID, type: <project name>, children: [ { relID, type: <release name>, children: [ { cyclID, type: <cycle name> } ] } ] } ] }",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY",
      "Check your QMetry instance settings to determine the correct date format",
      "If dates are in wrong format, QMetry will return an error - verify format with admin",
      "cycle.projectID is the numeric project ID, not the projectKey. If omitted, the server fills it from the project given by projectKey. Pass projectKey for the target project; do not put the key in projectID",
      "To set projectID explicitly, use currentProjectId from Fetch QMetry Project Info for the same projectKey",
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
    toolset: "Projects",
    summary:
      "Update an existing cycle within a release in QMetry (name, start date or target date)",
    handler: QMetryToolsHandlers.UPDATE_CYCLE,
    inputSchema: UpdateCycleArgsSchema,
    purpose:
      "Update an existing cycle (a testing iteration, sprint or phase within a release). " +
      "Requires cycle.buildID and cycle.releaseID to identify the cycle, plus at least one of " +
      "cycle.name, cycle.startDate or cycle.targetDate to change.",
    useCases: [
      "Rename a cycle",
      "Move a cycle's start or target date after a schedule change",
      "Update a cycle's name and dates in one call",
    ],
    examples: [
      {
        description: "Update cycle name",
        parameters: {
          projectKey: "MAC",
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
          projectKey: "MAC",
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
          projectKey: "MAC",
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
      "CRITICAL: cycle.buildID and cycle.releaseID are REQUIRED",
      "CRITICAL: provide AT LEAST ONE of cycle.name, cycle.startDate, cycle.targetDate",
      "cycle.buildID is the cycle's numeric ID - QMetry calls cycles 'builds'. cycle.releaseID is the ID of the release that contains it",
      "HOW TO GET THE IDs: call Fetch Releases and Cycles, find the release by name, then the cycle by name WITHIN that release (case-insensitively); never guess IDs",
      "Cycle names can repeat across releases - if the user did not name the release and several cycles match, ask which one to update",
      "If the cycle is not found, tell the user and list the cycles available in that release",
      "Before renaming, check the Fetch Releases and Cycles response for another cycle with the same name in that release; if one exists, tell the user instead of calling this tool",
      "Omit cycle.name when not renaming",
      "Only include the fields you want to change - omitted fields stay unchanged",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY (check QMetry -> User Profile)",
      "To update the release itself use Update Release; to create a cycle use Create Cycle",
      "Verify the change afterwards with Fetch Releases and Cycles",
    ],
    outputDescription:
      "JSON object containing the updated cycle details and confirmation of update",
    readOnly: false,
    idempotent: true,
  },
  {
    title: "Update Release",
    toolset: "Projects",
    summary:
      "Update an existing release in QMetry (name, description, start date or target date)",
    handler: QMetryToolsHandlers.UPDATE_RELEASE,
    inputSchema: UpdateReleaseArgsSchema,
    purpose:
      "Update an existing release to keep release planning accurate. " +
      "Requires release.releaseID to identify the release, plus at least one of " +
      "release.name, release.description, release.startDate or release.targetDate to change.",
    useCases: [
      "Rename a release",
      "Update a release description",
      "Move a release's start or target date after a schedule change",
      "Update several release fields in one call",
    ],
    examples: [
      {
        description: "Rename a release (projectID filled from the project)",
        parameters: {
          projectKey: "MAC",
          release: {
            releaseID: 1631,
            name: "Q3-25 Performance Benchmarking",
          },
        },
        expectedOutput: "Release 1631 renamed successfully",
      },
      {
        description: "Update release dates",
        parameters: {
          projectKey: "MAC",
          release: {
            projectID: 347,
            releaseID: 1631,
            startDate: "06-25-2025",
            targetDate: "06-26-2025",
          },
        },
        expectedOutput: "Release 1631 dates updated successfully",
      },
      {
        description: "Update name, description and dates together",
        parameters: {
          projectKey: "MAC",
          release: {
            projectID: 347,
            releaseID: 1631,
            name: "Release 2.1",
            description: "<p><strong>Sprint 53</strong></p>",
            startDate: "06-25-2025",
            targetDate: "06-26-2025",
          },
        },
        expectedOutput:
          "Release 1631 updated with new name, description and dates",
      },
    ],
    hints: [
      "CRITICAL: release.releaseID is REQUIRED",
      "CRITICAL: provide AT LEAST ONE of release.name, release.description, release.startDate, release.targetDate",
      "release.projectID is the NUMERIC project ID, not the projectKey string. Usually omit it: the server fills it from the project given by projectKey. Pass projectKey for the target project; never put the key in projectID",
      "HOW TO GET releaseID: call Fetch Releases and Cycles and match the release by name (case-insensitively); never guess IDs",
      "If several releases match the name, ask the user which one to update",
      "Release names must be UNIQUE within a project. Before renaming, check the Fetch Releases and Cycles response for an existing release with the same name; " +
        "if one exists, tell the user instead of calling this tool. QMetry otherwise rejects the update with code AD.RELEASE_DUPLICATE ('Duplicate Release name is not allowed.')",
      "Omit release.name when not renaming - leaving it out never triggers the duplicate-name check",
      "Only include the fields you want to change - omitted fields stay unchanged",
      "Date format depends on QMetry instance configuration: DD-MM-YYYY or MM-DD-YYYY (check QMetry -> User Profile)",
      "release.description accepts HTML (e.g. '<p>text</p>')",
      "To update a cycle inside a release use Update Cycle; to create a release use Create Release",
      "Verify the change afterwards with Fetch Releases and Cycles",
    ],
    outputDescription:
      "JSON object containing the updated release details and confirmation of update",
    readOnly: false,
    idempotent: true,
  },
];
