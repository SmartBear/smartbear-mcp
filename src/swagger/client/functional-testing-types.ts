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

export type RunFunctionalTestingTestParams = z.infer<
  typeof RunFunctionalTestingTestParamsSchema
>;
export type GetFunctionalTestingExecutionTestParams = z.infer<
  typeof GetFunctionalTestingExecutionTestSchema
>;
export type ListFunctionalTestingSuiteExecutionsParams = z.infer<
  typeof ListFunctionalTestingSuiteExecutionsSchema
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
