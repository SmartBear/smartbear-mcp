import { QMetryToolsHandlers } from "../config/constants.js";
import {
  createIssue,
  fetchIssuesLinkedToTestCase,
  linkIssuesToTestcaseRun,
  updateIssue,
} from "./issues.js";
import {
  getBuilds,
  getPlatforms,
  getProjectInfo,
  getProjects,
  getReleasesCycles,
} from "./project.js";
import {
  fetchRequirementDetails,
  fetchRequirements,
  fetchRequirementsLinkedToTestCase,
} from "./requirement.js";
import {
  createTestCases,
  fetchTestCaseDetails,
  fetchTestCaseExecutions,
  fetchTestCaseSteps,
  fetchTestCases,
  fetchTestCasesLinkedToRequirement,
  fetchTestCaseVersionDetails,
  linkRequirementToTestCase,
  updateTestCase,
} from "./testcase.js";
import {
  createTestSuites,
  fetchExecutionsByTestSuite,
  fetchLinkedIssuesByTestCaseRun,
  fetchTestCaseRunsByTestSuiteRun,
  fetchTestCasesByTestSuite,
  fetchTestSuitesForTestCase,
  linkTestCasesToTestSuite,
  reqLinkedTestCasesToTestSuite,
  updateTestSuite,
} from "./testsuite.js";

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
  [QMetryToolsHandlers.FETCH_PROJECTS]: getProjects,
  [QMetryToolsHandlers.SET_PROJECT_INFO]: getProjectInfo,
  [QMetryToolsHandlers.FETCH_PROJECT_INFO]: getProjectInfo,
  [QMetryToolsHandlers.FETCH_RELEASES_CYCLES]: getReleasesCycles,
  [QMetryToolsHandlers.FETCH_BUILDS]: getBuilds,
  [QMetryToolsHandlers.FETCH_PLATFORMS]: getPlatforms,
  [QMetryToolsHandlers.CREATE_TEST_CASE]: createTestCases,
  [QMetryToolsHandlers.UPDATE_TEST_CASE]: updateTestCase,
  [QMetryToolsHandlers.FETCH_TEST_CASES]: fetchTestCases,
  [QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS]: fetchTestCaseDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS]:
    fetchTestCaseVersionDetails,
  [QMetryToolsHandlers.FETCH_TEST_CASE_STEPS]: fetchTestCaseSteps,
  [QMetryToolsHandlers.FETCH_TEST_CASE_EXECUTIONS]: fetchTestCaseExecutions,
  [QMetryToolsHandlers.LINK_REQUIREMENT_TO_TESTCASE]: linkRequirementToTestCase,
  [QMetryToolsHandlers.FETCH_REQUIREMENTS]: fetchRequirements,
  [QMetryToolsHandlers.FETCH_REQUIREMENT_DETAILS]: fetchRequirementDetails,
  [QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT]:
    fetchTestCasesLinkedToRequirement,
  [QMetryToolsHandlers.FETCH_REQUIREMENTS_LINKED_TO_TESTCASE]:
    fetchRequirementsLinkedToTestCase,
  [QMetryToolsHandlers.CREATE_TEST_SUITE]: createTestSuites,
  [QMetryToolsHandlers.UPDATE_TEST_SUITE]: updateTestSuite,
  [QMetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE]:
    fetchTestSuitesForTestCase,
  [QMetryToolsHandlers.LINK_TESTCASES_TO_TESTSUITE]: linkTestCasesToTestSuite,
  [QMetryToolsHandlers.REQUIREMENTS_LINKED_TESTCASES_TO_TESTSUITE]:
    reqLinkedTestCasesToTestSuite,
  [QMetryToolsHandlers.FETCH_TESTCASES_BY_TESTSUITE]: fetchTestCasesByTestSuite,
  [QMetryToolsHandlers.FETCH_EXECUTIONS_BY_TESTSUITE]:
    fetchExecutionsByTestSuite,
  [QMetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN]:
    fetchTestCaseRunsByTestSuiteRun,
  [QMetryToolsHandlers.FETCH_LINKED_ISSUES_BY_TESTCASE_RUN]:
    fetchLinkedIssuesByTestCaseRun,
  [QMetryToolsHandlers.FETCH_ISSUES_LINKED_TO_TESTCASE]:
    fetchIssuesLinkedToTestCase,
  [QMetryToolsHandlers.CREATE_ISSUE]: createIssue,
  [QMetryToolsHandlers.UPDATE_ISSUE]: updateIssue,
  [QMetryToolsHandlers.LINK_ISSUES_TO_TESTCASE_RUN]: linkIssuesToTestcaseRun,
};
