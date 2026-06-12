import { z } from "zod";

export const RunFunctionalTestingTestParamsSchema = z.object({
  testId: z.string().describe("ID of the Functional Testing test to run"),
});

export const GetFunctionalTestingExecutionSchema = z.object({
  executionId: z.string().describe("ID of the Functional Testing execution"),
});

export type RunFunctionalTestingTestParams = z.infer<
  typeof RunFunctionalTestingTestParamsSchema
>;
export type GetFunctionalTestingExecutionParams = z.infer<
  typeof GetFunctionalTestingExecutionSchema
>;
