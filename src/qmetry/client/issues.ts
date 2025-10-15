import { QMETRY_DEFAULTS } from "../config/constants.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
  type FetchIssuesLinkedToTestCasePayload,
} from "../types/issues.js";
import { qmetryRequest } from "./api/client-api.js";

function resolveDefaults(baseUrl?: string, project?: string) {
  return {
    resolvedBaseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    resolvedProject: project || QMETRY_DEFAULTS.PROJECT_KEY,
  };
}

/**
 * Fetches issues linked to a specific test case.
 * @throws If `linkedAsset` is missing/invalid.
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

  if (!body.linkedAsset || typeof body.linkedAsset !== "object") {
    throw new Error(
      "[fetchIssuesLinkedToTestCase] Missing or invalid required parameter: 'linkedAsset'.",
    );
  }

  if (!body.linkedAsset.type || body.linkedAsset.type !== "TC") {
    throw new Error(
      "[fetchIssuesLinkedToTestCase] Invalid linkedAsset.type. Must be 'TC'.",
    );
  }

  if (typeof body.linkedAsset.id !== "number") {
    throw new Error(
      "[fetchIssuesLinkedToTestCase] Missing or invalid linkedAsset.id. Must be a number.",
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
