import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
  type FetchIssuesLinkedToTestCasePayload,
} from "../types/issues.js";
import { qmetryRequest } from "./api/client-api.js";
import { resolveDefaults } from "./utils.js";

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
