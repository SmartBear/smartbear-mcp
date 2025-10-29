import { z } from "zod";
import { QMETRY_DEFAULTS } from "../config/constants.js";

/**
 * QMetry API Request Configuration
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * - projectKey and baseUrl are TOOL-LEVEL parameters that get extracted before API calls
 * - They are sent as HTTP headers for authentication/routing, NOT in request bodies
 * - API payload types (like FetchTestCasesPayload) should exclude these parameters
 * - This separation prevents "Body is unusable" errors and follows proper API design
 */
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  token: string;
  project?: string; // Sent as HTTP header, not in body
  baseUrl: string; // Used for URL construction, not in body
  body?: any; // Only contains business logic parameters
}
export interface PaginationPayload {
  start?: number;
  page?: number;
  limit?: number;
}

export interface SortPayload {
  sort?: string;
}
export interface FilterPayload {
  filter?: string;
}
export interface FolderPayload {
  scope?: string;
  showRootOnly?: boolean;
  getSubEntities?: boolean;
  hideEmptyFolders?: boolean;
  folderSortColumn?: string;
  folderSortOrder?: "ASC" | "DESC";
  restoreDefaultColumns?: boolean;
  folderID?: number | null;
}

export const DEFAULT_PAGINATION: Required<PaginationPayload> = {
  start: 0,
  page: 1,
  limit: 10,
};

export const DEFAULT_FILTER: Required<FilterPayload> = {
  filter: "[]",
};

export const DEFAULT_SORT: Required<SortPayload> = {
  sort: '[{"property":"name","direction":"ASC"}]',
};

export const DEFAULT_FOLDER_OPTIONS: Required<
  Omit<FolderPayload, "folderID">
> & { folderID: null } = {
  scope: "project",
  showRootOnly: false,
  getSubEntities: true,
  hideEmptyFolders: false,
  folderSortColumn: "name",
  folderSortOrder: "ASC",
  restoreDefaultColumns: false,
  folderID: null,
};

// Reusable Zod schema components
export const CommonFields = {
  projectKey: z
    .string()
    .describe("Project key - unique identifier for the project")
    .default(QMETRY_DEFAULTS.PROJECT_KEY),
  projectKeyOptional: z
    .string()
    .optional()
    .describe("Project key - unique identifier for the project")
    .default(QMETRY_DEFAULTS.PROJECT_KEY),
  baseUrl: z
    .string()
    .url()
    .optional()
    .describe("The base URL for the QMetry instance (must be a valid URL)")
    .default(QMETRY_DEFAULTS.BASE_URL),
  start: z
    .number()
    .optional()
    .describe("Start index for pagination - defaults to 0")
    .default(0),
  page: z
    .number()
    .optional()
    .describe("Page number to return (starts from 1)")
    .default(1),
  limit: z
    .number()
    .optional()
    .describe("Number of records (default 10).")
    .default(10),
  tcID: z
    .number()
    .describe(
      "Test Case numeric ID. " +
        "This is the internal numeric identifier, not the entity key like 'MAC-TC-1684'. " +
        "You can get this ID from test case search results or by using filters.",
    ),
  id: z
    .number()
    .describe(
      "Test Case numeric ID (required for fetching steps or version details). " +
        "This is the internal numeric identifier, not the entity key like 'MAC-TC-1684'. " +
        "You can get this ID from test case search results.",
    ),
  version: z
    .number()
    .describe(
      "Test Case version number. " +
        "This is the internal numeric identifier for the version.",
    ),
  tcVersionID: z
    .number()
    .describe(
      "Test Case version number. " +
        "This is the internal numeric identifier for the version.",
    ),
  versionOptional: z
    .number()
    .optional()
    .describe(
      "Test Case version number (optional, defaults to 1). " +
        "This is the internal numeric identifier for the version.",
    ),
  rqID: z
    .number()
    .describe(
      "Requirement numeric ID (required for fetching specific requirement details). " +
        "This is the internal numeric identifier, not the entity key like 'MAC-RQ-730'. " +
        "You can get this ID from requirement search results or by using filters.",
    ),
  rqVersion: z
    .number()
    .describe(
      "Requirement version number (required for fetching specific requirement version details). " +
        "This is the internal numeric identifier for the version.",
    ),
  tcViewId: z
    .number()
    .describe(
      "ViewId for test cases - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
        "Leave empty unless you have a specific viewId. " +
        "System will fetch project info using the projectKey and extract latestViews.TC.viewId automatically. " +
        "Manual viewId only needed if you want to override the automatic resolution.",
    ),
  rqViewId: z
    .number()
    .describe(
      "ViewId for requirements - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
        "Leave empty unless you have a specific viewId. " +
        "System will fetch project info using the projectKey and extract latestViews.RQ.viewId automatically. " +
        "Manual viewId only needed if you want to override the automatic resolution.",
    ),
  rqFolderPath: z
    .string()
    .optional()
    .describe(
      "Folder path for requirements - SYSTEM AUTOMATICALLY SETS TO ROOT. " +
        'Leave empty unless you want specific folder. System will automatically use "" (root directory). ' +
        'Only specify if user wants specific folder like "Automation/Regression".',
    )
    .default(""),
  tcFolderPath: z
    .string()
    .optional()
    .describe(
      "Folder path for test cases - SYSTEM AUTOMATICALLY SETS TO ROOT. " +
        'Leave empty unless you want specific folder. System will automatically use "" (root directory). ' +
        'Only specify if user wants specific folder like "Automation/Regression".',
    )
    .default(""),
  folderID: z
    .number()
    .optional()
    .describe(
      "Folder ID - unique numeric identifier for the specific folder. " +
        "Use this to target a specific folder within the project hierarchy. " +
        "Applies to any entity type (test cases, requirements, test suites, etc.).",
    ),
  tsFolderID: z
    .number()
    .describe(
      "Test Suite folder ID (required for fetching test suites). " +
        "This is the numeric identifier for the test suite folder. " +
        "IMPORTANT: Get from project info response → rootFolders.TS.id (e.g., 113557 for MAC project). " +
        "Use FETCH_PROJECT_INFO tool first to get this ID if not provided by user. " +
        "For root folder: use rootFolders.TS.id, for sub-folders: use specific folder IDs.",
    ),
  tsID: z
    .number()
    .describe(
      "Test Suite numeric ID (required for fetching test cases linked to test suite). " +
        "This is the internal numeric identifier, not the entity key. " +
        "NOTE: To get the tsID - Call API 'Testsuite/Fetch Testsuite' " +
        "From the response, get value of following attribute -> data[<index>].id",
    ),
  gridName: z
    .string()
    .optional()
    .describe("Grid Name to be displayed (default 'TESTEXECUTIONLIST')"),
  teViewId: z
    .number()
    .optional()
    .describe(
      "ViewId for test execution - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
        "Leave empty unless you have a specific viewId. " +
        "System will fetch project info using the projectKey and extract latestViews.TE.viewId automatically. " +
        "Manual viewId only needed if you want to override the automatic resolution.",
    ),
  tsfeViewId: z
    .number()
    .describe(
      "ViewId for test suite folders - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
        "Leave empty unless you have a specific viewId. " +
        "System will fetch project info using the projectKey and extract latestViews.TSFS.viewId automatically. " +
        "Manual viewId only needed if you want to override the automatic resolution.",
    ),
  tsrunID: z
    .string()
    .describe(
      "Test Suite Run ID (required for fetching test case runs). " +
        "This is the string identifier for the test suite run execution. " +
        "NOTE: To get the tsrunID - Call API 'Execution/Fetch Executions' " +
        "From the response, get value of following attribute -> data[<index>].tsRunID",
    ),
  showTcWithDefects: z
    .boolean()
    .optional()
    .describe("Show test case runs with linked defects")
    .default(false),
  entityId: z
    .number()
    .describe(
      "Id of Test case run (required for fetching linked issues). " +
        "This is the internal numeric identifier for the test case run execution. " +
        "NOTE: To get the entityId - Call API 'Execution/Fetch Testcase Run ID' " +
        "From the response, get value of following attribute -> data[<index>].tcRunID",
    ),
  getLinked: z
    .boolean()
    .optional()
    .describe(
      "True to get only those issues that are linked with this Test case Run, " +
        "False to get those issues which are not linked with this Test case Run. " +
        "Default value true (get linked issues).",
    )
    .default(true),
  istcrFlag: z
    .boolean()
    .optional()
    .describe("Set True for test case run operations")
    .default(true),
  scope: z
    .string()
    .optional()
    .describe(
      "Scope of the operation - defines the context for data retrieval. " +
        "Common values: 'project' (default), 'folder', 'release', 'cycle'. " +
        "Applies to any entity type being fetched or operated upon.",
    )
    .default("project"),
  filter: z
    .string()
    .optional()
    .describe("Filter criteria as JSON string (default '[]')")
    .default("[]"),
  udfFilter: z
    .string()
    .optional()
    .describe("User-defined field filter as JSON string (default '[]')")
    .default("[]"),
  showRootOnly: z
    .boolean()
    .optional()
    .describe("Whether to show only root folders."),
  getSubEntities: z
    .boolean()
    .optional()
    .describe("Whether to include sub-entities."),
  getColumns: z
    .boolean()
    .optional()
    .describe("Whether to get column information in response.")
    .default(true),
  hideEmptyFolders: z
    .boolean()
    .optional()
    .describe("Whether to hide empty folders."),
  folderSortColumn: z
    .string()
    .optional()
    .describe("Folder sort column (default 'name')"),
  restoreDefaultColumns: z
    .boolean()
    .optional()
    .describe("Whether to restore default columns (default 'false')"),
  folderSortOrder: z
    .string()
    .optional()
    .describe("Folder sort order (ASC or DESC)"),
  showArchive: z
    .boolean()
    .optional()
    .describe(
      "Whether to include archived records in the results. " +
        "When true, returns both active and archived items. " +
        "When false, returns only active (non-archived) items. " +
        "Applies to any entity type being fetched (test cases, requirements, releases, cycles, builds, platforms, etc.).",
    ),
} as const;

export const ProjectListArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  params: z.object({
    showArchive: z
      .boolean()
      .optional()
      .describe(
        "Whether to include archived records in the results. " +
          "When true, returns both active and archived items. " +
          "When false, returns only active (non-archived) items. ",
      )
      .default(false),
  }),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const ProjectArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
});

export const ReleasesCyclesArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  showArchive: CommonFields.showArchive,
});

export const BuildArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const PlatformArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  sort: z
    .string()
    .optional()
    .describe(
      'Sort criteria as JSON string (default \'[{"property":"platformID","direction":"DESC"}]\')',
    )
    .default('[{"property":"platformID","direction":"DESC"}]'),
  filter: CommonFields.filter,
});

export const CreateTestCaseStepSchema = z.object({
  orderId: z.number(),
  description: z.string(),
  inputData: z.string().optional(),
  expectedOutcome: z.string().optional(),
  UDF: z.record(z.string()).optional(),
});

export const UpdateTestCaseRemoveStepSchema = z.object({
  tcID: z.number(),
  projectID: z.number(),
  tcStepID: z.number(),
  tcVersionID: z.number(),
  tcVersion: z.number(),
  tcsAttCount: z.number(),
  orderId: z.number(),
  description: z.string(),
  inputData: z.string().optional(),
  expectedOutcome: z.string().optional(),
  UDF: z.record(z.string()).optional(),
  tcsIsShared: z.boolean(),
  tcsIsParameterized: z.boolean(),
});

export const CreateTestCaseArgsSchema = z.object({
  tcFolderID: z.string(),
  steps: z.array(CreateTestCaseStepSchema).optional(),
  name: z.string(),
  priority: z.number().optional(),
  component: z.array(z.number()).optional(),
  testcaseOwner: z.number().optional(),
  testCaseState: z.number().optional(),
  testCaseType: z.number().optional(),
  estimatedTime: z.number().optional(),
  testingType: z.number().optional(),
  description: z.string().optional(),
  associateRelCyc: z.boolean().optional(),
  releaseCycleMapping: z
    .array(
      z.object({
        release: z.number(),
        cycle: z.array(z.number()),
        version: z.number().optional(),
      }),
    )
    .optional(),
});
export const UpdateTestCaseArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcID: CommonFields.tcID,
  tcVersionID: CommonFields.tcVersionID,
  withVersion: z.boolean().optional(),
  notrunall: z.boolean().optional(),
  isStepUpdated: z.boolean().optional(),
  steps: z.array(CreateTestCaseStepSchema).optional(),
  removeSteps: z.array(UpdateTestCaseRemoveStepSchema).optional(),
  name: z.string().optional(),
  priority: z.number().optional(),
  component: z.array(z.number()).optional(),
  owner: z.number().optional(),
  testCaseState: z.number().optional(),
  testCaseType: z.number().optional(),
  executionMinutes: z.number().optional(),
  testingType: z.number().optional(),
  description: z.string().optional(),
  updateOnlyMetadata: z.boolean().optional(),
});

export const TestCaseListArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  viewId: CommonFields.tcViewId,
  folderPath: CommonFields.tcFolderPath,
  folderID: CommonFields.folderID,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  scope: CommonFields.scope,
  showRootOnly: CommonFields.showRootOnly,
  getSubEntities: CommonFields.getSubEntities,
  hideEmptyFolders: CommonFields.hideEmptyFolders,
  folderSortColumn: CommonFields.folderSortColumn,
  restoreDefaultColumns: CommonFields.restoreDefaultColumns,
  folderSortOrder: CommonFields.folderSortOrder,
  filter: CommonFields.filter,
  udfFilter: CommonFields.udfFilter,
});

export const TestCaseDetailsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcID: CommonFields.tcID,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
});

export const TestCaseVersionDetailsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  id: CommonFields.id,
  version: CommonFields.version,
  scope: CommonFields.scope,
});

export const TestCaseStepsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  id: CommonFields.id,
  version: CommonFields.versionOptional,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
});

export const TestCaseExecutionsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcid: CommonFields.tcID,
  tcversion: CommonFields.versionOptional,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  scope: CommonFields.scope,
  filter: CommonFields.filter,
});

export const RequirementListArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  viewId: CommonFields.rqViewId,
  folderPath: CommonFields.rqFolderPath,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  scope: CommonFields.scope,
  getSubEntities: CommonFields.getSubEntities,
  hideEmptyFolders: CommonFields.hideEmptyFolders,
  folderSortColumn: CommonFields.folderSortColumn,
  folderSortOrder: CommonFields.folderSortOrder,
  isJiraFilter: z
    .boolean()
    .optional()
    .describe("'false' if using qmetry filter")
    .default(false),
  filterType: z
    .enum(["QMETRY", "JIRA"])
    .optional()
    .describe("Pass 'QMETRY' or 'JIRA'")
    .default("QMETRY"),
  filter: CommonFields.filter,
  udfFilter: CommonFields.udfFilter,
  sort: z
    .string()
    .optional()
    .describe(
      "Sort Records - refer json schema, Possible property - name, entityKey, associatedVersion, priorityAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, requirementStateAlias, linkedTcCount, linkedDfCount, attachmentCount, createdSystem, owner",
    )
    .default('[{"property":"name","direction":"ASC"}]'),
});

export const RequirementDetailsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  id: CommonFields.rqID,
  version: CommonFields.rqVersion,
});

export const RequirementsLinkedToTestCaseArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcID: CommonFields.tcID,
  getLinked: z
    .boolean()
    .optional()
    .describe(
      "True to get only requirements that are linked with this test case, " +
        "false to get requirements which are not linked with this test case. " +
        "Defaults to true (get linked requirements).",
    )
    .default(true),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  rqFolderPath: CommonFields.rqFolderPath,
  filter: CommonFields.filter,
});

export const LinkRequirementToTestCaseArgsSchema = z.object({
  tcID: z.string().describe("EntityKey of Testcase (e.g. 'COD-TC-29')"),
  tcVersionId: CommonFields.tcVersionID,
  rqVersionIds: z
    .string()
    .describe(
      "Comma-separated values of versionId of the Requirement (e.g. '236124,236125')",
    ),
});

export const TestCasesLinkedToRequirementArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  rqID: CommonFields.rqID,
  getLinked: z
    .boolean()
    .optional()
    .describe(
      "True to get only test cases that are linked with this requirement, " +
        "false to get test cases which are not linked with this requirement. " +
        "Defaults to true (get linked test cases).",
    )
    .default(true),
  showEntityWithReleaseCycle: z
    .boolean()
    .optional()
    .describe(
      "True to list only test cases which have given release and cycle, " +
        "false for all test cases regardless of release/cycle association. " +
        "Defaults to false (show all).",
    )
    .default(false),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  tcFolderPath: z
    .string()
    .optional()
    .describe(
      "Folder path to get test cases under specific folder. " +
        'Use empty string "" for root folder or specify path like "/Sample Template".',
    )
    .default(""),
  releaseID: z
    .string()
    .optional()
    .describe(
      "Filter test cases by release ID. " +
        "Use string representation of release ID (e.g., '7138'). " +
        "Get release IDs from FETCH_RELEASES_AND_CYCLES tool.",
    ),
  cycleID: z
    .string()
    .optional()
    .describe(
      "Filter test cases by cycle ID. " +
        "Use string representation of cycle ID (e.g., '13382'). " +
        "Get cycle IDs from FETCH_RELEASES_AND_CYCLES tool.",
    ),
  filter: CommonFields.filter,
  getSubEntities: z
    .boolean()
    .optional()
    .describe("Allow filter of sub-entities for requirement.")
    .default(true),
  getColumns: z
    .boolean()
    .optional()
    .describe("True to get column information in response.")
    .default(true),
});

export const CreateTestSuiteArgsSchema = z.object({
  parentFolderId: z.string(),
  name: z.string(),
  isAutomatedFlag: z.boolean().optional(),
  description: z.string().optional(),
  testsuiteOwner: z.number().optional(),
  testSuiteState: z.number().optional(),
  associateRelCyc: z.boolean().optional(),
  releaseCycleMapping: z
    .array(
      z.object({
        buildID: z.number(),
        releaseId: z.number(),
      }),
    )
    .optional(),
});

export const UpdateTestSuiteArgsSchema = z.object({
  id: z.number().describe("Id of Test Suite to be updated (required)"),
  TsFolderID: z
    .number()
    .describe("Folder ID where Test Suite resides (required)"),
  entityKey: z
    .string()
    .describe("Entity Key of Test Suite to be updated (required)"),
  name: z.string().optional().describe("Name of the Test Suite"),
  description: z.string().optional().describe("Description of the Test Suite"),
  testsuiteOwner: z.number().optional().describe("Owner ID of the Test Suite"),
  testSuiteState: z.number().optional().describe("State of the Test Suite"),
});

export const TestSuitesForTestCaseArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tsFolderID: CommonFields.tsFolderID,
  viewId: CommonFields.tsfeViewId.optional(),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  getColumns: CommonFields.getColumns,
  filter: CommonFields.filter,
});

export const LinkTestCasesToTestSuiteArgsSchema = z
  .object({
    tsID: z.number().describe("Id of Test Suite (required)"),
    tcvdIDs: z
      .array(z.number())
      .describe(
        "Array of Test Case Version IDs (required if fromReqs is false)",
      ),
    fromReqs: z
      .boolean()
      .optional()
      .describe("Link TestCases from Requirements (optional, default false)"),
  })
  .strip();

export const RequirementsLinkedTestCasesToTestSuiteArgsSchema = z
  .object({
    tsID: z.number().describe("Id of Test Suite (required)"),
    tcvdIDs: z
      .array(z.number())
      .describe(
        "Array of Test Case Version IDs (required if fromReqs is true)",
      ),
    fromReqs: z
      .boolean()
      .optional()
      .describe("Link TestCases from Requirements (optional, default true)"),
  })
  .strip();

export const IssuesLinkedToTestCaseArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcID: CommonFields.tcID,
  getLinked: CommonFields.getLinked.optional().default(true),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const TestCasesByTestSuiteArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tsID: CommonFields.tsID,
  getLinked: CommonFields.getLinked.optional().default(true),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const ExecutionsByTestSuiteArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tsID: CommonFields.tsID, // API payload param - sent in request body (REQUIRED)
  tsFolderID: CommonFields.tsFolderID.optional(),
  gridName: CommonFields.gridName,
  viewId: CommonFields.teViewId,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const TestCaseRunsByTestSuiteRunArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tsrunID: CommonFields.tsrunID, // API payload param - sent in request body (REQUIRED)
  viewId: CommonFields.teViewId.pipe(z.number()), // API payload param - sent in request body (REQUIRED)
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
});

export const LinkedIssuesByTestCaseRunArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  entityId: CommonFields.entityId, // API payload param - sent in request body (REQUIRED)
  getLinked: CommonFields.getLinked,
  getColumns: CommonFields.getColumns,
  istcrFlag: CommonFields.istcrFlag,
  start: CommonFields.start,
  page: CommonFields.page,
  limit: CommonFields.limit,
  filter: CommonFields.filter,
});

export const CreateIssueArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  issueType: z.number().describe("Issue type ID (e.g. Bug, Enhancement, etc.)"),
  issuePriority: z
    .number()
    .describe("Issue priority ID (e.g. High, Medium, Low, etc.)"),
  summary: z.string().describe("Summary or title of the defect/issue"),
  description: z
    .string()
    .optional()
    .describe("Detailed description of the defect/issue"),
  sync_with: z
    .string()
    .optional()
    .describe("External system to sync with (e.g. JIRA, QMetry, etc.)"),
  issueOwner: z.number().optional().describe("Owner/user ID for the issue"),
  component: z
    .array(z.number())
    .optional()
    .describe("Component IDs associated with the issue"),
  affectedRelease: z
    .array(z.number())
    .optional()
    .describe("Release IDs affected by this issue"),
  affectedCycles: z
    .array(z.number())
    .optional()
    .describe("Cycle IDs affected by this issue"),
  tcRunID: z
    .number()
    .optional()
    .describe(
      "Test Case Run ID to link this defect/issue to a test execution (optional)",
    ),
});

export const UpdateIssueArgsSchema = z.object({
  DefectId: z.number().describe("ID of the defect/issue to be updated"),
  entityKey: z
    .string()
    .optional()
    .describe("Entity Key of the defect/issue to be updated"),
  issueType: z
    .number()
    .optional()
    .describe("Issue type ID (e.g. Bug, Enhancement, etc.)"),
  issuePriority: z
    .number()
    .optional()
    .describe("Issue priority ID (e.g. High, Medium, Low, etc.)"),
  summary: z
    .string()
    .optional()
    .describe("Summary or title of the defect/issue"),
  description: z
    .string()
    .optional()
    .describe("Detailed description of the defect/issue"),
  issueOwner: z.number().optional().describe("Owner/user ID for the issue"),
  affectedRelease: z
    .number()
    .optional()
    .describe("Release IDs affected by this issue"),
  affectedCycles: z
    .number()
    .optional()
    .describe("Cycle IDs affected by this issue"),
});

// Export for Link Issues to Testcase Run tool
export const LinkIssuesToTestcaseRunArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  issueIds: z
    .array(z.union([z.string(), z.number()]))
    .describe("ID of issues to be linked to Testcase Run"),
  tcrId: z.number().describe("ID of Testcase Run to link issues with"),
});
