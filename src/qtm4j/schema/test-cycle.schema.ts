/**
 * QTM4J Create Test Cycle Schemas
 *
 * POST /rest/api/latest/testcycles
 */
import { z } from "zod";

const SUMMARY_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 65_535;

/**
 * projectId and folderId are injected automatically by the tool.
 * priority, status, labels, and components accept human-readable names
 * and are auto-resolved to numeric IDs before the API call.
 */
export const CreateTestCycleBody = z.object({
  summary: z
    .string()
    .min(1)
    .max(SUMMARY_MAX_LENGTH)
    .describe(
      "Short title of the test cycle. Must not be blank. Max 255 chars.",
    ),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH)
    .optional()
    .describe("Detailed description of the test cycle. Max 65 535 characters."),
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
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "List of label names (e.g., ['Release_1', 'Sprint 1']). Auto-resolved to IDs.",
    ),
  components: z
    .array(z.string())
    .optional()
    .describe(
      "List of component names (e.g., ['UI', 'Cloud']). Auto-resolved to IDs.",
    ),
  plannedStartDate: z
    .string()
    .regex(/^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/)
    .optional()
    .describe(
      "Planned start date. Format: 'dd/MMM/yyyy HH:mm' e.g. '10/May/2026 00:00'. Must be ≤ plannedEndDate when both are provided.",
    ),
  plannedEndDate: z
    .string()
    .regex(/^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/)
    .optional()
    .describe(
      "Planned end date. Format: 'dd/MMM/yyyy HH:mm' e.g. '15/May/2026 00:00'. Must be ≥ plannedStartDate when both are provided.",
    ),
});

export const CreateTestCycleResponse = z.object({
  id: z
    .string()
    .describe(
      "Opaque permanent identifier of the created test cycle. Use this in all subsequent API calls.",
    ),
  key: z
    .string()
    .describe(
      "Human-readable project-scoped key in format '<PROJECT_KEY>-TR-<number>'. e.g. 'TRWT-TR-218'.",
    ),
});

export type CreateTestCycleResponseType = z.infer<
  typeof CreateTestCycleResponse
>;
