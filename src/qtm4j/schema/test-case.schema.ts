/**
 * QTM4J Test Case Schemas
 *
 * Zod schemas for test-case-related API requests and responses.
 */
import { z } from "zod";

export const TestStepSchema = z.object({
  stepDetails: z
    .string()
    .describe("Step description/action — always required for each step"),
  testData: z
    .string()
    .optional()
    .describe(
      "Test data for this step. Always include this field for each step — use empty string if no test data is applicable.",
    ),
  expectedResult: z
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
export const CreateTestCaseBody = z.object({
  summary: z.string().describe("Test case summary/title"),
  description: z.string().optional().describe("Test case description"),
  folderId: z
    .number()
    .optional()
    .describe("Folder ID to place the test case in"),
  priority: z
    .string()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium', 'Low'). Auto-resolved to ID.",
    ),
  status: z
    .string()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress', 'Done'). Auto-resolved to ID.",
    ),
  assignee: z.string().optional().describe("Assignee account ID"),
  reporter: z.string().optional().describe("Reporter account ID"),
  components: z
    .array(z.string())
    .optional()
    .describe(
      "List of component names (e.g., ['UI', 'Cloud']). Auto-resolved to IDs.",
    ),
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "List of label names (e.g., ['Release_1', 'Sprint 1']). Auto-resolved to IDs.",
    ),
  steps: z.array(TestStepSchema).optional().describe("List of test steps"),
});

export const CreateTestCaseResponse = z.object({
  id: z.string().describe("Unique test case ID"),
  key: z.string().describe("Test case key (e.g., 'SCRUM-TC-190')"),
  versionNo: z.number().describe("Version number"),
  summary: z.string().describe("Test case summary"),
});

export type CreateTestCaseBodyType = z.infer<typeof CreateTestCaseBody>;
export type CreateTestCaseResponseType = z.infer<typeof CreateTestCaseResponse>;
