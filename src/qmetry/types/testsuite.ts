import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  type FilterPayload,
  type PaginationPayload,
} from "./common.js";

export interface ReleaseCycleMapping {
  releaseId: number;
  buildID: number;
}

export interface CreateTestSuitePayload {
  parentFolderId: string; // required - Test Case folder ID
  name: string; // required - Test Case name
  isAutomatedFlag?: boolean; // optional - Indicates if the test case is automated
  testsuiteOwner?: number; // optional - OwnerId of Testcase
  testSuiteState?: number; // optional - StatusId of Testcase
  description?: string; // optional - Description of Testcase
  associateRelCyc?: boolean; // optional - associate release cycle
  releaseCycleMapping?: ReleaseCycleMapping[]; // optional - release cycle mapping
}
export interface UpdateTestSuitePayload {
  id: number; // required - Test Suite ID
  TsFolderID: number; // required - Test Suite folder ID
  entityKey: string; // required - Test Case folder ID
  name?: string; // required - Test Case name
  testsuiteOwner?: number; // optional - OwnerId of Testcase
  testSuiteState?: number; // optional - StatusId of Testcase
  description?: string; // optional - Description of Testcase
}
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
  getLinked?: boolean; // optional - True to get linked test cases, false for unlinked (default: true)
}

export const DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD: Omit<
  FetchTestCasesByTestSuitePayload,
  "tsID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
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
  extends PaginationPayload {
  tsrunID: string; // required - Test Suite Run ID (STRING format - get from executions API)
  viewId: number; // required - View ID for test execution (get from project info latestViews.TE.viewId)
}

export interface LinkedTestCasesToTestSuitePayload {
  tsID: number; // required - Test Suite ID
  tcvdIDs: number[]; // required - Array of Test Case Version IDs (used if fromReqs is false or undefined)
  fromReqs?: boolean; // optional - Indicates whether to link from requirements
}

export interface ReqLinkedTestCasesToTestSuitePayload {
  tsID: number; // required - Test Suite ID
  tcvdIDs: number[]; // required - Array of Test Case Version IDs (used if fromReqs is true)
  fromReqs?: boolean; // optional - Indicates whether to link from requirements
}

export const DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD: Omit<
  FetchTestCaseRunsByTestSuiteRunPayload,
  "tsrunID" | "viewId"
> = {
  ...DEFAULT_PAGINATION,
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

export const DEFAULT_LINKED_TESTCASE_TO_TESTSUITE_PAYLOAD: Omit<
  LinkedTestCasesToTestSuitePayload,
  "tsID" | "tcvdIDs"
> = {
  fromReqs: false,
};

export const DEFAULT_REQLINKED_TESTCASE_TO_TESTSUITE_PAYLOAD: Omit<
  ReqLinkedTestCasesToTestSuitePayload,
  "tsID" | "tcvdIDs"
> = {
  fromReqs: true,
};

export const DEFAULT_CREATE_TESTSUITE_PAYLOAD: Omit<
  CreateTestSuitePayload,
  "parentFolderId" | "name"
> = {
  isAutomatedFlag: false,
};

export const DEFAULT_UPDATE_TESTSUITE_PAYLOAD: Omit<
  UpdateTestSuitePayload,
  "entityKey" | "TsFolderID" | "id"
> = {};
