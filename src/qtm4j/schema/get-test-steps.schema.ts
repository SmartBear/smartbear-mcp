import { z } from "zod";
import { PAGINATION } from "../config/constants.ts";

export const GetTestStepsFilter = z
  .object({
    stepDetails: z
      .string()
      .optional()
      .describe(
        "Substring match on step details (action text). Example: 'Open the application'",
      ),
    testData: z
      .string()
      .optional()
      .describe(
        "Substring match on test data. Example: 'Username: user1, Password: pass123'",
      ),
    expectedResult: z
      .string()
      .optional()
      .describe(
        "Substring match on expected result. Example: 'User should be logged in successfully'",
      ),
  })
  .describe(
    "Text filters for test steps — each field performs a substring match. Multiple fields are combined with AND.",
  );

export const GetTestStepsBody = z.object({
  key: z
    .string()
    .describe(
      "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'. " +
        "PROJECT_KEY is the Jira project key (e.g. 'SCRUM'). " +
        "The number is the test case counter within that project (auto-incremented, not related to seqNo). " +
        "Obtain keys from the search_test_cases tool or directly from QTM4J.",
    ),
  versionNo: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Test case version number. Defaults to the latest version if omitted. " +
        "Obtain from search_test_cases response field: version.versionNo",
    ),
  filter: GetTestStepsFilter.optional(),
  startAt: z
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(
      "Zero-indexed offset for pagination (URL query param). Default: 0.",
    ),
  maxResults: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_STEPS)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_STEPS)
    .describe(
      "Number of steps per page (URL query param). Default: 50. Maximum: 100.",
    ),
  sort: z
    .string()
    .optional()
    .describe(
      "Sort pattern (URL query param). Format: 'fieldName:order'. " +
        "Sortable fields: stepDetails, testData, seqNo, expectedResult. " +
        "Order values: 'asc' or 'desc'. Example: 'seqNo:asc'",
    ),
});

export const ShareableTestStepSchema = z.object({
  id: z.number().optional(),
  seqNo: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Sequence number within the shared test case, e.g. '1.1', '1.3'"),
  stepDetails: z
    .string()
    .describe("Step action / description — always required"),
  testData: z.string().nullish().describe("Input data for this step"),
  expectedResult: z
    .string()
    .nullish()
    .describe("Expected outcome of this step"),
  testcase_version_id: z.number().optional(),
});

export const ShareableSchema = z
  .object({
    // biome-ignore lint/style/useNamingConvention: mirrors the QTM4J API response field name verbatim
    shareableTestcaseUID: z.string().optional(),
    shareableVersionNo: z.number().optional(),
    archived: z.boolean().optional(),
    projectId: z.number().optional(),
    shareableTestSteps: z
      .array(ShareableTestStepSchema)
      .optional()
      .describe("Embedded steps from the shared test case"),
  })
  .describe(
    "Present when this step is a reference to a shared (reusable) test case. Contains its embedded sub-steps.",
  );

export const TestStepSchema = z
  .object({
    id: z.number().describe("Internal test step ID"),
    seqNo: z
      .union([z.string(), z.number()])
      .optional()
      .describe("Step sequence number within the test case (e.g. 1, 2, 3)"),
    stepDetails: z
      .string()
      .describe("Step action / description — always required"),
    testData: z.string().nullish().describe("Input data for this step"),
    expectedResult: z
      .string()
      .nullish()
      .describe("Expected outcome of this step"),
    testcase_version_id: z.number().optional(),
    attachmentCount: z
      .number()
      .optional()
      .describe("Number of attachments on this step"),
    shareable: ShareableSchema.nullable().optional(),
  })
  .passthrough();

export const GetTestStepsResponse = z.object({
  total: z
    .number()
    .describe("Total steps matching the filter (across all pages)"),
  startAt: z.number().describe("Offset of this page"),
  maxResults: z.number().describe("Page size used for this response"),
  data: z.array(TestStepSchema).describe("Test steps on this page"),
});

export type GetTestStepsBodyType = z.infer<typeof GetTestStepsBody>;
export type GetTestStepsFilterType = z.infer<typeof GetTestStepsFilter>;
export type GetTestStepsResponseType = z.infer<typeof GetTestStepsResponse>;
export type TestStepType = z.infer<typeof TestStepSchema>;
