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

export const CreateFunctionalTestingTestStepSchema = z.object({
  type: z
    .string()
    .describe('Step type, e.g. "api", "browser-navigate", "wait"')
    .trim()
    .min(1),
  url: z.string().describe("URL for navigate or API call steps").optional(),
  httpMethod: z
    .string()
    .describe('HTTP method for API steps, e.g. "GET", "POST"')
    .optional(),
  requestBody: z
    .string()
    .describe("Request body for API steps")
    .optional(),
  requestHeaders: z
    .array(CreateFunctionalTestingTestHeaderSchema)
    .describe("HTTP headers for API steps")
    .optional(),
  followRedirects: z
    .boolean()
    .describe("Whether to follow redirects for API steps")
    .optional(),
  description: z
    .string()
    .describe("Human-readable label for this step")
    .optional(),
  inputText: z.string().describe("Text to type for input steps").optional(),
  selector: z
    .string()
    .describe("CSS selector for element-targeting steps")
    .optional(),
  seconds: z
    .number()
    .int()
    .describe("Wait duration in seconds for wait steps")
    .optional(),
});

export const CreateFunctionalTestingTestParamsSchema = z.object({
  name: z.string().describe("Name for the new test").trim().min(1),
  type: z
    .enum(["api", "web", "native-mobile"])
    .describe('Test type. Defaults to "api" for API testing.')
    .default("api"),
  description: z
    .string()
    .describe("Optional description for the test")
    .optional(),
  deviceProfile: z
    .string()
    .describe(
      "Optional device profile name (required for native-mobile tests)",
    )
    .optional(),
  steps: z
    .array(CreateFunctionalTestingTestStepSchema)
    .describe("Test steps to include in the test")
    .optional(),
});

export type CreateFunctionalTestingTestParams = z.infer<
  typeof CreateFunctionalTestingTestParamsSchema
>;
