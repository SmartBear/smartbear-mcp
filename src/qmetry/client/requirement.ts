import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD,
  DEFAULT_FETCH_REQUIREMENTS_LINKED_TO_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_REQUIREMENTS_PAYLOAD,
  type FetchRequirementDetailsPayload,
  type FetchRequirementsLinkedToTestCasePayload,
  type FetchRequirementsPayload,
} from "../types/requirements";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

/**
 * Fetches a list of requirements.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchRequirements(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementsPayload = {
    ...DEFAULT_FETCH_REQUIREMENTS_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchRequirements] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new Error(
      "[fetchRequirements] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches requirement details by numeric ID.
 * @throws If `id` or `version` are missing/invalid.
 */
export async function fetchRequirementDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementDetailsPayload = {
    ...DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD,
    ...payload,
  };

  if (typeof body.id !== "number") {
    throw new Error(
      "[fetchRequirementDetails] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.version !== "number") {
    throw new Error(
      "[fetchRequirementDetails] Missing or invalid required parameter: 'version'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_DETAILS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches requirements linked to a specific test case.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchRequirementsLinkedToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementsLinkedToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementsLinkedToTestCasePayload = {
    ...DEFAULT_FETCH_REQUIREMENTS_LINKED_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[fetchRequirementsLinkedToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_LINKED_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
