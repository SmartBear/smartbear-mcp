import zod from "zod";
import { SCHEMA_DESCRIPTIONS } from "../config/constants.ts";

/** Fields that can be set on the test cycle created during import */
const TestCycleFields = zod
  .object({
    labels: zod.array(zod.string()).nullable().optional(),
    components: zod.array(zod.string()).nullable().optional(),
    priority: zod.string().nullable().optional(),
    status: zod.string().nullable().optional(),
    summary: zod.string().nullable().optional(),
    description: zod.string().nullable().optional(),
    assignee: zod.string().nullable().optional(),
    reporter: zod.string().nullable().optional(),
    plannedStartDate: zod.string().nullable().optional().describe("Date in 'dd/MMM/yyyy HH:mm' format, e.g. '14/May/2026 10:30'"),
    plannedEndDate: zod.string().nullable().optional().describe("Date in 'dd/MMM/yyyy HH:mm' format, e.g. '14/May/2026 10:30'"),
  })
  .nullable()
  .optional();

/** Fields that can be set on test cases created/reused during import */
const TestCaseFields = zod
  .object({
    labels: zod.array(zod.string()).nullable().optional(),
    components: zod.array(zod.string()).nullable().optional(),
    priority: zod.string().nullable().optional(),
    status: zod.string().nullable().optional(),
    description: zod.string().nullable().optional(),
    precondition: zod.string().nullable().optional(),
    assignee: zod.string().nullable().optional(),
    reporter: zod.string().nullable().optional(),
    estimatedTime: zod.string().nullable().optional(),
  })
  .nullable()
  .optional();

/** Fields that can be set on test case executions created during import */
const TestCaseExecutionFields = zod
  .object({
    comment: zod.string().nullable().optional(),
    actualTime: zod.string().nullable().optional(),
    executionPlannedDate: zod.string().nullable().optional(),
    assignee: zod.string().nullable().optional(),
  })
  .nullable()
  .optional();

/** Input schema for the uploadAutomationResult tool */
export const UploadAutomationResultBody = zod.object({
  filePath: zod.string().describe(SCHEMA_DESCRIPTIONS.AUTOMATION_FILE_PATH),
  format: zod
    .enum(["cucumber", "testng", "junit", "qaf", "hpuft", "specflow"])
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_FORMAT),
  testCycleToReuse: zod
    .string()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_TEST_CYCLE_TO_REUSE),
  environment: zod
    .string()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_ENVIRONMENT),
  build: zod.string().optional().describe(SCHEMA_DESCRIPTIONS.AUTOMATION_BUILD),
  isZip: zod
    .boolean()
    .optional()
    .default(false)
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_IS_ZIP),
  attachFile: zod
    .boolean()
    .optional()
    .default(false)
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_ATTACH_FILE),
  matchTestSteps: zod
    .boolean()
    .optional()
    .default(true)
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_MATCH_TEST_STEPS),
  appendTestName: zod
    .boolean()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_APPEND_TEST_NAME),
  fields: zod
    .object({
      testCycle: TestCycleFields,
      testCase: TestCaseFields,
      testCaseExecution: TestCaseExecutionFields,
    })
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_FIELDS),
});

export type UploadAutomationResultBodyType = zod.infer<
  typeof UploadAutomationResultBody
>;

/** Response schema for the uploadAutomationResult tool */
export const UploadAutomationResultResponse = zod.object({
  trackingId: zod.string(),
  message: zod.string(),
  filePath: zod.string(),
  format: zod.string(),
});

export type UploadAutomationResultResponseType = zod.infer<
  typeof UploadAutomationResultResponse
>;

/** Input schema for the getAutomationHistory tool */
export const GetAutomationHistoryBody = zod.object({
  startAt: zod
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_HISTORY_START_AT),
  maxResults: zod
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_HISTORY_MAX_RESULTS),
});

export type GetAutomationHistoryBodyType = zod.infer<typeof GetAutomationHistoryBody>;

/** Summary entry within a history record */
const AutomationHistorySummary = zod.object({
  testCycle: zod.string().nullable().optional(),
  testCasesCreated: zod.number().nullable().optional(),
  testCaseVersionsCreated: zod.number().nullable().optional(),
  testCaseVersionsReused: zod.number().nullable().optional(),
  testStepsCreated: zod.number().nullable().optional(),
  testCycleIssueKey: zod.string().nullable().optional(),
  testCycleSummary: zod.string().nullable().optional(),
});

/** A single automation history record */
export const AutomationHistoryRecord = zod.object({
  trackingId: zod.string().nullable().optional(),
  fileName: zod.string().nullable().optional(),
  format: zod.string().nullable().optional(),
  processStatus: zod.string().nullable().optional(),
  importStatus: zod.string().nullable().optional(),
  startTime: zod.string().nullable().optional(),
  endTime: zod.string().nullable().optional(),
  fileSize: zod.number().nullable().optional(),
  detailedMessage: zod.string().nullable().optional(),
  extraAttributes: zod.record(zod.string(), zod.any()).nullable().optional(),
  childFileSummaryResponses: zod.array(zod.any()).nullable().optional(),
  summary: zod.array(AutomationHistorySummary).nullable().optional(),
});

/** Response schema for the getAutomationHistory tool */
export const GetAutomationHistoryResponse = zod.object({
  startAt: zod.number().nullable().optional(),
  maxResults: zod.number().nullable().optional(),
  total: zod.number().nullable().optional(),
  data: zod.array(AutomationHistoryRecord).nullable().optional(),
});

export type GetAutomationHistoryResponseType = zod.infer<typeof GetAutomationHistoryResponse>;
