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

export const CreateFunctionalTestingStatusRangeSchema = z.object({
  start: z
    .number()
    .int()
    .describe("Start of the HTTP status code range, inclusive"),
  end: z
    .number()
    .int()
    .describe("End of the HTTP status code range, inclusive"),
});

export const CreateFunctionalTestingBodyRuleSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path to the field to assert, in bracket notation (e.g. '[\"data\"][\"id\"]').",
      ),
    assertionType: z
      .enum(["string", "number", "regex"])
      .describe("Type of assertion"),
    operator: z
      .enum(["eq", "lt", "gt", "lte", "gte", "contains"])
      .optional()
      .describe(
        "Comparison operator for compare assertions. Required (with target) when targets is not set; " +
          "not usable together with targets, lower/upper, or with assertionType 'regex'.",
      ),
    target: z
      .string()
      .optional()
      .describe(
        "Expected value for compare assertions. Required (with operator) when targets is not set; " +
          "not usable together with targets, lower/upper, or with assertionType 'regex'.",
      ),
    targets: z
      .array(z.string())
      .optional()
      .describe(
        "List of allowed values for a list-match assertion (assertionType 'string' or 'number' only). " +
          "Not usable together with operator/target or lower/upper.",
      ),
    lower: z
      .string()
      .optional()
      .describe(
        "Lower bound for a number range assertion (assertionType 'number' only). Must be set together with upper.",
      ),
    upper: z
      .string()
      .optional()
      .describe(
        "Upper bound for a number range assertion (assertionType 'number' only). Must be set together with lower.",
      ),
    pattern: z
      .enum(["nonempty"])
      .optional()
      .describe(
        "Pattern type for regex assertions. Required when assertionType is 'regex' (only 'nonempty' is supported " +
          "- there is no way to assert against an arbitrary regex string).",
      ),
    assignment: z
      .string()
      .optional()
      .describe("Variable name to assign the extracted value to"),
  })
  .superRefine((rule, ctx) => {
    const hasRange = rule.lower !== undefined || rule.upper !== undefined;
    const hasCompare = rule.operator !== undefined || rule.target !== undefined;
    const hasTargets = rule.targets !== undefined;

    if (rule.assertionType === "regex") {
      if (rule.pattern === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["pattern"],
          message: "pattern is required when assertionType is 'regex'.",
        });
      }
      if (hasCompare || hasTargets || hasRange) {
        ctx.addIssue({
          code: "custom",
          path: ["assertionType"],
          message:
            "operator, target, targets, lower and upper have no effect with assertionType 'regex' " +
            "(the backend silently ignores them) and must not be set.",
        });
      }
      return;
    }

    if (rule.pattern !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["pattern"],
        message: "pattern is only valid with assertionType 'regex'.",
      });
    }

    if (hasRange && rule.assertionType !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["lower"],
        message: "lower/upper range assertions are only valid with assertionType 'number'.",
      });
    }

    if (hasTargets) {
      if (hasCompare || hasRange) {
        ctx.addIssue({
          code: "custom",
          path: ["targets"],
          message:
            "targets defines a list-match assertion and cannot be combined with operator/target or lower/upper.",
        });
      }
      return;
    }

    if (hasRange) {
      if (hasCompare) {
        ctx.addIssue({
          code: "custom",
          path: ["lower"],
          message: "lower/upper cannot be combined with operator/target.",
        });
      }
      if (rule.lower === undefined || rule.upper === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["lower"],
          message:
            "Both lower and upper are required for a range assertion; setting only one silently evaluates as always-false at runtime.",
        });
      }
      return;
    }

    if (rule.operator === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["operator"],
        message:
          "operator is required for a compare assertion when targets/lower/upper are not set.",
      });
    }
    if (rule.target === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message:
          "target is required for a compare assertion when targets/lower/upper are not set.",
      });
    }
  });

export const CreateFunctionalTestingApiResponseSchema = z.object({
  statusCodes: z
    .array(CreateFunctionalTestingStatusRangeSchema)
    .optional()
    .describe(
      "Expected HTTP status code ranges, e.g. [{start: 200, end: 299}]",
    ),
  body: z
    .string()
    .optional()
    .describe("Expected exact response body, compared as-is"),
  bodyType: z
    .enum(["json", "xml"])
    .optional()
    .describe('Response body format, defaults to "json"'),
  bodyRules: z
    .array(CreateFunctionalTestingBodyRuleSchema)
    .optional()
    .describe("Assertion rules evaluated against the response body"),
});

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
  apiResponse: CreateFunctionalTestingApiResponseSchema.optional().describe(
    "Expected response assertions: status code ranges, exact body match, and/or field-level body rules.",
  ),
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
export type CreateFunctionalTestingStatusRange = z.infer<
  typeof CreateFunctionalTestingStatusRangeSchema
>;
export type CreateFunctionalTestingBodyRule = z.infer<
  typeof CreateFunctionalTestingBodyRuleSchema
>;
export type CreateFunctionalTestingApiResponse = z.infer<
  typeof CreateFunctionalTestingApiResponseSchema
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
