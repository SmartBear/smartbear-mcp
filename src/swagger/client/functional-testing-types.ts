import { z } from "zod";

export const RunFunctionalTestingTestParamsSchema = z.object({
  testId: z
    .string()
    .describe("ID of the Functional Testing test to run")
    .trim()
    .min(1),
});

export const GetFunctionalTestingExecutionTestSchema = z.object({
  executionId: z
    .string()
    .describe("ID of the Functional Testing execution")
    .trim()
    .min(1),
});

export const ListFunctionalTestingSuiteExecutionsSchema = z.object({
  suiteId: z
    .string()
    .describe("ID of the Functional Testing suite to list executions for")
    .trim()
    .min(1),
});

export const CancelFunctionalTestingSuiteExecutionSchema = z.object({
  suiteId: z
    .string()
    .describe("ID of the Functional Testing suite the execution belongs to")
    .trim()
    .min(1),
  executionId: z
    .string()
    .describe("ID of the Functional Testing suite execution to cancel")
    .trim()
    .min(1),
});

export const RunFunctionalTestingSuiteParamsSchema = z.object({
  suiteId: z
    .string()
    .describe("ID of the Functional Testing suite to run")
    .trim()
    .min(1),
  tunnelAgentName: z
    .string()
    .describe(
      "Optional tunnel agent name to override the suite's saved tunnel for this run. When omitted, the suite's saved tunnel overrides are used, falling back to each test's saved tunnel.",
    )
    .trim()
    .min(1)
    .optional(),
});

export const GetFunctionalTestingSuiteExecutionSchema = z.object({
  suiteId: z
    .string()
    .describe("ID of the Functional Testing suite")
    .trim()
    .min(1),
  executionId: z
    .string()
    .describe("ID of the Functional Testing suite execution")
    .trim()
    .min(1),
});

export type RunFunctionalTestingTestParams = z.infer<
  typeof RunFunctionalTestingTestParamsSchema
>;
export type GetFunctionalTestingExecutionTestParams = z.infer<
  typeof GetFunctionalTestingExecutionTestSchema
>;
export type ListFunctionalTestingSuiteExecutionsParams = z.infer<
  typeof ListFunctionalTestingSuiteExecutionsSchema
>;
export type CancelFunctionalTestingSuiteExecutionParams = z.infer<
  typeof CancelFunctionalTestingSuiteExecutionSchema
>;
export type RunFunctionalTestingSuiteParams = z.infer<
  typeof RunFunctionalTestingSuiteParamsSchema
>;
export type GetFunctionalTestingSuiteExecutionParams = z.infer<
  typeof GetFunctionalTestingSuiteExecutionSchema
>;

export interface SuiteExecution {
  executionId: number;
  url: string;
  status: string;
  isFinished: boolean;
}

export interface ListSuiteExecutionsResponse {
  suiteId: string;
  executions: {
    data: SuiteExecution[];
  };
}

export interface Suite {
  id: string;
  accountId: number;
  name: string;
  slug: string;
  created: number;
  numTestInstances: number;
}

export interface ListSuitesResponse {
  suites: Suite[];
  stats?: {
    executions: number;
    passRate: number;
    avgRuntimeSecs: number;
    cumExecTimeSecs: number;
  };
}

export const GetFunctionalTestHistoryParamsSchema = z.object({
  testId: z
    .string()
    .describe("ID of the Functional Testing test")
    .trim()
    .min(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of most recent runs to return (default: 25, max: 100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Pagination offset (default: 0)"),
});

export type GetFunctionalTestHistoryParams = z.infer<
  typeof GetFunctionalTestHistoryParamsSchema
>;

export interface TestRun {
  id: number;
  passed: boolean;
  created: number;
  runTime: number;
  failureDetails?: {
    stepCount: number;
    failedStepsByIndex: Record<string, { summaryErrorMessage: string | null }>;
  };
  suiteExecution?: {
    executionId: number;
    slug: string;
    attemptNumber: number;
    originExecutionId: number | null;
  };
}

export interface TestRunHistoryResponse {
  totalRuns: number;
  runs: TestRun[];
}

export const CreateFunctionalTestingTestHeaderSchema = z.object({
  name: z.string().describe("Header name").trim().min(1),
  value: z.string().describe("Header value"),
});

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const CreateFunctionalTestingTestStepSchema = z.object({
  url: z.url().describe("URL for the API call"),
  httpMethod: z
    .enum(HTTP_METHODS)
    .describe("HTTP method for the API call (defaults to GET server-side)")
    .optional(),
  requestBody: z.string().describe("Request body").optional(),
  requestHeaders: z
    .array(CreateFunctionalTestingTestHeaderSchema)
    .describe("HTTP headers")
    .optional(),
  followRedirects: z
    .boolean()
    .describe("Whether to follow redirects")
    .optional(),
  description: z
    .string()
    .trim()
    .describe("Human-readable label for this step")
    .optional(),
});

export const CreateFunctionalTestingTestParamsSchema = z.object({
  name: z.string().describe("Name for the new test").trim().min(1),
  description: z
    .string()
    .trim()
    .describe("Optional description for the test")
    .optional(),
  steps: z
    .array(CreateFunctionalTestingTestStepSchema)
    .describe("Test steps to include in the test")
    .optional(),
});

export type CreateFunctionalTestingTestParams = z.infer<
  typeof CreateFunctionalTestingTestParamsSchema
>;

export const CreateFunctionalTestingTestResponseSchema = z.object({
  id: z.number().describe("ID of the newly created test"),
  url: z
    .string()
    .describe(
      "Link to the created test definition in Swagger Functional Testing UI",
    ),
});

export type CreateFunctionalTestingTestResponse = z.infer<
  typeof CreateFunctionalTestingTestResponseSchema
>;
