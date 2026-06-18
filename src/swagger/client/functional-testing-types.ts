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

export const RunFunctionalTestingSuiteParamsSchema = z.object({
  suiteId: z
    .string()
    .min(1)
    .describe("ID of the Functional Testing suite to run"),
  tunnelAgentName: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional tunnel agent name to override the suite's saved tunnel for this run. When omitted, the suite's saved tunnel overrides are used, falling back to each test's saved tunnel.",
    ),
});

export const GetFunctionalTestingSuiteExecutionSchema = z.object({
  suiteId: z.string().min(1).describe("ID of the Functional Testing suite"),
  executionId: z
    .string()
    .min(1)
    .describe("ID of the Functional Testing suite execution"),
});

export type RunFunctionalTestingTestParams = z.infer<
  typeof RunFunctionalTestingTestParamsSchema
>;
export type GetFunctionalTestingExecutionTestParams = z.infer<
  typeof GetFunctionalTestingExecutionTestSchema
>;
export type RunFunctionalTestingSuiteParams = z.infer<
  typeof RunFunctionalTestingSuiteParamsSchema
>;
export type GetFunctionalTestingSuiteExecutionParams = z.infer<
  typeof GetFunctionalTestingSuiteExecutionSchema
>;

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
