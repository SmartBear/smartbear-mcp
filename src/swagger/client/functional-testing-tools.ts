import {
  CancelFunctionalTestingSuiteExecutionSchema,
  CreateFunctionalTestingTestParamsSchema,
  GetFunctionalTestHistoryParamsSchema,
  GetFunctionalTestingExecutionTestSchema,
  GetFunctionalTestingSuiteExecutionSchema,
  ListFunctionalTestingSuiteExecutionsSchema,
  RunFunctionalTestingSuiteParamsSchema,
  RunFunctionalTestingTestParamsSchema,
} from "./functional-testing-types";
import type { SwaggerToolParams } from "./tools";

export const FUNCTIONAL_TESTING_TOOLS: SwaggerToolParams[] = [
  {
    title: "Create Test",
    toolset: "Functional Testing",
    summary:
      "Creates a new API test in your Swagger Functional Testing workspace. " +
      "Use this when you need to programmatically create a test with a defined set of steps. " +
      "Returns the ID of the newly created test, which can be used with swagger_run_test.",
    inputSchema: CreateFunctionalTestingTestParamsSchema,
    handler: "createFunctionalTest",
    idempotent: false,
    readOnly: false,
  },
  {
    title: "List Tests",
    toolset: "Functional Testing",
    summary:
      "Lists all API tests available in your Swagger Functional Testing account. " +
      "Use this tool when you need to discover available tests before running them or checking their status. " +
      "Do not use this tool to retrieve test execution results or history.",
    handler: "listFunctionalTestingTests",
    idempotent: true,
    readOnly: true,
  },
  {
    title: "Run Test",
    toolset: "Functional Testing",
    summary:
      "Runs a specific API test in your Swagger Functional Testing workspace. " +
      "The execution is asynchronous — it returns an executionId, not the result directly. " +
      "Use swagger_get_test_status with that executionId to track progress and retrieve the final result.",
    inputSchema: RunFunctionalTestingTestParamsSchema,
    handler: "runFunctionalTestingTest",
    idempotent: false,
    readOnly: false,
  },
  {
    title: "Get Test Status",
    toolset: "Functional Testing",
    summary:
      "Get the status of a Swagger Functional Testing test execution. " +
      "It returns information about the execution such as its status (running, passed or failed), run time, " +
      "as well as the break down of the status of each test step.",
    inputSchema: GetFunctionalTestingExecutionTestSchema,
    handler: "getFunctionalTestingExecution",
    idempotent: true,
    readOnly: true,
  },
  {
    title: "List Suite Executions",
    toolset: "Functional Testing",
    summary:
      "Lists all executions for a given test suite in your Swagger Functional Testing workspace. " +
      "Use this tool when you need to review execution history and timings for a specific suite. " +
      "Do not use this tool to retrieve the status of a single execution or individual test results.",
    inputSchema: ListFunctionalTestingSuiteExecutionsSchema,
    handler: "listFunctionalTestingSuiteExecutions",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Cancel Suite Execution",
    toolset: "Functional Testing",
    summary:
      "Cancels an ongoing test suite execution in your Swagger Functional Testing workspace. " +
      "Use this tool when you need to stop a long-running or accidentally triggered suite run. " +
      "Do not use this tool to cancel individual test runs.",
    inputSchema: CancelFunctionalTestingSuiteExecutionSchema,
    handler: "cancelFunctionalTestingSuiteExecution",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "List Suites",
    toolset: "Functional Testing",
    summary:
      "Lists all test suites available in your Swagger Functional Testing workspace. " +
      "Use this tool when you need to discover available suites before running them or checking their execution history. " +
      "Do not use this tool to retrieve individual tests or test suite execution results.",
    handler: "listFunctionalTestingSuites",
    idempotent: true,
    readOnly: true,
  },
  {
    title: "Run Suite",
    toolset: "Functional Testing",
    summary:
      "Runs a specific test suite in your Swagger Functional Testing workspace. " +
      "The execution is asynchronous — it returns an executionId, not results directly. " +
      "Use `swagger_get_suite_status` with your suiteId and executionId to track progress and retrieve the final per-test results. " +
      "Optionally accepts a `tunnelAgentName` argument to override the suite's saved tunnel for this run. " +
      "Do not use this tool to run a single test — use `swagger_run_test` instead.",
    inputSchema: RunFunctionalTestingSuiteParamsSchema,
    handler: "runFunctionalTestingSuite",
    idempotent: false,
    readOnly: false,
  },
  {
    title: "Get Suite Status",
    toolset: "Functional Testing",
    summary:
      "Get the status of a Swagger Functional Testing suite execution. " +
      "Returns the overall status (pending, canceled, passed or failed), whether the run is finished, and a per-test breakdown with pass/fail. " +
      "Use this to poll for the outcome of a suite run triggered by `swagger_run_suite`. " +
      "Requires both `suiteId` and the `executionId` arguments returned by `swagger_run_suite`.",
    inputSchema: GetFunctionalTestingSuiteExecutionSchema,
    handler: "getFunctionalTestingSuiteExecution",
    idempotent: true,
    readOnly: true,
  },
  {
    title: "Get Test Execution History",
    toolset: "Functional Testing",
    summary:
      "Retrieves the execution history for a given test in your Swagger Functional Testing workspace. " +
      "Returns a list of past runs, each including pass/fail status, run time, creation timestamp, " +
      "and — for failed runs — a per-step breakdown of failure details. " +
      "Use this tool when you need to check past run results, identify failures, or assess test reliability over time. " +
      "Do not use this tool to run a test or retrieve suite-level execution results.",
    inputSchema: GetFunctionalTestHistoryParamsSchema,
    handler: "getFunctionalTestingTestHistory",
    idempotent: true,
    readOnly: true,
  },
];
