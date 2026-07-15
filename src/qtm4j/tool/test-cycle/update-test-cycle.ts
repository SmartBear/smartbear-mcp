import { Tool } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types.ts";
import type { Resolver } from "../../resolver/resolvers/resolver.ts";
import {
  UpdateTestCycleBody,
  UpdateTestCycleResponse,
} from "../../schema/update-test-cycle.schema.ts";

// Scalar fields resolved from human-readable name → numeric ID.
const SIMPLE_FIELD_CONFIG: Record<string, string> = {
  [InputField.PRIORITY]: ResolverKeys.CommonAttribute.PRIORITY,
  [InputField.STATUS]: ResolverKeys.CommonAttribute.TEST_CYCLE_STATUS,
};

// Add/delete metadata fields resolved from name arrays → ID arrays.
const ADD_DELETE_FIELD_CONFIG: Record<string, string> = {
  [InputField.LABELS]: ResolverKeys.SearchableField.LABEL,
  [InputField.COMPONENTS]: ResolverKeys.SearchableField.COMPONENTS,
};

/** Options for {@link resolveAddDelete}. */
interface ResolveAddDeleteOptions {
  resolver: Resolver;
  inputField: string;
  resolverKey: string;
  field: { add?: string[]; delete?: string[] };
  context: ProjectContext;
  warnings: string[];
}

/**
 * Resolves a { add? delete? } object of name strings to { add? delete? } of
 * numeric IDs. Names that cannot be resolved are skipped with a warning.
 */
async function resolveAddDelete({
  resolver,
  inputField,
  resolverKey,
  field,
  context,
  warnings,
}: ResolveAddDeleteOptions): Promise<{ add?: number[]; delete?: number[] }> {
  const result: { add?: number[]; delete?: number[] } = {};

  const ops = (["add", "delete"] as const).filter(
    (op) => field[op] === undefined || field[op].length > 0,
  );

  await Promise.all(
    ops.map(async (op) => {
      const names = field[op];
      const tempBody: Record<string, unknown> = { [inputField]: names };
      await resolver.resolve(
        inputField,
        resolverKey,
        tempBody,
        context,
        warnings,
      );

      const val = tempBody[inputField];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
        result[op] = val as number[];
      }
    }),
  );

  return result;
}

/**
 * UpdateTestCycle Tool
 *
 * Updates an existing test cycle via PUT /testcycles/{key}.
 * The human-readable key (e.g. 'SCRUM-TR-101') is used directly as the path param —
 * no UID resolution step is required for test cycles.
 * Only the fields provided in the request are changed; omitted fields remain as-is.
 * Resolves human-readable names to IDs for priority and status.
 * Labels and components use the add/delete pattern to atomically add or remove entries.
 * Nullable fields (description, assignee, reporter, plannedStartDate, plannedEndDate)
 * accept explicit null to clear the value on the server.
 */
export class UpdateTestCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UPDATE_TEST_CYCLE.TITLE,
    toolset: TOOLSETS.TEST_CYCLES,
    summary: TOOL_NAMES.UPDATE_TEST_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestCycleBody,
    outputSchema: UpdateTestCycleResponse,
    purpose:
      "Update an existing test cycle in QTM4J by its human-readable key (e.g. 'SCRUM-TR-101'). " +
      "Only provided fields are changed — omitted fields stay unchanged. " +
      "Status and priority are auto-resolved from human-readable names. " +
      "Labels and components use add/delete objects.",
    useCases: [
      "Update summary, status, priority, planned dates, assignee, or reporter",
      "Clear a nullable field by passing null (e.g. description: null removes text, assignee: null unassigns owner)",
      "Add or remove labels and components atomically without affecting other entries",
      "Apply multiple field updates in a single call",
    ],
    examples: [
      {
        description: "Rename a test cycle",
        parameters: {
          key: "SCRUM-TR-101",
          summary: "Regression Cycle - Sprint 12 Updated",
        },
        expectedOutput: "Test cycle updated with new summary",
      },
      {
        description: "Change status and update planned dates",
        parameters: {
          key: "SCRUM-TR-101",
          status: "In Progress",
          plannedStartDate: "01/May/2026 09:00",
          plannedEndDate: "31/May/2026 18:00",
        },
        expectedOutput: "Test cycle status and planned dates updated",
      },
      {
        description: "Add a label and remove an old one",
        parameters: {
          key: "SCRUM-TR-101",
          labels: { add: ["Regression", "Smoke"], delete: ["Sprint1"] },
        },
        expectedOutput:
          "Test cycle updated — Regression and Smoke labels added, Sprint1 removed",
      },
      {
        description: "Clear the description text",
        parameters: {
          key: "SCRUM-TR-101",
          description: null,
        },
        expectedOutput: "Test cycle description cleared",
      },
      {
        description: "Unassign the owner and clear planned dates",
        parameters: {
          key: "SCRUM-TR-101",
          assignee: null,
          plannedStartDate: null,
          plannedEndDate: null,
        },
        expectedOutput: "Test cycle owner unassigned and planned dates cleared",
      },
      {
        description: "Full update with all fields",
        parameters: {
          key: "SCRUM-TR-101",
          summary: "Final Regression Cycle",
          description: "Updated for sprint 12.",
          status: "In Progress",
          priority: "High",
          plannedStartDate: "15/May/2026 09:00",
          plannedEndDate: "30/May/2026 18:00",
          // biome-ignore lint/security/noSecrets: example Jira account ID, not a secret
          assignee: "5b10a2844c20165700ede21f",
          labels: { add: ["Regression"], delete: ["Sprint1"] },
          components: { add: ["Backend"], delete: ["Frontend"] },
        },
        expectedOutput: "Test cycle updated with all specified fields",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TR-{number}' — e.g. 'SCRUM-TR-101'.",
      "Pass explicit null to CLEAR a nullable field — e.g. description: null removes the description text, assignee: null unassigns the owner, plannedStartDate: null removes the date. Omitting a field leaves it unchanged.",
      "Status and priority are auto-resolved from human-readable names loaded by set_project_context. If a name cannot be resolved, the cycle is still updated and a warning is returned.",
      "Labels and components use add/delete — names are auto-resolved to IDs. Both operations can be combined in a single call.",
      "Date format: 'dd/MMM/yyyy HH:mm' e.g. '15/May/2026 09:00'. Month must be capitalised (May not may or MAY).",
      "Archived test cycles cannot be updated — the server returns 400. Unarchive first if needed.",
    ],
    outputDescription:
      "Confirmation object with the test cycle key and updated: true. Warnings are included if any field names could not be resolved.",
  };

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: single sequential tool handler; splitting would fragment one linear resolve→request→respond flow
  handle = async (rawArgs: unknown) => {
    const args = UpdateTestCycleBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    // Separate path param (key) and add/delete fields from scalar body fields.
    // undefined values are stripped automatically by JSON.stringify before the request.
    const { key: _key, labels, components, ...scalarArgs } = args;
    const body: Record<string, unknown> = { ...scalarArgs };

    // Resolve scalar names (status, priority) → numeric IDs.
    // Null values pass through untouched (resolver skips non-string values).
    await Promise.all(
      Object.entries(SIMPLE_FIELD_CONFIG).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    // Resolve add/delete metadata fields (labels, components).
    const addDeleteEntries = Object.entries(ADD_DELETE_FIELD_CONFIG)
      .map(([inputField, resolverKey]) => ({
        inputField,
        resolverKey,
        field: args[inputField as keyof typeof args] as
          | { add?: string[]; delete?: string[] }
          | undefined,
      }))
      .filter((entry) => entry.field !== undefined);

    await Promise.all(
      addDeleteEntries.map(async ({ inputField, resolverKey, field }) => {
        const resolvedField = await resolveAddDelete({
          resolver: fieldResolver.getResolver(resolverKey),
          inputField,
          resolverKey,
          field: field as { add?: string[]; delete?: string[] },
          context,
          warnings,
        });
        if (Object.keys(resolvedField).length > 0) {
          body[inputField] = resolvedField;
        }
      }),
    );

    await this.client
      .getApiClient()
      .put(ENDPOINTS.UPDATE_TEST_CYCLE(args.key), body);

    return {
      structuredContent: UpdateTestCycleResponse.parse({
        key: args.key,
        updated: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
