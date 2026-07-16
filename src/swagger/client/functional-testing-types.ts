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
  // Will be brought back after https://smartbear.atlassian.net/browse/RF-5271 is done
  // url: string;
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
  name: z.string().describe("Header name"),
  value: z.string().describe("Header value"),
});

export const CreateFunctionalTestingStatusRangeSchema = z.object({
  start: z.number().int().describe("Start of the HTTP status code range, inclusive"),
  end: z.number().int().describe("End of the HTTP status code range, inclusive"),
});

export const CreateFunctionalTestingBodyRuleSchema = z.object({
  path: z.string().describe("Path to the field to assert. Accepts dot notation (e.g. '$.data.id', 'items[0].name') or bracket notation (e.g. '[\"data\"][\"id\"]')."),
  assertionType: z
    .enum(["string", "number", "regex"])
    .describe("Type of assertion"),
  operator: z
    .enum(["eq", "lt", "gt", "lte", "gte", "contains"])
    .optional()
    .describe("Comparison operator for compare assertions"),
  target: z.string().optional().describe("Expected value for compare assertions"),
  targets: z
    .array(z.string())
    .optional()
    .describe("List of allowed values for list-match assertions"),
  lower: z.string().optional().describe("Lower bound for number range assertions"),
  upper: z.string().optional().describe("Upper bound for number range assertions"),
  pattern: z
    .enum(["nonempty"])
    .optional()
    .describe("Pattern type for regex assertions"),
  assignment: z
    .string()
    .optional()
    .describe("Variable name to assign the extracted value to"),
});

export const CreateFunctionalTestingTestStepSchema = z.object({
  url: z.string().url().describe("URL for the API call").optional(),
  httpMethod: z
    .string()
    .describe('HTTP method, e.g. "GET", "POST"')
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
    .describe("Human-readable label for this step")
    .optional(),
  expectedStatusCodes: z
    .array(CreateFunctionalTestingStatusRangeSchema)
    .optional()
    .describe("Expected HTTP status code ranges, e.g. [{start: 200, end: 299}]"),
  expectedBody: z
    .string()
    .optional()
    .describe("Expected response body (required when expectedBodyRules is set)"),
  expectedBodyType: z
    .enum(["json", "xml"])
    .optional()
    .describe('Response body format, defaults to "json"'),
  expectedBodyRules: z
    .array(CreateFunctionalTestingBodyRuleSchema)
    .optional()
    .describe("Assertion rules evaluated against the response body"),
});

export const CreateFunctionalTestingTestParamsSchema = z.object({
  name: z.string().describe("Name for the new test").trim().min(1),
  description: z
    .string()
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
export type CreateFunctionalTestingStatusRange = z.infer<
  typeof CreateFunctionalTestingStatusRangeSchema
>;
export type CreateFunctionalTestingBodyRule = z.infer<
  typeof CreateFunctionalTestingBodyRuleSchema
>;

export interface CreateFunctionalTestingTestResponse {
  id: string;
}
