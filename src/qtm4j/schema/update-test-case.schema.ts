/**
 * QTM4J Update Test Case Schemas
 *
 * PUT /rest/api/latest/testcases/{id}/versions/{no}
 *
 * The test case key (e.g. 'SCRUM-TC-145') is resolved to the internal UID
 * and latest version via TestCaseUidResolver — no separate lookup required.
 * Input accepts human-readable names for priority, status, labels, and components.
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
        "Names to add (e.g., ['Release_1', 'Sprint 1']). Auto-resolved to IDs.",
      ),
    delete: zod
      .array(zod.string())
      .optional()
      .describe("Names to remove (e.g., ['Sprint 1']). Auto-resolved to IDs."),
  })
  .describe(
    "Add or remove entries by name. Both add and delete are optional — omit either to skip that operation.",
  );

export const UpdateTestCaseBody = zod.object({
  key: zod
    .string()
    .describe(
      "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'. " +
        "Automatically resolved to the internal ID and latest version.",
    ),
  versionNo: zod
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Test case version number to update. Defaults to the latest version if omitted.",
    ),
  summary: zod
    .string()
    .min(1)
    .optional()
    .describe("Updated test case summary/title."),
  description: zod
    .string()
    .optional()
    .describe("Updated test case description."),
  precondition: zod
    .string()
    .optional()
    .describe(
      "Updated precondition — conditions that must be true before the test is executed.",
    ),
  priority: zod
    .string()
    .optional()
    .describe(
      "Priority name (e.g., 'High', 'Medium', 'Low'). Auto-resolved to ID. Use values from set_project_context response.",
    ),
  status: zod
    .string()
    .optional()
    .describe(
      "Status name (e.g., 'To Do', 'In Progress', 'Done'). Auto-resolved to ID. Use values from set_project_context response.",
    ),
  assignee: zod
    .string()
    .optional()
    .describe("Assignee Jira account ID (e.g., '5b10a2844c20165700ede21f')."),
  estimatedTime: zod
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Must be in HH:MM:SS format")
    .optional()
    .describe("Estimated time in HH:MM:SS format (e.g., '02:30:00')."),
  labels: MetadataAddDelete.optional().describe(
    "Labels to add or remove by name. Each name is auto-resolved to its ID.",
  ),
  components: MetadataAddDelete.optional().describe(
    "Components to add or remove by name. Each name is auto-resolved to its ID.",
  ),
});

export const UpdateTestCaseResponse = zod.object({
  key: zod.string().describe("Test case key that was updated"),
  versionNo: zod.number().describe("Version number that was updated"),
  updated: zod.literal(true).describe("Confirms the update was applied"),
});

export type UpdateTestCaseBodyType = zod.infer<typeof UpdateTestCaseBody>;
export type UpdateTestCaseResponseType = zod.infer<
  typeof UpdateTestCaseResponse
>;
