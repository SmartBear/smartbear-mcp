import { Tool } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import {
  InputField,
  ResolverKeys,
} from "../../config/field-resolution.types.ts";
import {
  CreateTestCycleBody,
  CreateTestCycleResponse,
  type CreateTestCycleResponseType,
} from "../../schema/test-cycle.schema.ts";

// Maps each input field to its resolver key. Add entries here to resolve new fields.
const FIELD_CONFIG: Record<string, string> = {
  [InputField.PRIORITY]: ResolverKeys.CommonAttribute.PRIORITY,
  [InputField.STATUS]: ResolverKeys.CommonAttribute.TEST_CYCLE_STATUS,
  [InputField.FOLDER]: ResolverKeys.CommonAttribute.TEST_CYCLE_FOLDER,
  [InputField.LABELS]: ResolverKeys.SearchableField.LABEL,
  [InputField.COMPONENTS]: ResolverKeys.SearchableField.COMPONENTS,
};

/**
 * CreateTestCycle Tool
 *
 * Creates a new test cycle in QTM4J. All cycles are placed in the
 * 'MCP Generated' folder automatically.
 *
 * Resolved fields (driven by FIELD_CONFIG):
 *   - priority → numeric ID via CommonAttribute resolver
 *   - status → numeric ID via TEST_CYCLE_STATUS resolver
 *   - folderId → resolved to 'MCP Generated' folder ID
 *   - labels → numeric IDs via SearchableField resolver
 *   - components → numeric IDs via SearchableField resolver
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
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "If any priority, status, label, or component name cannot be resolved, the cycle is still created but a warning is returned. Suggest the closest available value from the set_project_context response and ask the user to confirm before retrying.",
      "All cycles are placed in the 'MCP Generated' folder — do not pass folderId.",
      "Date format: 'dd/MMM/yyyy HH:mm' e.g. '10/May/2026 00:00'. Month must be capitalised. plannedStartDate must be ≤ plannedEndDate.",
    ],
    outputDescription:
      "JSON object with the new test cycle's id and key (e.g. 'TRWT-TR-218'). Warnings included if any fields were skipped.",
  };

  // ─── Handle Implementation ──────────────────────────────────────────────────

  handle = async (rawArgs: unknown) => {
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    // Inject projectId and default folderId before resolution.
    const body: Record<string, unknown> = {
      ...(CreateTestCycleBody.parse(rawArgs) as Record<string, unknown>),
      projectId: context.projectId,
      folderId: "MCP Generated",
    };
    const warnings: string[] = [];

    // Resolve all configured fields (priority, status, folderId, labels, components).
    await Promise.all(
      Object.entries(FIELD_CONFIG).map(([inputField, resolverKey]) =>
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
