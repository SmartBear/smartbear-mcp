import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  type CreateTestCasesPayload,
  DEFAULT_CREATE_TESTCASES_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_EXECUTIONS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_PAYLOAD,
  DEFAULT_LINKED_REQUIREMENT_TO_TESTCASE_PAYLOAD,
  DEFAULT_UPDATE_TESTCASES_PAYLOAD,
  type FetchTestCaseDetailsPayload,
  type FetchTestCaseExecutionsPayload,
  type FetchTestCaseStepsPayload,
  type FetchTestCasesLinkedToRequirementPayload,
  type FetchTestCasesPayload,
  type FetchTestCaseVersionDetailsPayload,
  type linkRequirementToTestCasePayload,
  type UpdateTestCasesPayload,
} from "../types/testcase.js";
import { qmetryRequest } from "./api/client-api.js";
import { resolveDefaults } from "./utils.js";

/**
 * Create test cases.
 * @throws If `tcFolderID` or `name` are missing/invalid.
 */
export async function createTestCases(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateTestCasesPayload = {
    ...DEFAULT_CREATE_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcFolderID !== "string") {
    throw new Error(
      "[createTestCases] Missing or invalid required parameter: 'tcFolderID'.",
    );
  }
  if (typeof body.name !== "string") {
    throw new Error(
      "[createTestCases] Missing or invalid required parameter: 'name'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.CREATE_UPDATE_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update test cases.
 * @throws If `tcID` or `tcVersionID` are missing/invalid.
 */
export async function updateTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: UpdateTestCasesPayload = {
    ...DEFAULT_UPDATE_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[updateTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }
  if (typeof body.tcVersionID !== "number") {
    throw new Error(
      "[updateTestCase] Missing or invalid required parameter: 'tcVersionID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTCASE.CREATE_UPDATE_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a list of test cases.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchTestCases(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesPayload = {
    ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestCases] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new Error(
      "[fetchTestCases] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case details.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchTestCaseDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseDetailsPayload = {
    ...DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[fetchTestCaseDetails] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_DETAILS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case details by version.
 * @throws If `id` is missing/invalid.
 */
export async function fetchTestCaseVersionDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseVersionDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseVersionDetailsPayload = {
    ...DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD,
    ...payload,
  };

  if (!body.id) {
    throw new Error(
      "[fetchTestCaseVersionDetails] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.version !== "number") {
    throw new Error(
      "[fetchTestCaseVersionDetails] Missing or invalid required parameter: 'version'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_DETAILS_BY_VERSION,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case steps.
 * @throws If `id` is missing/invalid.
 */
export async function fetchTestCaseSteps(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseStepsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseStepsPayload = {
    ...DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD,
    ...payload,
  };

  if (typeof body.id !== "number") {
    throw new Error(
      "[fetchTestCaseSteps] Missing or invalid required parameter: 'id'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_STEPS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test cases linked to a specific requirement.
 * @throws If `rqID` is missing/invalid.
 */
export async function fetchTestCasesLinkedToRequirement(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesLinkedToRequirementPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesLinkedToRequirementPayload = {
    ...DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD,
    ...payload,
  };

  if (typeof body.rqID !== "number") {
    throw new Error(
      "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_LINKED_TO_RQ,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches executions for a specific test case.
 * @throws If `tcid` is missing/invalid.
 */
export async function fetchTestCaseExecutions(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseExecutionsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseExecutionsPayload = {
    ...DEFAULT_FETCH_TESTCASE_EXECUTIONS_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcid !== "number") {
    throw new Error(
      "[fetchTestCaseExecutions] Missing or invalid required parameter: 'tcid'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_EXECUTIONS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Links a requirement to a test case.
 * @throws If `tcID` or `tcVersionID` or `rqVersionIds` are missing/invalid.
 */
export async function linkRequirementToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: linkRequirementToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: linkRequirementToTestCasePayload = {
    ...DEFAULT_LINKED_REQUIREMENT_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "string") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }
  if (typeof body.tcVersionId !== "number") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'tcVersionId'.",
    );
  }
  if (typeof body.rqVersionIds !== "string") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'rqVersionIds'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTCASE.LINKED_RQ_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
