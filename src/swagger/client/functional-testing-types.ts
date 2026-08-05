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
  slug: z
    .string()
    .describe("Slug of the Functional Testing suite to list executions for.")
    .trim()
    .min(1),
});

export const CancelFunctionalTestingSuiteExecutionSchema = z.object({
  slug: z
    .string()
    .describe("Slug of the Functional Testing suite the execution belongs to.")
    .trim()
    .min(1),
  executionId: z
    .string()
    .describe("ID of the Functional Testing suite execution to cancel")
    .trim()
    .min(1),
});

export const RunApiTestsBlockSchema = z.object({
  testIds: z
    .array(z.number())
    .min(1)
    .describe("IDs of existing tests to include in this block."),
  parallel: z
    .boolean()
    .optional()
    .describe(
      "Whether to run this block's tests in parallel instead of sequentially. " +
        "Defaults to false (sequential). When true, tests run at the account's maximum parallelism.",
    ),
  maxRetryAttempts: z
    .number()
    .int()
    .min(0)
    .max(3)
    .optional()
    .describe(
      "Number of times to retry a failed test in this block before it counts as failed (0-3). " +
        "Omit or set to 0 for no retry.",
    ),
  title: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Label for this block, shown in the suite workflow. Must be unique among the suite's blocks.",
    ),
});

export const CreateFunctionalTestingSuiteParamsSchema = z
  .object({
    name: z
      .string()
      .describe(
        "Name for the new suite. Use the name explicitly provided by the user, or if none was given, " +
          "a descriptive name derived from the purpose or context of the tests being grouped into this suite. " +
          "This must be a human-readable name, not a numeric ID or test ID.",
      )
      .trim()
      .min(1),
    agentName: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "Tunnel agent name to save as this suite's tunnel override for future runs.",
      ),
    runApiTests: z
      .array(RunApiTestsBlockSchema)
      .min(1)
      .describe(
        'Required — ordered groups ("blocks") of tests to run one after another. ' +
          "Must include at least one entry; suites cannot be created without a workflow. " +
          "Within a block, tests run sequentially unless `parallel` is set. " +
          "Block `title`s must be unique within the suite.",
      ),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.runApiTests.forEach((block, index) => {
      if (!block.title) return;
      if (seen.has(block.title)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate block title "${block.title}". Block titles must be unique within the suite.`,
          path: ["runApiTests", index, "title"],
        });
      }
      seen.add(block.title);
    });
  });

export type CreateFunctionalTestingSuiteParams = z.infer<
  typeof CreateFunctionalTestingSuiteParamsSchema
>;

export const CreateFunctionalTestingSuiteResponseSchema = z.object({
  slug: z
    .string()
    .describe(
      "Slug of the newly created suite. Use this value as the `slug` argument for other Functional Testing suite tools (e.g. `swagger_run_suite`).",
    ),
  url: z
    .string()
    .describe("Link to the created suite in Swagger Functional Testing UI"),
});

export type CreateFunctionalTestingSuiteResponse = z.infer<
  typeof CreateFunctionalTestingSuiteResponseSchema
>;

export const RunFunctionalTestingSuiteParamsSchema = z.object({
  slug: z
    .string()
    .describe("Slug of the Functional Testing suite to run.")
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
  slug: z
    .string()
    .describe("Slug of the Functional Testing suite.")
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
  slug: string;
  executions: {
    data: SuiteExecution[];
  };
}

export interface FunctionalTestingTestSummary {
  id: number;
  name: string;
  created: number;
  tags: string[];
  folders: string[];
  url: string;
}

export interface ListTestsResponse {
  tests: FunctionalTestingTestSummary[];
}

export interface Suite {
  name: string;
  slug: string;
  created: number;
}

export interface ListSuitesResponse {
  suites: Suite[];
}

export interface ListSuitesApiResponse {
  suites: {
    data: {
      name: string;
      suiteId: string;
      created: number;
    }[];
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

export const CreateFunctionalTestingStatusRangeSchema = z
  .object({
    start: z
      .number()
      .int()
      .min(100)
      .max(599)
      .describe("Start of the HTTP status code range, inclusive"),
    end: z
      .number()
      .int()
      .min(100)
      .max(599)
      .describe("End of the HTTP status code range, inclusive"),
  })
  .refine((range) => range.start <= range.end, {
    message: "start must be less than or equal to end",
    path: ["start"],
  });

export const CreateFunctionalTestingBodyRuleSchema = z
  .object({
    path: z
      .string()
      .regex(
        /^(\["[^"]*"\])+$/,
        'Path must be in bracket notation, e.g. \'["data"]["id"]\'.',
      )
      .describe(
        'Path to the field to assert, in bracket notation (e.g. \'["data"]["id"]\').',
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
  .meta({
    // Structural rules (in addition to the .superRefine() below) so the generated
    // JSON Schema states which fields are required/forbidden per assertionType and
    // assertion mode, instead of leaving every field optional with the constraint
    // only in prose.
    allOf: [
      {
        if: { properties: { assertionType: { const: "regex" } } },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema if/then/else keyword, not a thenable
        then: {
          required: ["pattern"],
          properties: {
            operator: false,
            target: false,
            targets: false,
            lower: false,
            upper: false,
          },
        },
        message:
          "pattern is required, and operator/target/targets/lower/upper must not be set, when assertionType is 'regex'",
      },
      {
        if: { not: { properties: { assertionType: { const: "regex" } } } },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema if/then/else keyword, not a thenable
        then: { properties: { pattern: false } },
        message: "pattern must not be set unless assertionType is 'regex'",
      },
      {
        if: { required: ["targets"] },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema if/then/else keyword, not a thenable
        then: {
          properties: {
            operator: false,
            target: false,
            lower: false,
            upper: false,
          },
        },
        message:
          "targets cannot be combined with operator/target or lower/upper",
      },
      {
        if: {
          anyOf: [{ required: ["lower"] }, { required: ["upper"] }],
        },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema if/then/else keyword, not a thenable
        then: {
          required: ["lower", "upper"],
          properties: {
            assertionType: { const: "number" },
            operator: false,
            target: false,
            targets: false,
          },
        },
        message:
          "lower and upper must both be set together, only with assertionType 'number', and cannot be combined with operator/target/targets",
      },
    ],
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
        message:
          "lower/upper range assertions are only valid with assertionType 'number'.",
      });
      return;
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

export const CreateFunctionalTestingAssertionsSchema = z.object({
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

export const CreateFunctionalTestingTestParameterSchema = z.object({
  name: z.string().trim().min(1).describe("Parameter name"),
  value: z.string().optional().describe("Parameter default value"),
});

export const CreateFunctionalTestingTestStepSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Full URL for the API call. May include OAS-style {pathParam} placeholders. " +
        "When baseUrl is set, url must start with it.",
    ),
  baseUrl: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Server/common URL for this step's endpoint (e.g. https://petstore.swagger.io/v2). " +
        "When set, it is extracted into a definition-level parameter and templated into " +
        "the step url, mirroring how the Swagger Functional Testing UI stores API base URLs.",
    ),
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
  assertions: CreateFunctionalTestingAssertionsSchema.optional().describe(
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
  parameters: z
    .array(CreateFunctionalTestingTestParameterSchema)
    .describe(
      "Definition-level parameters for the test (e.g. base URLs, path params). " +
        "Merged with parameters generated from steps' baseUrl/{pathParam} placeholders.",
    )
    .optional(),
});

export type CreateFunctionalTestingTestParams = z.infer<
  typeof CreateFunctionalTestingTestParamsSchema
>;
export type CreateFunctionalTestingTestParameter = z.infer<
  typeof CreateFunctionalTestingTestParameterSchema
>;
export type CreateFunctionalTestingStatusRange = z.infer<
  typeof CreateFunctionalTestingStatusRangeSchema
>;
export type CreateFunctionalTestingBodyRule = z.infer<
  typeof CreateFunctionalTestingBodyRuleSchema
>;
export type CreateFunctionalTestingAssertions = z.infer<
  typeof CreateFunctionalTestingAssertionsSchema
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
