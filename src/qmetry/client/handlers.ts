import { QmetryToolsHandlers } from "../config/constants.ts";
import { getAutomationStatus, importAutomationResults } from "./automation.ts";
import {
  createIssue,
  fetchIssueExecutions,
  fetchIssues,
  fetchIssuesLinkedToTestCase,
  linkIssuesToTestcaseRun,
  updateIssue,
} from "./issues.ts";
import {
  createCycle,
  createRelease,
  getBuilds,
  getPlatforms,
  getProjectInfo,
  getProjects,
  getReleasesCycles,
  updateCycle,
} from "./project.ts";
import {
  fetchRequirementDetails,
  fetchRequirements,
  fetchRequirementsLinkedToTestCase,
} from "./requirement.ts";
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
} from "./testcase.ts";
import {
  bulkUpdateExecutionStatus,
  createTestSuites,
  fetchExecutionsByTestSuite,
  fetchLinkedIssuesByTestCaseRun,
  fetchTestCaseRunsByTestSuiteRun,
  fetchTestCasesByTestSuite,
  fetchTestSuites,
  fetchTestSuitesForTestCase,
  linkPlatformsToTestSuite,
  linkTestCasesToTestSuite,
  reqLinkedTestCasesToTestSuite,
  updateTestSuite,
} from "./testsuite.ts";
import {
  bulkUpdateTestRunUdfs,
  fetchCascadeChildValues,
  fetchTestRunUdfMetadata,
  fetchTestRunUdfValues,
  fetchUdfFieldTypes,
  fetchUdfModules,
} from "./udf.ts";

/**
 * Mapping of QMetry tool handlers to their implementation functions
 * Used by the client to dynamically call the appropriate handler for each tool
 *
 * Note: Using explicit function type definition for better type safety.
 * All handlers are expected to return Promise<any> and take at least token, baseUrl, project.
 */
type QmetryHandler = (
  token: string,
  baseUrl: string,
  project: string,
  // biome-ignore lint/suspicious/noExplicitAny: each concrete handler declares its own specific payload interface (e.g. CreateTestSuitePayload); a narrower shared type here (Record<string, unknown>) is not assignable under strict function-parameter contravariance without weakening every handler's own payload typing
  payload?: any,
  // biome-ignore lint/suspicious/noExplicitAny: handlers return varied response shapes (some typed, some qmetryRequest<unknown> passthrough); a single shared return type narrower than any would require re-typing every handler's return value
) => Promise<any>;

export const QMETRY_HANDLER_MAP: Record<string, QmetryHandler> = {
  [QmetryToolsHandlers.FETCH_PROJECTS]: getProjects,
  [QmetryToolsHandlers.SET_PROJECT_INFO]: getProjectInfo,
  [QmetryToolsHandlers.FETCH_PROJECT_INFO]: getProjectInfo,
  [QmetryToolsHandlers.FETCH_RELEASES_CYCLES]: getReleasesCycles,
  [QmetryToolsHandlers.FETCH_BUILDS]: getBuilds,
  [QmetryToolsHandlers.FETCH_PLATFORMS]: getPlatforms,
  [QmetryToolsHandlers.CREATE_RELEASE]: createRelease,
  [QmetryToolsHandlers.CREATE_CYCLE]: createCycle,
  [QmetryToolsHandlers.UPDATE_CYCLE]: updateCycle,
  [QmetryToolsHandlers.CREATE_TEST_CASE]: createTestCases,
  [QmetryToolsHandlers.UPDATE_TEST_CASE]: updateTestCase,
  [QmetryToolsHandlers.FETCH_TEST_CASES]: fetchTestCases,
  [QmetryToolsHandlers.FETCH_TEST_CASE_DETAILS]: fetchTestCaseDetails,
  [QmetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS]:
    fetchTestCaseVersionDetails,
  [QmetryToolsHandlers.FETCH_TEST_CASE_STEPS]: fetchTestCaseSteps,
  [QmetryToolsHandlers.FETCH_TEST_CASE_EXECUTIONS]: fetchTestCaseExecutions,
  [QmetryToolsHandlers.LINK_REQUIREMENT_TO_TESTCASE]: linkRequirementToTestCase,
  [QmetryToolsHandlers.FETCH_REQUIREMENTS]: fetchRequirements,
  [QmetryToolsHandlers.FETCH_REQUIREMENT_DETAILS]: fetchRequirementDetails,
  [QmetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT]:
    fetchTestCasesLinkedToRequirement,
  [QmetryToolsHandlers.FETCH_REQUIREMENTS_LINKED_TO_TESTCASE]:
    fetchRequirementsLinkedToTestCase,
  [QmetryToolsHandlers.CREATE_TEST_SUITE]: createTestSuites,
  [QmetryToolsHandlers.UPDATE_TEST_SUITE]: updateTestSuite,
  [QmetryToolsHandlers.FETCH_TEST_SUITES]: fetchTestSuites,
  [QmetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE]:
    fetchTestSuitesForTestCase,
  [QmetryToolsHandlers.LINK_TESTCASES_TO_TESTSUITE]: linkTestCasesToTestSuite,
  [QmetryToolsHandlers.REQUIREMENTS_LINKED_TESTCASES_TO_TESTSUITE]:
    reqLinkedTestCasesToTestSuite,
  [QmetryToolsHandlers.FETCH_TESTCASES_BY_TESTSUITE]: fetchTestCasesByTestSuite,
  [QmetryToolsHandlers.FETCH_EXECUTIONS_BY_TESTSUITE]:
    fetchExecutionsByTestSuite,
  [QmetryToolsHandlers.BULK_UPDATE_EXECUTION_STATUS]: bulkUpdateExecutionStatus,
  [QmetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN]:
    fetchTestCaseRunsByTestSuiteRun,
  [QmetryToolsHandlers.FETCH_LINKED_ISSUES_BY_TESTCASE_RUN]:
    fetchLinkedIssuesByTestCaseRun,
  [QmetryToolsHandlers.FETCH_ISSUES_LINKED_TO_TESTCASE]:
    fetchIssuesLinkedToTestCase,
  [QmetryToolsHandlers.CREATE_ISSUE]: createIssue,
  [QmetryToolsHandlers.UPDATE_ISSUE]: updateIssue,
  [QmetryToolsHandlers.FETCH_ISSUES]: fetchIssues,
  [QmetryToolsHandlers.LINK_ISSUES_TO_TESTCASE_RUN]: linkIssuesToTestcaseRun,
  [QmetryToolsHandlers.LINK_PLATFORMS_TO_TESTSUITE]: linkPlatformsToTestSuite,
  [QmetryToolsHandlers.IMPORT_AUTOMATION_RESULTS]: importAutomationResults,
  [QmetryToolsHandlers.FETCH_AUTOMATION_STATUS]: getAutomationStatus,
  [QmetryToolsHandlers.FETCH_UDF_FIELD_TYPES]: fetchUdfFieldTypes,
  [QmetryToolsHandlers.FETCH_UDF_MODULES]: fetchUdfModules,
  [QmetryToolsHandlers.BULK_UPDATE_TEST_RUN_UDFS]: bulkUpdateTestRunUdfs,
  [QmetryToolsHandlers.FETCH_TEST_RUN_UDF_METADATA]: fetchTestRunUdfMetadata,
  [QmetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES]: fetchTestRunUdfValues,
  [QmetryToolsHandlers.FETCH_ISSUE_EXECUTIONS]: fetchIssueExecutions,
  [QmetryToolsHandlers.FETCH_CASCADE_CHILD_VALUES]: fetchCascadeChildValues,
};
