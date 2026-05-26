import { QMetryToolsHandlers } from "../../config/constants";
import { AnalyticsQueryArgsSchema } from "../../types/common";
import type { QMetryToolParams } from "./types";

export const ANALYTICS_TOOLS: QMetryToolParams[] = [
  {
    title: "Execute Analytics SQL Query",
    summary:
      "Execute a custom SQL query against QMetry Analytics to fetch cross-entity data for reporting and traceability",
    handler: QMetryToolsHandlers.EXECUTE_ANALYTICS_QUERY,
    inputSchema: AnalyticsQueryArgsSchema,
    purpose:
      "Run custom SQL queries against QMetry's analytics engine to retrieve data across requirements, " +
      "test cases, test executions, test suites, and issues. Useful for building traceability matrices, " +
      "custom reports, and cross-entity data analysis that cannot be achieved with individual entity APIs.",
    useCases: [
      "Build traceability matrix linking requirements to test cases, executions, and defects",
      "Generate custom cross-entity reports combining data from multiple QMetry modules",
      "Query test execution status across multiple requirements or test suites",
      "Fetch linked issues and their resolution status for specific requirements",
      "Analyze test coverage by joining requirements with test cases and execution results",
      "Create custom dashboards by querying aggregated test execution data",
      "Filter and retrieve data using complex SQL WHERE clauses with JOINs",
      "Export structured data for external reporting tools",
    ],
    examples: [
      {
        description:
          "Get traceability data: requirements → test cases → executions → issues",
        parameters: {
          query:
            'SELECT r.extKey as "rqExtKey", r.entityKey as "rqKey", t.entityKey as "tckey", ' +
            'te.tcExecutionStatusName as "TestExecution Status", i.issueID, te.platformName, ' +
            'i.issueStatus, ts.entityKey as "Testsuitname", te.tsExecutionID as "tsRunId", ' +
            'i.summary as "issuename", i.priority as "issuePriority", ' +
            'i.resolution as "issueResolution", te.releaseName as "Release Name", ' +
            'te.cycleName as "Cycle Name" ' +
            "FROM requirements r " +
            "JOIN requirementtestcase rtc ON r.requirementID = rtc.requirementID " +
            "JOIN testcases t ON rtc.testcaseID = t.testcaseID " +
            "LEFT JOIN testexecutions te ON t.testcaseID = te.testcaseID AND t.tcVersion = te.executedVersion " +
            "LEFT JOIN testsuites ts ON te.testsuiteID = ts.testsuiteID " +
            "LEFT JOIN testexecutionissue tei ON te.tcExecutionID = tei.tcExecutionID AND te.executedVersion = tei.executedVersion " +
            "LEFT JOIN issues i ON tei.issueID = i.issueID " +
            "WHERE r.extKey IN ('PE17G-107', 'PE17G-105')",
        },
        expectedOutput:
          "Tabular data with requirement keys, test case keys, execution status, linked issues, " +
          "platform, test suite, release, and cycle information",
      },
      {
        description:
          "Get all test cases with their execution status for a requirement",
        parameters: {
          query:
            'SELECT r.entityKey as "Requirement", t.entityKey as "TestCase", ' +
            'te.tcExecutionStatusName as "Status", te.platformName as "Platform" ' +
            "FROM requirements r " +
            "JOIN requirementtestcase rtc ON r.requirementID = rtc.requirementID " +
            "JOIN testcases t ON rtc.testcaseID = t.testcaseID " +
            "LEFT JOIN testexecutions te ON t.testcaseID = te.testcaseID " +
            "WHERE r.entityKey = 'PROJ-RQ-100'",
        },
        expectedOutput:
          "List of test cases linked to requirement PROJ-RQ-100 with their execution status and platform",
      },
      {
        description: "Get test execution summary with issue counts",
        parameters: {
          query:
            'SELECT ts.entityKey as "TestSuite", t.entityKey as "TestCase", ' +
            'te.tcExecutionStatusName as "Status", COUNT(i.issueID) as "IssueCount" ' +
            "FROM testsuites ts " +
            "JOIN testexecutions te ON ts.testsuiteID = te.testsuiteID " +
            "JOIN testcases t ON te.testcaseID = t.testcaseID " +
            "LEFT JOIN testexecutionissue tei ON te.tcExecutionID = tei.tcExecutionID " +
            "LEFT JOIN issues i ON tei.issueID = i.issueID " +
            "GROUP BY ts.entityKey, t.entityKey, te.tcExecutionStatusName",
        },
        expectedOutput:
          "Aggregated test execution data with issue counts per test case and suite",
      },
      {
        description: "Query with pagination (page 0 is first page)",
        parameters: {
          query:
            "SELECT t.entityKey, t.summary FROM testcases t ORDER BY t.entityKey",
          page: 0,
        },
        expectedOutput: "First page of test cases ordered by entity key",
      },
    ],
    hints: [
      "CRITICAL: The 'query' parameter is REQUIRED - must provide a valid SQL query",
      "AVAILABLE TABLES: requirements, testcases, testexecutions, testsuites, issues",
      "RELATIONSHIP TABLES: requirementtestcase, testexecutionissue (join tables for linking entities)",
      "COMMON COLUMNS - requirements: requirementID, entityKey, extKey, summary",
      "COMMON COLUMNS - testcases: testcaseID, entityKey, summary, tcVersion",
      "COMMON COLUMNS - testexecutions: tcExecutionID, testcaseID, testsuiteID, executedVersion, tcExecutionStatusName, platformName, releaseName, cycleName, tsExecutionID",
      "COMMON COLUMNS - testsuites: testsuiteID, entityKey, summary",
      "COMMON COLUMNS - issues: issueID, summary, priority, issueStatus, resolution",
      "COMMON COLUMNS - requirementtestcase: requirementID, testcaseID",
      "COMMON COLUMNS - testexecutionissue: tcExecutionID, issueID, executedVersion",
      "Use JOINs to combine data across entities - standard SQL JOIN syntax is supported",
      "Use WHERE clause with IN operator to filter by multiple entity keys or ext keys",
      "Use column aliases with AS or double quotes for readable output column names",
      "The 'page' parameter starts from 0 (default). Increment for subsequent pages of results",
      "The 'filterValue' parameter is optional and used for parameterized queries",
      "Use LEFT JOIN when relationships may not exist (e.g., test cases without executions)",
      "Use INNER JOIN when relationships must exist (e.g., only test cases linked to requirements)",
      "extKey column in requirements refers to external system keys (e.g., Jira issue keys)",
      "entityKey column refers to QMetry internal keys (e.g., PROJ-RQ-100, PROJ-TC-200)",
    ],
    outputDescription:
      "JSON object containing tabular query results with column headers and row data matching the SQL SELECT columns",
  },
];
