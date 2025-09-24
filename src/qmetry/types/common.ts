export interface QMetryToolConfig {
  title: string;
  summary: string;
  purpose?: string;
  parameters: Array<{
    name: string;
    type: any;
    description: string;
    required: boolean;
    examples?: string[];
  }>;
  useCases?: string[];
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput: string;
  }>;
  hints?: string[];
  outputFormat?: string;
  readOnly?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
}
export interface QMetryToolsCollection {
  SET_PROJECT_INFO: QMetryToolConfig;
  FETCH_PROJECT_INFO: QMetryToolConfig;
  FETCH_TEST_CASES: QMetryToolConfig;
  FETCH_TEST_CASE_DETAILS: QMetryToolConfig;
  FETCH_TEST_CASE_VERSION_DETAILS: QMetryToolConfig;
  FETCH_TEST_CASE_STEPS: QMetryToolConfig;
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
