import * as zod from "zod";
import { PAGINATION } from "../config/constants.ts";

export const GetTestStepsFilter = zod
  .object({
    stepDetails: zod
      .string()
      .optional()
      .describe(
        "Substring match on step details (action text). Example: 'Open the application'",
      ),
    testData: zod
      .string()
      .optional()
      .describe(
        "Substring match on test data. Example: 'Username: user1, Password: pass123'",
      ),
    expectedResult: zod
      .string()
      .optional()
      .describe(
        "Substring match on expected result. Example: 'User should be logged in successfully'",
      ),
  })
  .describe(
    "Text filters for test steps — each field performs a substring match. Multiple fields are combined with AND.",
  );

export const GetTestStepsBody = zod.object({
  key: zod
    .string()
    .describe(
      "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'. " +
        "PROJECT_KEY is the Jira project key (e.g. 'SCRUM'). " +
        "The number is the test case counter within that project (auto-incremented, not related to seqNo). " +
        "Obtain keys from the search_test_cases tool or directly from QTM4J.",
    ),
  versionNo: zod
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Test case version number. Defaults to the latest version if omitted. " +
        "Obtain from search_test_cases response field: version.versionNo",
    ),
  filter: GetTestStepsFilter.optional(),
  startAt: zod
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(
      "Zero-indexed offset for pagination (URL query param). Default: 0.",
    ),
  maxResults: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_STEPS)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_STEPS)
    .describe(
      "Number of steps per page (URL query param). Default: 50. Maximum: 100.",
    ),
  sort: zod
    .string()
    .optional()
    .describe(
      "Sort pattern (URL query param). Format: 'fieldName:order'. " +
        "Sortable fields: stepDetails, testData, seqNo, expectedResult. " +
        "Order values: 'asc' or 'desc'. Example: 'seqNo:asc'",
    ),
});

export const ShareableTestStepSchema = zod.object({
  id: zod.number().optional(),
  seqNo: zod
    .union([zod.string(), zod.number()])
    .optional()
    .describe("Sequence number within the shared test case, e.g. '1.1', '1.3'"),
  stepDetails: zod
    .string()
    .describe("Step action / description — always required"),
  testData: zod.string().nullish().describe("Input data for this step"),
  expectedResult: zod
    .string()
    .nullish()
    .describe("Expected outcome of this step"),
  testcase_version_id: zod.number().optional(),
});

export const ShareableSchema = zod
  .object({
    shareableTestcaseUID: zod.string().optional(),
    shareableVersionNo: zod.number().optional(),
    archived: zod.boolean().optional(),
    projectId: zod.number().optional(),
    shareableTestSteps: zod
      .array(ShareableTestStepSchema)
      .optional()
      .describe("Embedded steps from the shared test case"),
  })
  .describe(
    "Present when this step is a reference to a shared (reusable) test case. Contains its embedded sub-steps.",
  );

export const TestStepSchema = zod
  .object({
    id: zod.number().describe("Internal test step ID"),
    seqNo: zod
      .union([zod.string(), zod.number()])
      .optional()
      .describe("Step sequence number within the test case (e.g. 1, 2, 3)"),
    stepDetails: zod
      .string()
      .describe("Step action / description — always required"),
    testData: zod.string().nullish().describe("Input data for this step"),
    expectedResult: zod
      .string()
      .nullish()
      .describe("Expected outcome of this step"),
    testcase_version_id: zod.number().optional(),
    attachmentCount: zod
      .number()
      .optional()
      .describe("Number of attachments on this step"),
    shareable: ShareableSchema.nullable().optional(),
  })
  .passthrough();

export const GetTestStepsResponse = zod.object({
  total: zod
    .number()
    .describe("Total steps matching the filter (across all pages)"),
  startAt: zod.number().describe("Offset of this page"),
  maxResults: zod.number().describe("Page size used for this response"),
  data: zod.array(TestStepSchema).describe("Test steps on this page"),
});

export type GetTestStepsBodyType = zod.infer<typeof GetTestStepsBody>;
export type GetTestStepsFilterType = zod.infer<typeof GetTestStepsFilter>;
export type GetTestStepsResponseType = zod.infer<typeof GetTestStepsResponse>;
export type TestStepType = zod.infer<typeof TestStepSchema>;
