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
    name: z.string().describe("Name for the new suite").trim().min(1),
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
  id: z.number().describe("ID of the newly created suite"),
  slug: z.string().describe("Slug of the newly created suite"),
  url: z
    .string()
    .describe("Link to the created suite in Swagger Functional Testing UI"),
  actionIds: z
    .array(z.string())
    .describe(
      "IDs assigned to the suite's initial runApiTests actions, in order. Use these to target " +
        "the suite's actions in a later swagger_update_suite call without an extra swagger_get_suite call.",
    ),
});

export type CreateFunctionalTestingSuiteResponse = z.infer<
  typeof CreateFunctionalTestingSuiteResponseSchema
>;

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

// Suite workflow node / update_suite types.
//
// `SuiteWorkflowAction` is a polymorphic tree covering every suite action kind, but the MCP tool
// surface (`swagger_update_suite`) only accepts writes to `runApiTests` nodes. Every other node type
// (e.g. the decision/sendEmail tail every suite is auto-created with) is still returned by
// `swagger_get_suite` and addressable by `id` for `afterActionId`/`branch`/delete/move — it just can't
// be constructed or edited through this tool.
export const WORKFLOW_NODE_TYPES = [
  "runApiTests",
  "decision",
  "sendEmail",
  "runBrowserTests",
  "runMobileTests",
  "callApi",
  "sendSlack",
  "sleep",
] as const;

export interface WorkflowNode {
  id: string;
  type: (typeof WORKFLOW_NODE_TYPES)[number];
  title?: string;
  // Present only on `runApiTests` nodes.
  testIds?: number[];
  parallel?: boolean;
  maxRetryAttempts?: number;
  next?: WorkflowNode;
  // Present only on `decision` nodes; `next` doubles as the decision's "success" branch.
  failure?: WorkflowNode;
}

// The Functional Testing API's actual wire format for a workflow tree node: the discriminator key is
// `action` (not `type`), and its values are kebab-case (not the camelCase `WORKFLOW_NODE_TYPES` this
// tool surface exposes to callers). `run-tests` on the wire specifically means a browser-test action
// (`runBrowserTests` here) — API-test and mobile-test actions each have their own distinct wire value.
export const WIRE_WORKFLOW_ACTION_TYPES = [
  "run-api-tests",
  "decision",
  "send-email",
  "run-tests",
  "run-mobile-tests",
  "call-api",
  "send-slack",
  "sleep",
] as const;

export type WireWorkflowActionType =
  (typeof WIRE_WORKFLOW_ACTION_TYPES)[number];

export const WIRE_TO_WORKFLOW_NODE_TYPE: Record<
  WireWorkflowActionType,
  (typeof WORKFLOW_NODE_TYPES)[number]
> = {
  "run-api-tests": "runApiTests",
  decision: "decision",
  "send-email": "sendEmail",
  "run-tests": "runBrowserTests",
  "run-mobile-tests": "runMobileTests",
  "call-api": "callApi",
  "send-slack": "sendSlack",
  sleep: "sleep",
};

export interface RawWorkflowNode {
  id: string;
  action: WireWorkflowActionType;
  title?: string;
  testIds?: number[];
  parallel?: boolean;
  maxRetryAttempts?: number;
  next?: RawWorkflowNode;
  failure?: RawWorkflowNode;
}

/**
 * Translates a workflow tree node from the Functional Testing API's wire format (`action`,
 * kebab-case) into this tool surface's public shape (`type`, camelCase).
 */
export function toWorkflowNode(raw: RawWorkflowNode): WorkflowNode {
  return {
    id: raw.id,
    type: WIRE_TO_WORKFLOW_NODE_TYPE[raw.action],
    title: raw.title,
    testIds: raw.testIds,
    parallel: raw.parallel,
    maxRetryAttempts: raw.maxRetryAttempts,
    next: raw.next ? toWorkflowNode(raw.next) : undefined,
    failure: raw.failure ? toWorkflowNode(raw.failure) : undefined,
  };
}

export const GetFunctionalTestingSuiteParamsSchema = z.object({
  slug: z
    .string()
    .describe(
      "Slug of the Functional Testing suite, as returned by swagger_create_suite or swagger_list_suites",
    )
    .trim()
    .min(1),
});

export type GetFunctionalTestingSuiteParams = z.infer<
  typeof GetFunctionalTestingSuiteParamsSchema
>;

export interface GetFunctionalTestingSuiteResponse {
  slug: string;
  root: WorkflowNode;
}

// Raw shape of `GET /suites/{slug}`'s response, as actually returned by the Functional Testing API
// (the slug is keyed `suiteId` on the wire, and `root` uses `RawWorkflowNode`'s `action`/kebab-case
// format — see `toWorkflowNode`).
export interface RawGetFunctionalTestingSuiteResponse {
  suiteId: string;
  root: RawWorkflowNode;
}

const WorkflowNodeSchema: z.ZodType<WorkflowNode> = z.lazy(() =>
  z.object({
    id: z.string().describe("Unique id of this action within the suite."),
    type: z
      .enum(WORKFLOW_NODE_TYPES)
      .describe("The kind of action this node performs."),
    title: z
      .string()
      .optional()
      .describe("Human-readable label for this action."),
    testIds: z
      .array(z.number())
      .optional()
      .describe(
        "Present only on `runApiTests` nodes: the tests this action runs.",
      ),
    parallel: z.boolean().optional(),
    maxRetryAttempts: z.number().optional(),
    next: WorkflowNodeSchema.optional().describe(
      "The action that runs after this one — this is what defines execution order in the suite; " +
        "the tree has no separate ordering field or index, so order must be read by following `next` " +
        "chains from `root`. On a `decision` node, `next` is specifically the success branch.",
    ),
    failure: WorkflowNodeSchema.optional().describe(
      "Present only on `decision` nodes: the action to run next if the decision fails, as opposed to " +
        "`next`, which is the success branch.",
    ),
  }),
);

export const GetFunctionalTestingSuiteResponseSchema = z.object({
  slug: z.string(),
  root: WorkflowNodeSchema,
});

const UpdateSuiteBranchSchema = z
  .enum(["next", "failure"])
  .describe(
    "Which of the anchor decision node's two branches to target. Required if and only if the " +
      "action named by `afterActionId` (for `add`/`move`) is a decision node; omit it otherwise.",
  );

const UpdateSuiteSlugSchema = z
  .string()
  .describe(
    "Slug of the Functional Testing suite to update, as returned by swagger_create_suite",
  )
  .trim()
  .min(1);

const UpdateSuiteActionIdSchema = z
  .string()
  .describe(
    "ID of the action to target. Must come from the most recent swagger_get_suite call, or from a " +
      "prior swagger_update_suite `add` response's `id` — there is no full-tree echo to fall back on.",
  )
  .trim()
  .min(1);

const UpdateSuiteAfterActionIdSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .describe(
    "ID of the action to insert/move after, sourced the same way as `id` (most recent " +
      "swagger_get_suite call, or a prior `add` response). Pass null to target the new root, " +
      "before every existing action.",
  );

export const UpdateFunctionalTestingSuiteParamsSchema = z.discriminatedUnion(
  "operation",
  [
    z.object({
      slug: UpdateSuiteSlugSchema,
      operation: z
        .literal("add")
        .describe("Insert a new runApiTests action into the suite."),
      afterActionId: UpdateSuiteAfterActionIdSchema,
      branch: UpdateSuiteBranchSchema.optional(),
      action: z
        .object({
          testIds: z
            .array(z.number())
            .min(1)
            .describe("IDs of existing tests to include in this action."),
          parallel: z
            .boolean()
            .optional()
            .describe(
              "Whether to run this action's tests in parallel instead of sequentially. Defaults to false.",
            ),
          maxRetryAttempts: z
            .number()
            .int()
            .min(0)
            .max(3)
            .optional()
            .describe(
              "Number of times to retry a failed test in this action before it counts as failed (0-3).",
            ),
          title: z
            .string()
            .trim()
            .min(1)
            .optional()
            .describe(
              "Label for this action, shown in the suite workflow. Must be unique among the suite's actions.",
            ),
        })
        .describe("The new action to add. API-test actions only."),
    }),
    z.object({
      slug: UpdateSuiteSlugSchema,
      operation: z
        .literal("edit")
        .describe("Patch an existing runApiTests action in place."),
      id: UpdateSuiteActionIdSchema,
      action: z
        .object({
          testIds: z
            .array(z.number())
            .min(1)
            .optional()
            .describe("If present, replaces the action's test IDs."),
          parallel: z.boolean().optional(),
          maxRetryAttempts: z.number().int().min(0).max(3).optional(),
          title: z.string().trim().min(1).optional(),
        })
        .describe(
          "Partial patch — only fields present here are changed; omitted fields are left as-is.",
        ),
    }),
    z.object({
      slug: UpdateSuiteSlugSchema,
      operation: z
        .literal("delete")
        .describe("Remove an existing action from the suite."),
      id: UpdateSuiteActionIdSchema,
    }),
    z.object({
      slug: UpdateSuiteSlugSchema,
      operation: z
        .literal("move")
        .describe(
          "Reposition an existing action elsewhere in the suite (single-node move, not a subtree move).",
        ),
      id: UpdateSuiteActionIdSchema.describe(
        "ID of the action to move. Sourced the same way as other ids (see description above).",
      ),
      afterActionId: UpdateSuiteAfterActionIdSchema,
      branch: UpdateSuiteBranchSchema.optional(),
    }),
  ],
);

export type UpdateFunctionalTestingSuiteParams = z.infer<
  typeof UpdateFunctionalTestingSuiteParamsSchema
>;

// `looseObject` (not `object`): the Functional Testing API's PATCH response includes further
// fields beyond `success`/`id` (e.g. echoing back the applied action) that this tool surface
// doesn't model — a strict object would reject those as "additional properties" on every real
// API response.
export const UpdateFunctionalTestingSuiteResponseSchema = z.looseObject({
  success: z.boolean().describe("Whether the operation was applied."),
  id: z
    .string()
    .optional()
    .describe(
      "ID assigned to the newly created action. Present only when `operation` was `add`.",
    ),
});

export type UpdateFunctionalTestingSuiteResponse = z.infer<
  typeof UpdateFunctionalTestingSuiteResponseSchema
>;
