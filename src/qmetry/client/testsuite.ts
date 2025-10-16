import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
  type FetchExecutionsByTestSuitePayload,
  type FetchLinkedIssuesByTestCaseRunPayload,
  type FetchTestCaseRunsByTestSuiteRunPayload,
  type FetchTestCasesByTestSuitePayload,
  type FetchTestSuitesForTestCasePayload,
} from "../types/testsuite.js";
import { qmetryRequest } from "./api/client-api.js";
import { resolveDefaults } from "./utils.js";

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
