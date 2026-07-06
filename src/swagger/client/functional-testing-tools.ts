import {
  CancelFunctionalTestingSuiteExecutionSchema,
  GetFunctionalTestingExecutionTestSchema,
  ListFunctionalTestingSuiteExecutionsSchema,
  RunFunctionalTestingTestParamsSchema,
} from "./functional-testing-types";
import type { SwaggerToolParams } from "./tools";

export const FUNCTIONAL_TESTING_TOOLS: SwaggerToolParams[] = [
  {
    title: "List Tests",
    toolset: "Functional Testing",
    summary:
      "Lists all API tests available in your Swagger Functional Testing account. " +
      "Use this tool when you need to discover available tests before running them or checking their status. " +
      "Do not use this tool to retrieve test execution results or history.",
    handler: "listFunctionalTestingTests",
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
    idempotent: false,
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
];
