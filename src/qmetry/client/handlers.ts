import { QMetryToolsHandlers } from "../config/constants.js";
import {
  getBuilds,
  getPlatforms,
  getProjectInfo,
  getReleasesCycles,
} from "./project.js";
import { fetchRequirementDetails, fetchRequirements } from "./requirement.js";
import {
  fetchTestCaseDetails,
  fetchTestCaseSteps,
  fetchTestCases,
  fetchTestCasesLinkedToRequirement,
  fetchTestCaseVersionDetails,
} from "./testcase.js";

/**
 * Mapping of QMetry tool handlers to their implementation functions
 * Used by the client to dynamically call the appropriate handler for each tool
 *
 * Note: Using explicit function type definition for better type safety.
 * All handlers are expected to return Promise<any> and take at least token, baseUrl, project.
 */
type QMetryHandler = (
  token: string,
  baseUrl: string,
  project: string,
  payload?: any,
) => Promise<any>;

export const QMETRY_HANDLER_MAP: Record<string, QMetryHandler> = {
  [QMetryToolsHandlers.SET_PROJECT_INFO]: getProjectInfo,
  [QMetryToolsHandlers.FETCH_PROJECT_INFO]: getProjectInfo,
  [QMetryToolsHandlers.FETCH_RELEASES_CYCLES]: getReleasesCycles,
  [QMetryToolsHandlers.FETCH_BUILDS]: getBuilds,
  [QMetryToolsHandlers.FETCH_PLATFORMS]: getPlatforms,
  [QMetryToolsHandlers.FETCH_TEST_CASES]: fetchTestCases,
  [QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS]: fetchTestCaseDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS]:
    fetchTestCaseVersionDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_STEPS]: fetchTestCaseSteps,
  [QMetryToolsHandlers.FETCH_REQUIREMENTS]: fetchRequirements,
  [QMetryToolsHandlers.FETCH_REQUIREMENT_DETAILS]: fetchRequirementDetails,
  [QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT]:
    fetchTestCasesLinkedToRequirement,
};
