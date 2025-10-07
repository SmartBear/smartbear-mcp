import {
  DEFAULT_FILTER,
  DEFAULT_FOLDER_OPTIONS,
  DEFAULT_PAGINATION,
  type FilterPayload,
  type FolderPayload,
  type PaginationPayload,
} from "./common.js";

export interface FetchTestCasesPayload
  extends PaginationPayload,
    FilterPayload,
    FolderPayload {
  viewId: number; // required
  folderPath: string; // required
  udfFilter?: string; // only this API uses udfFilter
}
export interface FetchTestCaseDetailsPayload
  extends PaginationPayload,
    FilterPayload {
  tcID: number; // required
}
export interface FetchTestCaseVersionDetailsPayload
  extends FilterPayload,
    Pick<FolderPayload, "scope"> {
  id: number; // required
  version: number; // required default 1
}
export interface FetchTestCaseStepsPayload extends PaginationPayload {
  id: number; // required
  version?: number; // optional, defaults to 1
}

export interface FetchTestCasesLinkedToRequirementPayload
  extends PaginationPayload,
    FilterPayload {
  rqID: number; // required - numeric ID of requirement
  getLinked?: boolean; // true to get linked TCs, false to get unlinked TCs
  showEntityWithReleaseCycle?: boolean; // true to show only TCs with given release/cycle
  tcFolderPath?: string; // folder path for test cases
  releaseID?: string; // filter by release ID
  cycleID?: string; // filter by cycle ID
  getSubEntities?: boolean; // allow filter of sub-entities
  getColumns?: boolean; // true to get column information
}

export const DEFAULT_FETCH_TESTCASES_PAYLOAD: Omit<
  FetchTestCasesPayload,
  "viewId" | "folderPath"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  ...DEFAULT_FOLDER_OPTIONS,
  udfFilter: "[]",
};

export const DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD: Omit<
  FetchTestCaseDetailsPayload,
  "tcID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
};

export const DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD: Omit<
  FetchTestCaseVersionDetailsPayload,
  "id" | "version"
> = {
  ...DEFAULT_FILTER,
  scope: DEFAULT_FOLDER_OPTIONS.scope,
};

export const DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD: Omit<
  FetchTestCaseStepsPayload,
  "id"
> = {
  ...DEFAULT_PAGINATION,
  version: 1,
};

export const DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD: Omit<
  FetchTestCasesLinkedToRequirementPayload,
  "rqID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
  showEntityWithReleaseCycle: false,
  tcFolderPath: "",
  getSubEntities: true,
  getColumns: true,
};
