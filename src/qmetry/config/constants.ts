export const QMETRY_DEFAULTS = {
  BASE_URL: "https://testmanagement.qmetry.com",
  PROJECT_KEY: "default",
};

export const QMetryToolsHandlers = {
  SET_PROJECT_INFO: "setProjectInfo",
  FETCH_PROJECT_INFO: "getProjectInfo",
  FETCH_RELEASES_CYCLES: "getReleasesCycles",
  FETCH_BUILDS: "getBuilds",
  FETCH_PLATFORMS: "getPlatforms",
  FETCH_TEST_CASES: "getTestCases",
  FETCH_TEST_CASE_DETAILS: "getTestCaseDetails",
  FETCH_TEST_CASE_VERSION_DETAILS: "getTestCaseVersionDetails",
  FETCH_TEST_CASE_STEPS: "getTestCaseSteps",
  FETCH_TEST_CASE_EXECUTIONS: "getTestCaseExecutions",
  FETCH_REQUIREMENTS: "getRequirements",
  FETCH_REQUIREMENT_DETAILS: "getRequirementDetails",
  FETCH_TESTCASES_LINKED_TO_REQUIREMENT: "getTestCasesLinkedToRequirement",
  FETCH_REQUIREMENTS_LINKED_TO_TESTCASE: "getRequirementsLinkedToTestCase",
  FETCH_TESTSUITES_FOR_TESTCASE: "getTestSuitesForTestCase",
  FETCH_TESTCASES_BY_TESTSUITE: "getTestCasesByTestSuite",
  FETCH_EXECUTIONS_BY_TESTSUITE: "getExecutionsByTestSuite",
  FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN: "getTestCaseRunsByTestSuiteRun",
  FETCH_LINKED_ISSUES_BY_TESTCASE_RUN: "getLinkedIssuesByTestCaseRun",
  FETCH_ISSUES_LINKED_TO_TESTCASE: "getIssuesLinkedToTestCase",
};
