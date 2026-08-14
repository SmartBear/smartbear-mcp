import {
  CancelFunctionalTestingSuiteExecutionSchema,
  CreateFunctionalTestingSuiteParamsSchema,
  CreateFunctionalTestingSuiteResponseSchema,
  CreateFunctionalTestingTestParamsSchema,
  CreateFunctionalTestingTestResponseSchema,
  GetFunctionalTestHistoryParamsSchema,
  GetFunctionalTestingExecutionTestSchema,
  GetFunctionalTestingSuiteExecutionSchema,
  GetFunctionalTestingSuiteParamsSchema,
  GetFunctionalTestingSuiteResponseSchema,
  ListFunctionalTestingSuiteExecutionsSchema,
  RunFunctionalTestingSuiteParamsSchema,
  RunFunctionalTestingTestParamsSchema,
  UpdateFunctionalTestingSuiteParamsSchema,
  UpdateFunctionalTestingSuiteResponseSchema,
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
    idempotent: true,
    readOnly: true,
  },
  {
    title: "Create Test",
    toolset: "Functional Testing",
    summary:
      "Creates a new API test in your Swagger Functional Testing workspace. " +
      "This tool only creates API tests (not browser or native-mobile tests). " +
      "Use this when you need to programmatically create a test with a defined set of API request steps. " +
      "Each step requires a URL and may specify an HTTP method (defaults to GET), request body, headers, and redirect handling. " +
      "Returns the ID and the URL to definition of the newly created test; the ID can be used with `swagger_run_test` to run it, " +
      "or grouped with other test IDs into a Suite via `swagger_create_suite`.",
    inputSchema: CreateFunctionalTestingTestParamsSchema,
    outputSchema: CreateFunctionalTestingTestResponseSchema,
    handler: "createFunctionalTestingTest",
    idempotent: false,
    readOnly: false,
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
    title: "Create Suite",
    toolset: "Functional Testing",
    summary:
      "Creates a new test suite in your Swagger Functional Testing workspace with a specified name and `runApiTests`, " +
      "one or more required ordered blocks of tests. " +
      "Use this tool when you need to group existing tests into a suite for collective execution. " +
      "Within a block, tests run sequentially by default — set `parallel: true` on a block to run its tests in parallel instead. " +
      "Blocks themselves always run one after another. " +
      "Set `maxRetryAttempts` (0-3) on a block to automatically retry its failed tests before they count as failed. " +
      "Optionally accepts `agentName` to save a tunnel agent override for future runs of the suite.",
    inputSchema: CreateFunctionalTestingSuiteParamsSchema,
    outputSchema: CreateFunctionalTestingSuiteResponseSchema,
    handler: "createFunctionalTestingSuite",
    idempotent: false,
    readOnly: false,
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
    title: "Get Suite",
    toolset: "Functional Testing",
    summary:
      "Returns the full workflow tree for an existing test suite in your Swagger Functional Testing workspace, " +
      "with every action id'd and typed. " +
      "This is the only way to discover an existing suite's action ids — there is no full-tree echo from " +
      "`swagger_update_suite`. Call this tool before your first `swagger_update_suite` call against a suite you " +
      "did not just create yourself (whose ids you already have from `swagger_create_suite`), and again any time " +
      "you need to see an id you don't already have — most commonly a decision node's id to target its `branch` " +
      "with a later `swagger_update_suite` call. You do not need to call this again just to get the id of an " +
      "action you just added — `swagger_update_suite`'s `add` response already returns that directly.",
    inputSchema: GetFunctionalTestingSuiteParamsSchema,
    outputSchema: GetFunctionalTestingSuiteResponseSchema,
    handler: "getFunctionalTestingSuite",
    idempotent: true,
    readOnly: true,
  },
  {
    title: "Update Suite",
    toolset: "Functional Testing",
    summary:
      "Applies a single add/edit/delete/move operation to an existing test suite's workflow in your Swagger " +
      "Functional Testing workspace. Only `runApiTests` actions can be created or edited through this tool; " +
      "other action types (e.g. the decision/email tail every suite ends with) can still be targeted, deleted, " +
      "or moved by id, just not constructed or edited. " +
      "IMPORTANT — exactly one logical edit per call: never try to batch multiple adds/edits/deletes/moves into " +
      "a single call, even when making several related changes to the same suite; issue one `swagger_update_suite` " +
      "call per operation instead. " +
      "IMPORTANT — always source `id` and `afterActionId` from the most recent `swagger_get_suite` call for this " +
      "suite, or from a previous `swagger_update_suite` `add` response's returned `id`; there is no full-tree echo " +
      "from this tool to fall back on, so if you don't already have the id you need, call `swagger_get_suite` " +
      "first. " +
      'IMPORTANT — `branch` (`"next"` or `"failure"`) is required whenever `afterActionId` (for `add`/`move`) ' +
      "names a decision node, and must be omitted otherwise; omit `afterActionId` (or pass null) to insert as the " +
      "new root, before every existing action. " +
      "Each call is independently atomic: a rejected operation never partially applies, but earlier successful " +
      "calls in a multi-step sequence stay committed even if a later call fails.",
    inputSchema: UpdateFunctionalTestingSuiteParamsSchema,
    outputSchema: UpdateFunctionalTestingSuiteResponseSchema,
    handler: "updateFunctionalTestingSuite",
    idempotent: false,
    readOnly: false,
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
