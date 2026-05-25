/**
 * QTM4J Create Test Cycle Schemas
 *
 * POST /rest/api/latest/testcycles
 */
import * as zod from "zod";

/**
 * projectId and folderId are injected automatically by the tool.
 * priority, status, labels, and components accept human-readable names
 * and are auto-resolved to numeric IDs before the API call.
 */
export const CreateTestCycleBody = zod.object({
  summary: zod
    .string()
    .min(1)
    .max(255)
    .describe(
      "Short title of the test cycle. Must not be blank. Max 255 chars.",
    ),
  description: zod
    .string()
    .max(65535)
    .optional()
    .describe("Detailed description of the test cycle. Max 65 535 characters."),
  priority: zod
    .string()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium', 'Low'). Auto-resolved to ID via set_project_context.",
    ),
  status: zod
    .string()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress'). Auto-resolved to ID via set_project_context.",
    ),
  assignee: zod.string().optional().describe("Assignee account ID"),
  reporter: zod
    .string()
    .optional()
    .describe("Jira account UUID of the reporter. Default: the calling user."),
  labels: zod
    .array(zod.string())
    .optional()
    .describe(
      "List of label names (e.g., ['Release_1', 'Sprint 1']). Auto-resolved to IDs.",
    ),
  components: zod
    .array(zod.string())
    .optional()
    .describe(
      "List of component names (e.g., ['UI', 'Cloud']). Auto-resolved to IDs.",
    ),
  plannedStartDate: zod
    .string()
    .regex(/^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/)
    .optional()
    .describe(
      "Planned start date. Format: 'dd/MMM/yyyy HH:mm' e.g. '10/May/2026 00:00'. Must be ≤ plannedEndDate when both are provided.",
    ),
  plannedEndDate: zod
    .string()
    .regex(/^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/)
    .optional()
    .describe(
      "Planned end date. Format: 'dd/MMM/yyyy HH:mm' e.g. '15/May/2026 00:00'. Must be ≥ plannedStartDate when both are provided.",
    ),
});

export const CreateTestCycleResponse = zod.object({
  id: zod
    .string()
    .describe(
      "Opaque permanent identifier of the created test cycle. Use this in all subsequent API calls.",
    ),
  key: zod
    .string()
    .describe(
      "Human-readable project-scoped key in format '<PROJECT_KEY>-TR-<number>'. e.g. 'TRWT-TR-218'.",
    ),
});

export type CreateTestCycleResponseType = zod.infer<
  typeof CreateTestCycleResponse
>;
