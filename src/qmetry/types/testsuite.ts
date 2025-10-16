import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  type FilterPayload,
  type PaginationPayload,
  type SortPayload,
} from "./common.js";

export interface FetchTestSuitesForTestCasePayload
  extends PaginationPayload,
    FilterPayload {
  tsFolderID: number; // required - Test Suite folder ID
  viewId?: number; // optional - Test Suite folder view ID (auto-resolved if not provided)
  getColumns?: boolean; // whether to get column information
}

export const DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD: Omit<
  FetchTestSuitesForTestCasePayload,
  "tsFolderID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getColumns: true,
};

export interface FetchTestCasesByTestSuitePayload
  extends PaginationPayload,
    FilterPayload {
  tsID: number; // required - Test Suite ID
}

export const DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD: Omit<
  FetchTestCasesByTestSuitePayload,
  "tsID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
};

export interface FetchExecutionsByTestSuitePayload
  extends PaginationPayload,
    FilterPayload {
  tsID: number; // required - Test Suite ID
  tsFolderID?: number; // optional - Test Suite folder ID
  gridName?: string; // optional - Grid Name to be displayed
  viewId?: number; // optional - View ID for executions
}

export const DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD: Omit<
  FetchExecutionsByTestSuitePayload,
  "tsID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  gridName: "TESTEXECUTIONLIST",
};

export interface FetchTestCaseRunsByTestSuiteRunPayload
  extends PaginationPayload,
    FilterPayload,
    SortPayload {
  tsrunID: string; // required - Test Suite Run ID (STRING format - get from executions API)
  viewId: number; // required - View ID for test execution (get from project info latestViews.TE.viewId)
  showTcWithDefects?: boolean; // optional - Show test case runs with linked defects
  udfFilter?: string; // optional - User-defined field filter
}

export const DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD: Omit<
  FetchTestCaseRunsByTestSuiteRunPayload,
  "tsrunID" | "viewId"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  ...DEFAULT_SORT,
  showTcWithDefects: false,
  udfFilter: "[]",
};

export interface FetchLinkedIssuesByTestCaseRunPayload
  extends PaginationPayload,
    FilterPayload {
  entityId: number; // required - Test Case Run ID
  getLinked?: boolean; // optional - True to get linked issues, false for unlinked
  istcrFlag?: boolean; // optional - Set true for test case run operations
  getColumns?: boolean; // optional - True to get column information in response
}

export const DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD: Omit<
  FetchLinkedIssuesByTestCaseRunPayload,
  "entityId"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
  getColumns: true,
  istcrFlag: true,
};
