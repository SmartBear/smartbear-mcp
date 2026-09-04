import {
  CancelFunctionalTestingSuiteExecutionSchema,
  CreateFunctionalTestingSuiteParamsSchema,
  CreateFunctionalTestingSuiteResponseSchema,
  CreateFunctionalTestingTestParamsSchema,
  CreateFunctionalTestingTestResponseSchema,
  GetFunctionalTestHistoryParamsSchema,
  GetFunctionalTestingExecutionTestSchema,
  GetFunctionalTestingSuiteExecutionSchema,
  ListFunctionalTestingSuiteExecutionsSchema,
  RunFunctionalTestingSuiteParamsSchema,
  RunFunctionalTestingTestParamsSchema,
} from "./functional-testing-types";
import { READ_ONLY, WRITE, WRITE_DESTRUCTIVE } from "./tool-constants";
import type { SwaggerToolParams } from "./tools";

export const FUNCTIONAL_TESTING_TOOLS: SwaggerToolParams[] = [
  {
    title: "List Tests",
    toolset: "Functional Testing",
    summary:
      "Lists all API tests available in your Swagger Functional Testing account. " +
      "Use this tool when you need to discover available tests before running them or checking their status. " +
      "Returns test IDs usable with `swagger_run_test` to execute a single test, or passable to `swagger_create_suite` to group tests into a suite. " +
      "Do not use this tool to retrieve test execution results or history.",
    handler: "listFunctionalTestingTests",
    idempotent: true,
    ...READ_ONLY,
  },
  {
    title: "Create Test",
    toolset: "Functional Testing",
    summary:
      "Creates a new API test in your Swagger Functional Testing workspace. " +
      "This tool only creates API tests (not browser or native-mobile tests). " +
      "Use this when you need to programmatically create a test with a defined set of API request steps. " +
      "Each step requires a URL and may specify an HTTP method (defaults to GET), request body, headers, redirect handling, " +
      "and assertions: expected HTTP status code ranges, and expected response body assertions (exact match or field-level rules matched by path). " +
      "Top-level `parameters` are path parameters, not request body parameters. " +
      "Every step MUST set `baseUrl` to that endpoint's server URL,so it is extracted into a shared parameter. " +
      "Whenever `baseUrl` is set, also set `apiName` to the name of the API it belongs to. " +
      "If a `{pathParam}` placeholder appears in more than one step's URL, you MUST define a matching entry in `parameters` so its value is shared across all steps. " +
      "Returns the ID and the URL to definition of the newly created test; the ID can be used with `swagger_run_test` to run it " +
      "or grouped with other test IDs into a Suite via `swagger_create_suite`.",
    inputSchema: CreateFunctionalTestingTestParamsSchema,
    outputSchema: CreateFunctionalTestingTestResponseSchema,
    handler: "createFunctionalTestingTest",
    ...WRITE,
    idempotent: false,
  },
  {
    title: "Run Test",
    toolset: "Functional Testing",
    summary:
      "Runs a specific API test in your Swagger Functional Testing workspace. " +
      "The execution is asynchronous — it returns an executionId, not the result directly. " +
      "Use `swagger_get_test_status` with that executionId to track progress and retrieve the final result.",
    inputSchema: RunFunctionalTestingTestParamsSchema,
    handler: "runFunctionalTestingTest",
    ...WRITE,
    openWorld: true,
    idempotent: false,
  },
  {
    title: "Get Test Status",
    toolset: "Functional Testing",
    summary:
      "Get the status of a Swagger Functional Testing test execution. " +
      "Returns the execution status (`running`, `passed`, or `failed`), run time, and a per-step breakdown. " +
      "Poll this tool after calling `swagger_run_test` until status is `passed` or `failed`; `running` means the execution is still in progress.",
    inputSchema: GetFunctionalTestingExecutionTestSchema,
    handler: "getFunctionalTestingExecution",
    idempotent: true,
    ...READ_ONLY,
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
    idempotent: true,
    ...READ_ONLY,
  },
  {
    title: "Cancel Suite Execution",
    toolset: "Functional Testing",
    summary:
      "Cancels an ongoing test suite execution in your Swagger Functional Testing workspace. " +
      "Use this tool when you need to stop a long-running or accidentally triggered suite run. " +
      "The canceled execution is preserved in run history with status `canceled`. " +
      "Do not use this tool to cancel individual test runs.",
    inputSchema: CancelFunctionalTestingSuiteExecutionSchema,
    handler: "cancelFunctionalTestingSuiteExecution",
    ...WRITE_DESTRUCTIVE,
    idempotent: false,
  },
  {
    title: "Create Suite",
    toolset: "Functional Testing",
    summary:
      "Creates a new test suite in your Swagger Functional Testing workspace with a specified name and `runApiTests`, " +
      "one or more required ordered blocks of tests. " +
      "Use this tool when you need to group existing tests into a suite for collective execution. " +
      "Within a block, tests run sequentially by default — set `parallel: true` on a block to run its tests in parallel instead. " +
      "Blocks themselves always run one after another. " +
      "Set `maxRetryAttempts` (0-3) on a block to automatically retry its failed tests before they count as failed. " +
      "Optionally accepts `agentName` to save a tunnel agent override for future runs of the suite. " +
      "Returns `slug`, which identifies the suite for other suite tools (e.g. `swagger_run_suite`).",
    inputSchema: CreateFunctionalTestingSuiteParamsSchema,
    outputSchema: CreateFunctionalTestingSuiteResponseSchema,
    handler: "createFunctionalTestingSuite",
    ...WRITE,
    idempotent: false,
  },
  {
    title: "List Suites",
    toolset: "Functional Testing",
    summary:
      "Lists all test suites available in your Swagger Functional Testing workspace. " +
      "Use this tool when you need to discover available suites before running them or checking their execution history. " +
      "Each suite's `slug` identifies it for other suite tools (e.g. `swagger_run_suite`). " +
      "Do not use this tool to retrieve individual tests or test suite execution results.",
    handler: "listFunctionalTestingSuites",
    idempotent: true,
    ...READ_ONLY,
  },
  {
    title: "Run Suite",
    toolset: "Functional Testing",
    summary:
      "Runs a specific test suite in your Swagger Functional Testing workspace. " +
      "The execution is asynchronous — it returns an executionId, not results directly. " +
      "Use `swagger_get_suite_status` with your slug and executionId to track progress and retrieve the final per-test results. " +
      "Optionally accepts a `tunnelAgentName` argument to override the suite's saved tunnel for this run. " +
      "Do not use this tool to run a single test — use `swagger_run_test` instead.",
    inputSchema: RunFunctionalTestingSuiteParamsSchema,
    handler: "runFunctionalTestingSuite",
    ...WRITE,
    openWorld: true,
    idempotent: false,
  },
  {
    title: "Get Suite Status",
    toolset: "Functional Testing",
    summary:
      "Get the status of a Swagger Functional Testing suite execution. " +
      "Returns the overall status (`pending`, `canceled`, `passed`, or `failed`), whether the run is finished, and a per-test breakdown with pass/fail, runtime, and step count. " +
      "`pending` means the execution has not started yet. Poll this tool after calling `swagger_run_suite` until `finished` is `true`. " +
      "Requires the suite's `slug` and the `executionId` returned by `swagger_run_suite`.",
    inputSchema: GetFunctionalTestingSuiteExecutionSchema,
    handler: "getFunctionalTestingSuiteExecution",
    idempotent: true,
    ...READ_ONLY,
  },
  {
    title: "Get Test Execution History",
    toolset: "Functional Testing",
    summary:
      "Retrieves the execution history for a given test in your Swagger Functional Testing workspace. " +
      "Returns the total run count and a list of past runs, each including pass/fail status, run time, creation timestamp, " +
      "and — for failed runs — a per-step breakdown of failure details. " +
      "Supports pagination via `limit` (1–100, default 25) and `offset` (default 0). " +
      "Use this tool when you need to check past run results, identify failures, or assess test reliability over time. " +
      "Do not use this tool to run a test or retrieve suite-level execution results.",
    inputSchema: GetFunctionalTestHistoryParamsSchema,
    handler: "getFunctionalTestingTestHistory",
    idempotent: true,
    ...READ_ONLY,
  },
];
