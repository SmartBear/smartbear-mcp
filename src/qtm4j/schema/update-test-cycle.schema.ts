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
import * as zod from "zod";

/** add/delete object for labels and components — names are auto-resolved to IDs */
const MetadataAddDelete = zod
  .object({
    add: zod
      .array(zod.string())
      .optional()
      .describe(
        "Names to add (e.g., ['Regression', 'Smoke']). Auto-resolved to IDs.",
      ),
    delete: zod
      .array(zod.string())
      .optional()
      .describe("Names to remove (e.g., ['Sprint1']). Auto-resolved to IDs."),
  })
  .describe(
    "Add or remove entries by name. Both add and delete are optional — omit either to skip that operation.",
  );

const DATETIME_REGEX = /^\d{2}\/[A-Za-z]{3}\/\d{4} \d{2}:\d{2}$/;
const DATETIME_DESCRIPTION =
  "Format: 'dd/MMM/yyyy HH:mm' e.g. '15/May/2026 09:00'. Month must be capitalised (May not may). Pass null to clear the existing value.";

export const UpdateTestCycleBody = zod.object({
  key: zod
    .string()
    .describe(
      "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
        "Used directly as the API path parameter.",
    ),
  summary: zod
    .string()
    .min(1, "Summary cannot be blank.")
    .max(255, "Summary must not exceed 255 characters.")
    .optional()
    .describe("Updated test cycle name / title. Max 255 characters."),
  description: zod
    .string()
    .max(65535, "Description must not exceed 65,535 characters.")
    .nullable()
    .optional()
    .describe(
      "Updated description. Pass null to clear the existing value. Max 65 535 characters.",
    ),
  status: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress'). Auto-resolved to ID. Pass null to clear.",
    ),
  priority: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium'). Auto-resolved to ID. Pass null to reset to project default.",
    ),
  plannedStartDate: zod
    .string()
    .regex(
      DATETIME_REGEX,
      "Invalid format. Use dd/MMM/yyyy HH:mm e.g. 15/May/2026 09:00",
    )
    .nullable()
    .optional()
    .describe(DATETIME_DESCRIPTION),
  plannedEndDate: zod
    .string()
    .regex(
      DATETIME_REGEX,
      "Invalid format. Use dd/MMM/yyyy HH:mm e.g. 30/May/2026 18:00",
    )
    .nullable()
    .optional()
    .describe(DATETIME_DESCRIPTION),
  assignee: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Assignee Jira account ID (e.g., '5b10a2844c20165700ede21f'). Pass null to unassign.",
    ),
  reporter: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Reporter Jira account ID (e.g., '5b10a2844c20165700ede21f'). Pass null to clear.",
    ),
  labels: MetadataAddDelete.optional().describe(
    "Labels to add or remove by name. Each name is auto-resolved to its ID.",
  ),
  components: MetadataAddDelete.optional().describe(
    "Components to add or remove by name. Each name is auto-resolved to its ID.",
  ),
});

export const UpdateTestCycleResponse = zod.object({
  key: zod.string().describe("Human-readable key of the updated test cycle"),
  updated: zod.literal(true).describe("Confirms the update was applied"),
});

export type UpdateTestCycleBodyType = zod.infer<typeof UpdateTestCycleBody>;
export type UpdateTestCycleResponseType = zod.infer<
  typeof UpdateTestCycleResponse
>;
