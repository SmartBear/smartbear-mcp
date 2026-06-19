export const QMETRY_DEFAULTS = {
  BASE_URL: "https://testmanagement.qmetry.com",
  PROJECT_KEY: "default",
};

export const UDF_MODULES = [
  { id: 1, name: "Requirement" },
  { id: 3, name: "Test Case" },
  { id: 5, name: "Test Step" },
  { id: 6, name: "Test Suite" },
  { id: 11, name: "Issue" },
  { id: 32, name: "Test Run" },
] as const;

export const UDF_FIELD_TYPES = [
  {
    Id: 6,
    Fieldtype: "STRING",
    Description: "Any text string can be entered in this field in plain text.",
    Preview: "ad-string-ico",
  },
  {
    Id: 2,
    Fieldtype: "LARGETEXT",
    Description: "A large plain text field.",
    Preview: "ad-large-text-ico",
  },
  {
    Id: 3,
    Fieldtype: "LOOKUPLIST",
    Description:
      "An input which can be associated to any custom list define within the current project. Only one item can be selected at a time from this list.",
    Preview: "ad-lookup-list-ico",
  },
  {
    Id: 4,
    Fieldtype: "MULTILOOKUPLIST",
    Description:
      "An input which can be associated to any custom list define within the current project. Multiple is can be selected at a time.",
    Preview: "ad-multi-select-lookup-list-ico",
  },
  {
    Id: 5,
    Fieldtype: "NUMBER",
    Description: "Any number can be enter into this field.",
    Preview: "ad-number-ico",
  },
  {
    Id: 1,
    Fieldtype: "DATETIMEPICKER",
    Description:
      "This will open a calendar control which will allow the user to select a date.",
    Preview: "ad-date-picker-ico",
  },
  {
    Id: 7,
    Fieldtype: "CASCADINGLIST",
    Description:
      "A single-level cascading select list where child values depend on the parent selection.",
    Preview: "ad-cascading-list-ico",
  },
] as const;

export const QMetryToolsHandlers = {
  FETCH_PROJECTS: "getProjects",
  SET_PROJECT_INFO: "setProjectInfo",
  FETCH_PROJECT_INFO: "getProjectInfo",
  FETCH_RELEASES_CYCLES: "getReleasesCycles",
  FETCH_BUILDS: "getBuilds",
  FETCH_PLATFORMS: "getPlatforms",
  CREATE_TEST_CASE: "createTestCases",
  UPDATE_TEST_CASE: "updateTestCase",
  FETCH_TEST_CASES: "getTestCases",
  FETCH_TEST_CASE_DETAILS: "getTestCaseDetails",
  FETCH_TEST_CASE_VERSION_DETAILS: "getTestCaseVersionDetails",
  FETCH_TEST_CASE_STEPS: "getTestCaseSteps",
  FETCH_TEST_CASE_EXECUTIONS: "getTestCaseExecutions",
  LINK_REQUIREMENT_TO_TESTCASE: "linkRequirementToTestCase",
  FETCH_REQUIREMENTS: "getRequirements",
  FETCH_REQUIREMENT_DETAILS: "getRequirementDetails",
  FETCH_TESTCASES_LINKED_TO_REQUIREMENT: "getTestCasesLinkedToRequirement",
  FETCH_REQUIREMENTS_LINKED_TO_TESTCASE: "getRequirementsLinkedToTestCase",
  CREATE_TEST_SUITE: "createTestSuite",
  UPDATE_TEST_SUITE: "updateTestSuite",
  FETCH_TEST_SUITES: "getTestSuites",
  FETCH_TESTSUITES_FOR_TESTCASE: "getTestSuitesForTestCase",
  FETCH_TESTCASES_BY_TESTSUITE: "getTestCasesByTestSuite",
  FETCH_EXECUTIONS_BY_TESTSUITE: "getExecutionsByTestSuite",
  BULK_UPDATE_EXECUTION_STATUS: "bulkUpdateExecutionStatus",
  FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN: "getTestCaseRunsByTestSuiteRun",
  FETCH_LINKED_ISSUES_BY_TESTCASE_RUN: "getLinkedIssuesByTestCaseRun",
  FETCH_ISSUES_LINKED_TO_TESTCASE: "getIssuesLinkedToTestCase",
  LINK_TESTCASES_TO_TESTSUITE: "linkTestCasesToTestSuite",
  REQUIREMENTS_LINKED_TESTCASES_TO_TESTSUITE: "reqLinkedTestCasesToTestSuite",
  CREATE_ISSUE: "createIssue",
  UPDATE_ISSUE: "updateIssue",
  FETCH_ISSUES: "getIssues",
  LINK_ISSUES_TO_TESTCASE_RUN: "linkIssuesToTestcaseRun",
  LINK_PLATFORMS_TO_TESTSUITE: "linkPlatformsToTestSuite",
  IMPORT_AUTOMATION_RESULTS: "importAutomationResults",
  FETCH_AUTOMATION_STATUS: "fetchAutomationStatus",
  CREATE_RELEASE: "createRelease",
  CREATE_CYCLE: "createCycle",
  UPDATE_CYCLE: "updateCycle",
  CREATE_UDF: "createUdf",
  FETCH_CUSTOM_LISTS: "fetchCustomLists",
  FETCH_CUSTOM_LIST_ITEMS: "fetchCustomListItems",
  FETCH_UDF_FIELD_TYPES: "fetchUdfFieldTypes",
  BULK_UPDATE_TEST_RUN_UDFS: "bulkUpdateTestRunUdfs",
  FETCH_ISSUE_EXECUTIONS: "getIssueExecutions",
};
