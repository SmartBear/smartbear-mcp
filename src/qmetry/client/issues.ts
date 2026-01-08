import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type CreateIssuePayload,
  DEFAULT_CREATE_ISSUE_PAYLOAD,
  DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_ISSUES_PAYLOAD,
  DEFAULT_LINK_ISSUES_TO_TESTCASE_RUN_PAYLOAD,
  DEFAULT_UPDATE_ISSUE_PAYLOAD,
  type FetchIssuesLinkedToTestCasePayload,
  type FetchIssuesPayload,
  type LinkIssuesToTestcaseRunPayload,
  type UpdateIssuePayload,
} from "../types/issues";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

/**
 * Create Defect/Issue.
 * @throws If `issueType` or `issuePriority` or `summary` are missing/invalid.
 */
export async function createIssue(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateIssuePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateIssuePayload = {
    ...DEFAULT_CREATE_ISSUE_PAYLOAD,
    ...payload,
  };

  if (typeof body.issueType !== "number") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'issueType'.",
    );
  }
  if (typeof body.issuePriority !== "number") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'issuePriority'.",
    );
  }
  if (typeof body.summary !== "string") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'summary'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.CREATE_UPDATE_ISSUE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update Defect/Issue.
 * @throws If `DefectId` is missing/invalid.
 */
export async function updateIssue(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateIssuePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: UpdateIssuePayload = {
    ...DEFAULT_UPDATE_ISSUE_PAYLOAD,
    ...payload,
  };

  if (typeof body.DefectId !== "number") {
    throw new Error(
      "[updateIssue] Missing or invalid required parameter: 'DefectId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.ISSUES.CREATE_UPDATE_ISSUE,
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
export async function fetchIssues(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchIssuesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchIssuesPayload = {
    ...DEFAULT_FETCH_ISSUES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchIssues] Missing or invalid required parameter: 'viewId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUES_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches issues linked to a specific test case.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchIssuesLinkedToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchIssuesLinkedToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchIssuesLinkedToTestCasePayload = {
    ...DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[fetchIssuesLinkedToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUES_LINKED_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Link Issues to Testcase Run.
 * @throws If issueIds or tcrId are missing/invalid.
 */
export async function linkIssuesToTestcaseRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkIssuesToTestcaseRunPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: LinkIssuesToTestcaseRunPayload = {
    ...DEFAULT_LINK_ISSUES_TO_TESTCASE_RUN_PAYLOAD,
    ...payload,
  };

  if (!Array.isArray(body.issueIds) || body.issueIds.length === 0) {
    throw new Error(
      "[linkIssuesToTestcaseRun] Missing or invalid required parameter: 'issueIds'.",
    );
  }

  if (typeof body.tcrId !== "number") {
    throw new Error(
      "[linkIssuesToTestcaseRun] Missing or invalid required parameter: 'tcrId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.ISSUES.LINK_ISSUES_TO_TESTCASE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
