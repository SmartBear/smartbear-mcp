/**
 * QTM4J Update Test Cycle Schemas
 *
 * PUT /rest/api/latest/testcycles/{key}
 *
 * The test cycle key (e.g. 'SCRUM-TR-101') is used directly as the URL path
 * parameter — no UID resolution required.
 * Input accepts human-readable names for status and priority (auto-resolved to IDs).
 * Labels and components support add/delete operations with name auto-resolution.
 */
import { z } from "zod";

/** add/delete object for labels and components — names are auto-resolved to IDs */
const MetadataAddDelete = z
  .object({
    add: z
      .array(z.string())
      .optional()
      .describe(
        "Names to add (e.g., ['Regression', 'Smoke']). Auto-resolved to IDs.",
      ),
    delete: z
      .array(z.string())
      .optional()
      .describe("Names to remove (e.g., ['Sprint1']). Auto-resolved to IDs."),
  })
  .describe(
    "Add or remove entries by name. Both add and delete are optional — omit either to skip that operation.",
  );

const DATETIME_REGEX = /^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/;
const DATETIME_DESCRIPTION =
  "Format: 'dd/MMM/yyyy HH:mm' e.g. '15/May/2026 09:00'. Month must be capitalised (May not may). Pass null to clear the existing value.";
const SUMMARY_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 65_535;

export const UpdateTestCycleBody = z.object({
  key: z
    .string()
    .describe(
      "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
        "Used directly as the API path parameter.",
    ),
  summary: z
    .string()
    .min(1, "Summary cannot be blank.")
    .max(SUMMARY_MAX_LENGTH, "Summary must not exceed 255 characters.")
    .optional()
    .describe("Updated test cycle name / title. Max 255 characters."),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      "Description must not exceed 65,535 characters.",
    )
    .nullable()
    .optional()
    .describe(
      "Updated description. Pass null to clear the existing value. Max 65 535 characters.",
    ),
  status: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress', 'Done'). Auto-resolved to ID. Use values from set_project_context response. Pass null to clear.",
    ),
  priority: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium', 'Low'). Auto-resolved to ID. Use values from set_project_context response. Pass null to clear.",
    ),
  plannedStartDate: z
    .string()
    .regex(
      DATETIME_REGEX,
      "Invalid format. Use dd/MMM/yyyy HH:mm e.g. 15/May/2026 09:00",
    )
    .nullable()
    .optional()
    .describe(DATETIME_DESCRIPTION),
  plannedEndDate: z
    .string()
    .regex(
      DATETIME_REGEX,
      "Invalid format. Use dd/MMM/yyyy HH:mm e.g. 30/May/2026 18:00",
    )
    .nullable()
    .optional()
    .describe(DATETIME_DESCRIPTION),
  assignee: z.string().nullable().optional().describe(
    // biome-ignore lint/security/noSecrets: sample Jira account ID in docs, not a secret
    "Assignee Jira account ID (e.g., '5b10a2844c20165700ede21f'). Pass null to unassign.",
  ),
  reporter: z.string().nullable().optional().describe(
    // biome-ignore lint/security/noSecrets: sample Jira account ID in docs, not a secret
    "Reporter Jira account ID (e.g., '5b10a2844c20165700ede21f'). Pass null to clear.",
  ),
  labels: MetadataAddDelete.optional().describe(
    "Labels to add or remove by name. Each name is auto-resolved to its ID.",
  ),
  components: MetadataAddDelete.optional().describe(
    "Components to add or remove by name. Each name is auto-resolved to its ID.",
  ),
});

export const UpdateTestCycleResponse = z.object({
  key: z.string().describe("Human-readable key of the updated test cycle"),
  updated: z.literal(true).describe("Confirms the update was applied"),
});

export type UpdateTestCycleBodyType = z.infer<typeof UpdateTestCycleBody>;
export type UpdateTestCycleResponseType = z.infer<
  typeof UpdateTestCycleResponse
>;
