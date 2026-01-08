import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type BulkUpdateExecutionStatusPayload,
  type CreateTestSuitePayload,
  DEFAULT_BULK_UPDATE_EXECUTION_STATUS_PAYLOAD,
  DEFAULT_CREATE_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_TESTSUITES_PAYLOAD,
  DEFAULT_LINKED_PLATFORMS_TO_TESTSUITE_PAYLOAD,
  DEFAULT_LINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
  DEFAULT_REQLINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
  DEFAULT_UPDATE_TESTSUITE_PAYLOAD,
  type FetchExecutionsByTestSuitePayload,
  type FetchLinkedIssuesByTestCaseRunPayload,
  type FetchTestCaseRunsByTestSuiteRunPayload,
  type FetchTestCasesByTestSuitePayload,
  type FetchTestSuitesForTestCasePayload,
  type FetchTestSuitesPayload,
  type LinkedPlatformsToTestSuitePayload,
  type LinkedTestCasesToTestSuitePayload,
  type ReqLinkedTestCasesToTestSuitePayload,
  type UpdateTestSuitePayload,
} from "../types/testsuite";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

/**
 * Create test suites.
 * @throws If `parentFolderId` or `name` are missing/invalid.
 */
export async function createTestSuites(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateTestSuitePayload = {
    ...DEFAULT_CREATE_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.parentFolderId !== "string") {
    throw new Error(
      "[createTestSuites] Missing or invalid required parameter: 'parentFolderId'.",
    );
  }
  if (typeof body.name !== "string") {
    throw new Error(
      "[createTestSuites] Missing or invalid required parameter: 'name'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.CREATE_UPDATE_TS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update test suites.
 * @throws If `id` or `entityKey` or `TsFolderID` are missing/invalid.
 */
export async function updateTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: UpdateTestSuitePayload = {
    ...DEFAULT_UPDATE_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.id !== "number") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.entityKey !== "string") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'entityKey'.",
    );
  }
  if (typeof body.TsFolderID !== "number") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'TsFolderID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.CREATE_UPDATE_TS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a list of test suites.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchTestSuites(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestSuitesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestSuitesPayload = {
    ...DEFAULT_FETCH_TESTSUITES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestSuites] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new Error(
      "[fetchTestSuites] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TS_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test suites to link with test case.
 * @throws If `tsFolderID` is missing/invalid.
 */
export async function fetchTestSuitesForTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestSuitesForTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestSuitesForTestCasePayload = {
    ...DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsFolderID !== "number") {
    throw new Error(
      "[fetchTestSuitesForTestCase] Missing or invalid required parameter: 'tsFolderID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TS_LIST_FOR_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test cases linked to a given test suite.
 * @throws If `tsID` is missing/invalid.
 */
export async function fetchTestCasesByTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesByTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesByTestSuitePayload = {
    ...DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[fetchTestCasesByTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TESTCASES_BY_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches executions for a given test suite.
 * @throws If `tsID` is missing/invalid.
 */
export async function fetchExecutionsByTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchExecutionsByTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchExecutionsByTestSuitePayload = {
    ...DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[fetchExecutionsByTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_EXECUTIONS_BY_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test case runs for a given test suite run ID.
 * @throws If `tsrunID` or `viewId` is missing/invalid.
 */
export async function fetchTestCaseRunsByTestSuiteRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseRunsByTestSuiteRunPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseRunsByTestSuiteRunPayload = {
    ...DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsrunID !== "string" || !body.tsrunID) {
    throw new Error(
      "[fetchTestCaseRunsByTestSuiteRun] Missing or invalid required parameter: 'tsrunID'.",
    );
  }

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestCaseRunsByTestSuiteRun] Missing or invalid required parameter: 'viewId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches linked issues for a specific test case run.
 * @throws If `entityId` is missing/invalid.
 */
export async function fetchLinkedIssuesByTestCaseRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchLinkedIssuesByTestCaseRunPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchLinkedIssuesByTestCaseRunPayload = {
    ...DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD,
    ...payload,
  };

  if (typeof body.entityId !== "number") {
    throw new Error(
      "[fetchLinkedIssuesByTestCaseRun] Missing or invalid required parameter: 'entityId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_LINKED_ISSUES_BY_TESTCASE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Link test cases to a test suite.
 * @throws If `tcID` or `tcVersionID` are missing/invalid.
 */
export async function linkTestCasesToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkedTestCasesToTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: LinkedTestCasesToTestSuitePayload = {
    ...DEFAULT_LINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[linkTestCasesToTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  if (!body.tcvdIDs) {
    throw new Error("[linkTestCasesToTestSuite] 'tcvdIDs' must be provided.");
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINKED_TESTCASES_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Requirements Linked test cases to a test suite.
 * @throws If `tcID` or `rqVersionIds` are missing/invalid.
 */
export async function reqLinkedTestCasesToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: ReqLinkedTestCasesToTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: ReqLinkedTestCasesToTestSuitePayload = {
    ...DEFAULT_REQLINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[reqLinkedTestCasesToTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  if (!body.tcvdIDs) {
    throw new Error(
      "[reqLinkedTestCasesToTestSuite] 'tcvdIDs' must be provided.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINKED_TESTCASES_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Link platforms to a test suite.
 * @throws If `qmTsId` or `qmPlatformId` are missing/invalid.
 */
export async function linkPlatformsToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkedPlatformsToTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: LinkedPlatformsToTestSuitePayload = {
    ...DEFAULT_LINKED_PLATFORMS_TO_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.qmTsId !== "number") {
    throw new Error(
      "[linkPlatformsToTestSuite] Missing or invalid required parameter: 'qmTsId'.",
    );
  }

  if (
    !body.qmPlatformId ||
    typeof body.qmPlatformId !== "string" ||
    body.qmPlatformId.trim().length === 0
  ) {
    throw new Error(
      "[linkPlatformsToTestSuite] Missing or invalid required parameter: 'qmPlatformId'. It must be a non-empty comma-separated string of Platform IDs.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINK_PLATFORMS_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Bulk update execution status for test case runs.
 * @throws If `entityIDs`, `entityType`, `qmTsRunId`, or `runStatusID` are missing/invalid.
 */
export async function bulkUpdateExecutionStatus(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: BulkUpdateExecutionStatusPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: BulkUpdateExecutionStatusPayload = {
    ...DEFAULT_BULK_UPDATE_EXECUTION_STATUS_PAYLOAD,
    ...payload,
  };

  if (
    !body.entityIDs ||
    typeof body.entityIDs !== "string" ||
    body.entityIDs.trim().length === 0
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'entityIDs'. It must be a non-empty comma-separated string of Test Case Run IDs.",
    );
  }

  if (
    !body.entityType ||
    (body.entityType !== "TCR" && body.entityType !== "TCSR")
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'entityType'. Must be 'TCR' or 'TCSR'.",
    );
  }

  if (
    !body.qmTsRunId ||
    typeof body.qmTsRunId !== "string" ||
    body.qmTsRunId.trim().length === 0
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'qmTsRunId'. It must be a non-empty string.",
    );
  }

  if (typeof body.runStatusID !== "number") {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'runStatusID'. It must be a number.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.BULK_UPDATE_EXECUTION_STATUS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
