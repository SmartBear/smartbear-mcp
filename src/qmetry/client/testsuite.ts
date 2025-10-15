import { QMETRY_DEFAULTS } from "../config/constants.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
  type FetchTestSuitesForTestCasePayload,
} from "../types/testsuite.js";
import { qmetryRequest } from "./api/client-api.js";

function resolveDefaults(baseUrl?: string, project?: string) {
  return {
    resolvedBaseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    resolvedProject: project || QMETRY_DEFAULTS.PROJECT_KEY,
  };
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
