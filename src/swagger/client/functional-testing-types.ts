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
