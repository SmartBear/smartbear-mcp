import { getProjectInfo } from "./project.js";
import {
  fetchTestCases,
  fetchTestCaseDetails,
  fetchTestCaseSteps,
  fetchTestCaseVersionDetails,
} from "./testcase.js";
import { QMetryToolsHandlers } from "../config/constants.js";

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
  [QMetryToolsHandlers.FETCH_TEST_CASES]: fetchTestCases,
  [QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS]: fetchTestCaseDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS]:
    fetchTestCaseVersionDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_STEPS]: fetchTestCaseSteps,
};
