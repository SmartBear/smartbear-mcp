/**
 * QTM4J Test Case Schemas
 *
 * Zod schemas for test-case-related API requests and responses.
 */
import * as zod from "zod";

export const TestStepSchema = zod.object({
  stepDetails: zod
    .string()
    .describe("Step description/action — always required for each step"),
  testData: zod
    .string()
    .optional()
    .describe(
      "Test data for this step. Always include this field for each step — use empty string if no test data is applicable.",
    ),
  expectedResult: zod
    .string()
    .optional()
    .describe(
      "Expected result after performing the step. Always include this field for each step — describe what should happen.",
    ),
});

/**
 * POST /rest/api/ui/testcases
 *
 * Accepts human-readable names for priority, status, labels, and components.
 * These are auto-resolved to numeric IDs before calling the API.
 * NOTE: projectKey is NOT an input — set via set_project_context first.
 */
export const CreateTestCaseBody = zod.object({
  summary: zod.string().describe("Test case summary/title"),
  description: zod.string().optional().describe("Test case description"),
  folderId: zod
    .number()
    .optional()
    .describe("Folder ID to place the test case in"),
  priority: zod
    .string()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium', 'Low'). Auto-resolved to ID.",
    ),
  status: zod
    .string()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress', 'Done'). Auto-resolved to ID.",
    ),
  assignee: zod.string().optional().describe("Assignee account ID"),
  reporter: zod.string().optional().describe("Reporter account ID"),
  components: zod
    .array(zod.string())
    .optional()
    .describe(
      "List of component names (e.g., ['UI', 'Cloud']). Auto-resolved to IDs.",
    ),
  labels: zod
    .array(zod.string())
    .optional()
    .describe(
      "List of label names (e.g., ['Release_1', 'Sprint 1']). Auto-resolved to IDs.",
    ),
  steps: zod.array(TestStepSchema).optional().describe("List of test steps"),
});

export const CreateTestCaseResponse = zod.object({
  id: zod.string().describe("Unique test case ID"),
  key: zod.string().describe("Test case key (e.g., 'SCRUM-TC-190')"),
  versionNo: zod.number().describe("Version number"),
  summary: zod.string().describe("Test case summary"),
});

export type CreateTestCaseBodyType = zod.infer<typeof CreateTestCaseBody>;
export type CreateTestCaseResponseType = zod.infer<
  typeof CreateTestCaseResponse
>;
