import {
  GetFunctionalTestingExecutionSchema,
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
      "Runs a specific API test in your Swagger Functional Testing workspace and returns the result. " +
      "Use this tool when you need to verify expected API functionality by executing a single test.",
    inputSchema: RunFunctionalTestingTestParamsSchema,
    handler: "runFunctionalTestingTest",
  },
  {
    title: "Get Test Status",
    toolset: "Functional Testing",
    summary: "Get the status of a Swagger Functional Testing test execution",
    inputSchema: GetFunctionalTestingExecutionSchema,
    handler: "getFunctionalTestingExecution",
  },
];
