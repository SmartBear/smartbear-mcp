import { z } from "zod";
import { QMETRY_DEFAULTS } from "../config/constants.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  token: string;
  project?: string;
  baseUrl: string;
  body?: any;
}
export interface PaginationPayload {
  start?: number;
  page?: number;
  limit?: number;
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
      "Test Case numeric ID (required for fetching specific test case details). " +
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
      "Test Case version number (required for fetching specific test case version details). " +
        "This is the internal numeric identifier for the version.",
    ),
  versionOptional: z
    .number()
    .optional()
    .describe(
      "Test Case version number (optional, defaults to 1). " +
        "This is the internal numeric identifier for the version.",
    ),
  viewId: z
    .number()
    .describe(
      "ViewId for test cases - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
        "Leave empty unless you have a specific viewId. " +
        "System will fetch project info using the projectKey and extract latestViews.TC.viewId automatically. " +
        "Manual viewId only needed if you want to override the automatic resolution.",
    ),
  folderPath: z
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
      "Folder ID for test cases - unique identifier for the folder containing test cases",
    ),
  scope: z
    .string()
    .optional()
    .describe("Scope of the test cases (default 'project')")
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
} as const;

export const ProjectArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
});

export const TestCaseListArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  viewId: CommonFields.viewId,
  folderPath: CommonFields.folderPath,
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
