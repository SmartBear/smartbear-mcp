import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { InputField, ResolverKeys } from "../../config/field-resolution.types";
import {
  CreateTestCycleBody,
  CreateTestCycleResponse,
  type CreateTestCycleResponseType,
} from "../../schema/test-cycle.schema";

// Maps each input field to its resolver key. Add entries here to resolve new fields.
const FIELD_CONFIG: Record<string, string> = {
  [InputField.PRIORITY]: ResolverKeys.CommonAttribute.PRIORITY,
  [InputField.STATUS]: ResolverKeys.CommonAttribute.TEST_CYCLE_STATUS,
  [InputField.LABELS]: ResolverKeys.SearchableField.LABEL,
  [InputField.COMPONENTS]: ResolverKeys.SearchableField.COMPONENTS,
};

// Folder used when the caller does not pass a folderId. Resolved by name, so it
// is only added to FIELD_CONFIG on the fallback path.
const DEFAULT_FOLDER_NAME = "MCP Generated";
const FOLDER_FIELD_CONFIG: Record<string, string> = {
  [InputField.FOLDER]: ResolverKeys.CommonAttribute.TEST_CYCLE_FOLDER,
};

/**
 * CreateTestCycle Tool
 *
 * Creates a new test cycle in QTM4J, in the folder given by folderId or — when
 * that is omitted — in the 'MCP Generated' folder.
 *
 * Resolved fields (driven by FIELD_CONFIG):
 *   - priority → numeric ID via CommonAttribute resolver
 *   - status → numeric ID via TEST_CYCLE_STATUS resolver
 *   - labels → numeric IDs via SearchableField resolver
 *   - components → numeric IDs via SearchableField resolver
 *
 * folderId is a numeric folder ID and is used as-is.
 *
 * Safety: if any field fails to resolve, the cycle is still created without that
 * field, and a warning is returned alongside the response.
 */
export class CreateTestCycle extends Tool<Qtm4jClient> {
  // ─── Tool Specification ────────────────────────────────────────────────────

  specification: ToolParams = {
    title: TOOL_NAMES.CREATE_TEST_CYCLE.TITLE,
    toolset: TOOLSETS.TEST_CYCLES,
    summary: TOOL_NAMES.CREATE_TEST_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCycleBody,
    outputSchema: CreateTestCycleResponse,
    purpose:
      "Create a new test cycle in QTM4J. " +
      "projectId is auto-injected from the active project context. " +
      "priority, status, labels, and components are auto-resolved from human-readable names.",
    useCases: [
      "Create a test cycle with summary, priority, status, labels, or components",
      "Set planned start and end dates on a new test cycle",
      "Create a test cycle in a specific folder using its numeric folderId",
    ],
    examples: [
      {
        description:
          "Create a simple test cycle (project must be set via set_project_context first)",
        parameters: { summary: "Smoke Test Cycle" },
        expectedOutput: "Test cycle created with key 'SCRUM-TR-xxx'",
      },
      {
        description:
          "Create a test cycle with priority, status, labels, and components",
        parameters: {
          summary: "Regression Suite – Sprint 42",
          description:
            "End-to-end regression covering payment and checkout modules.",
          priority: "High",
          status: "To Do",
          labels: ["Release_1", "Sprint 1"],
          components: ["UI", "Cloud"],
          plannedStartDate: "10/May/2026 00:00",
          plannedEndDate: "15/May/2026 00:00",
        },
        expectedOutput:
          "Test cycle created with resolved priority, status, labels, and components",
      },
      {
        description: "Create a test cycle in a specific folder",
        parameters: { summary: "Sprint 42 Smoke", folderId: 109987 },
        expectedOutput: "Test cycle created inside folder 109987",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "If any priority, status, label, or component name cannot be resolved, the cycle is still created but a warning is returned. Suggest the closest available value from the set_project_context response and ask the user to confirm before retrying.",
      "folderId is optional and must be the numeric folder ID — never a folder name. Ask the user for the ID directly " +
        "(right-click the target folder in QTM4J → 'Copy Folder Id'); never guess it. " +
        "When omitted, the cycle is created in the 'MCP Generated' folder.",
      "Date format: 'dd/MMM/yyyy HH:mm' e.g. '10/May/2026 00:00'. Month must be capitalised. plannedStartDate must be ≤ plannedEndDate.",
    ],
    outputDescription:
      "JSON object with the new test cycle's id and key (e.g. 'TRWT-TR-218'). Warnings included if any fields were skipped.",
  };

  // ─── Handle Implementation ──────────────────────────────────────────────────

  handle = async (rawArgs: any) => {
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    // Inject projectId, and fall back to the default folder when none is given.
    const parsed = CreateTestCycleBody.parse(rawArgs) as Record<
      string,
      unknown
    >;
    const usesDefaultFolder = parsed[InputField.FOLDER] === undefined;
    const body: Record<string, unknown> = {
      ...parsed,
      projectId: context.projectId,
      ...(usesDefaultFolder
        ? { [InputField.FOLDER]: DEFAULT_FOLDER_NAME }
        : {}),
    };
    const warnings: string[] = [];

    // A caller-supplied folderId is already an ID — only the default folder name
    // needs resolving.
    const fieldConfig = usesDefaultFolder
      ? { ...FIELD_CONFIG, ...FOLDER_FIELD_CONFIG }
      : FIELD_CONFIG;

    // Resolve all configured fields (priority, status, labels, components, folder).
    await Promise.all(
      Object.entries(fieldConfig).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    const response = await this.client
      .getApiClient()
      .post(ENDPOINTS.CREATE_TEST_CYCLE, body);
    const validated: CreateTestCycleResponseType =
      CreateTestCycleResponse.parse(response);

    return {
      structuredContent: validated,
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
