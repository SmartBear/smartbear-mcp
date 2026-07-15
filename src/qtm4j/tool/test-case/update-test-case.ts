import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types.ts";
import type { Resolver } from "../../resolver/resolvers/resolver.ts";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import {
  UpdateTestCaseBody,
  UpdateTestCaseResponse,
} from "../../schema/update-test-case.schema.ts";

// Scalar fields resolved from human-readable name → numeric ID.
const SIMPLE_FIELD_CONFIG: Record<string, string> = {
  [InputField.PRIORITY]: ResolverKeys.CommonAttribute.PRIORITY,
  [InputField.STATUS]: ResolverKeys.CommonAttribute.TESTCASE_STATUS,
};

// Add/delete metadata fields resolved from name arrays → ID arrays.
const ADD_DELETE_FIELD_CONFIG: Record<string, string> = {
  [InputField.LABELS]: ResolverKeys.SearchableField.LABEL,
  [InputField.COMPONENTS]: ResolverKeys.SearchableField.COMPONENTS,
};

/**
 * Resolves a { add?, delete? } object of name strings to { add?, delete? } of
 * numeric IDs. Names that cannot be resolved are skipped with a warning.
 */
async function resolveAddDelete(
  resolver: Resolver,
  inputField: string,
  resolverKey: string,
  field: { add?: string[]; delete?: string[] },
  context: ProjectContext,
  warnings: string[],
): Promise<{ add?: number[]; delete?: number[] }> {
  const result: { add?: number[]; delete?: number[] } = {};

  for (const op of ["add", "delete"] as const) {
    const names = field[op];
    if (!names?.length) continue;

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
  }

  return result;
}

/**
 * UpdateTestCase Tool
 *
 * Updates an existing test case via PUT /testcases/{id}/versions/{no}.
 * The human-readable key (e.g. 'SCRUM-TC-145') is resolved to the internal UID
 * and latest version via TestCaseUidResolver — no separate lookup step required.
 * Resolves human-readable names to IDs for priority, status, labels, and components.
 * Labels and components use the add/delete pattern to atomically add or remove entries.
 *
 * Prerequisites:
 *   - Active project MUST be set via set_project_context.
 */
export class UpdateTestCase extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UPDATE_TEST_CASE.TITLE,
    toolset: TOOLSETS.TEST_CASES,
    summary: TOOL_NAMES.UPDATE_TEST_CASE.SUMMARY,
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestCaseBody,
    outputSchema: UpdateTestCaseResponse,
    purpose:
      "Update an existing test case in QTM4J using its human-readable key (e.g. 'SCRUM-TC-145'). " +
      "The key is automatically resolved to the internal UID and latest version — no manual ID lookup needed. " +
      "Only the fields you provide are changed — omitted fields are left as-is. " +
      "For priority and status, supply the human-readable name and it is auto-resolved to the internal ID. " +
      "For labels and components, use the add/delete object to atomically add or remove entries by name. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Change the priority of a test case (e.g., escalate to 'High')",
      "Update the status of a test case after review",
      "Add new labels or remove outdated ones without affecting other labels",
      "Add or remove components from a test case",
      "Update summary, description, or precondition text",
      "Reassign a test case to a different team member",
      "Set or update the estimated time for a test case",
      "Batch-update metadata as part of sprint planning",
    ],
    examples: [
      {
        description: "Change the priority of a test case",
        parameters: { key: "SCRUM-TC-145", priority: "High" },
        expectedOutput: "Test case updated with new priority",
      },
      {
        description: "Add a label and remove an old one",
        parameters: {
          key: "SCRUM-TC-145",
          labels: { add: ["Release_2"], delete: ["Release_1"] },
        },
        expectedOutput:
          "Test case updated — Release_2 added, Release_1 removed",
      },
      {
        description: "Update summary, status, and add a component",
        parameters: {
          key: "SCRUM-TC-32",
          summary: "Verify login with MFA enabled",
          status: "In Progress",
          components: { add: ["Auth"] },
        },
        expectedOutput:
          "Test case summary and status updated, Auth component added",
      },
      {
        description: "Update a specific version",
        parameters: {
          key: "SCRUM-TC-85",
          versionNo: 2,
          assignee: "5b10a2844c20165700ede21f",
          estimatedTime: "01:30:00",
        },
        expectedOutput:
          "Version 2 of test case updated with new assignee and estimated time",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Priority and status values come from set_project_context. Use NLP to map user intent to available names.",
      "If priority or status name is not found, the field is skipped with a warning and other fields are still updated.",
      "Labels and components use add/delete — you can add and delete in a single call. Names are auto-resolved.",
      "To delete ALL current entries of any add/delete field: first call search_test_cases with filter.searchText set to the test case key and include the relevant field in the fields list, extract all current names from the response, then pass them in the delete array of this tool.",
      "Only provide the fields you want to change. Omitted fields remain unchanged on the server.",
      "estimatedTime must be in HH:MM:SS format (e.g., '02:30:00').",
      "versionNo defaults to the latest version. Use search_test_cases to find available versions if needed.",
    ],
    outputDescription:
      "Confirmation object with the test case key, versionNo updated, and updated: true. Warnings are included if any field names could not be resolved.",
  };

  handle = async (rawArgs: any) => {
    const args = UpdateTestCaseBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    // Resolve key → internal UID + version
    const uidMap = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
      .resolveAndReturn(context.projectId, [args.key])) as Record<
      string,
      ResolvedTestCase
    >;
    const entry = uidMap[args.key];
    if (!entry) {
      throw new ToolError(
        `Test case '${args.key}' not found in project '${context.projectKey}'. ` +
          "Verify the key using the search_test_cases tool.",
      );
    }

    const versionNo = args.versionNo ?? entry.latestVersion;

    // Separate path params and add/delete fields from scalar body fields.
    // undefined values are handled by each resolver's own null-check and
    // stripped automatically by JSON.stringify before the request is sent.
    const {
      key: _key,
      versionNo: _vno,
      labels,
      components,
      ...scalarArgs
    } = args;
    const body: Record<string, unknown> = { ...scalarArgs };

    // Resolve scalar names (priority, status) → numeric IDs
    await Promise.all(
      Object.entries(SIMPLE_FIELD_CONFIG).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );
    // Remove any scalar field that failed to resolve (still a string, not a valid ID)
    for (const field of Object.keys(SIMPLE_FIELD_CONFIG)) {
      if (typeof body[field] === "string") delete body[field];
    }

    // Resolve add/delete metadata fields (labels, components)
    for (const [inputField, resolverKey] of Object.entries(
      ADD_DELETE_FIELD_CONFIG,
    )) {
      const field = args[inputField as keyof typeof args] as
        | { add?: string[]; delete?: string[] }
        | undefined;
      if (!field) continue;

      const resolvedField = await resolveAddDelete(
        fieldResolver.getResolver(resolverKey),
        inputField,
        resolverKey,
        field,
        context,
        warnings,
      );
      if (Object.keys(resolvedField).length > 0)
        body[inputField] = resolvedField;
    }

    await this.client
      .getApiClient()
      .put(ENDPOINTS.UPDATE_TEST_CASE(entry.uid, versionNo), body);

    return {
      structuredContent: UpdateTestCaseResponse.parse({
        key: args.key,
        versionNo,
        updated: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
