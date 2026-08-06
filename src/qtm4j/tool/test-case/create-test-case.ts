import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { InputField, ResolverKeys } from "../../config/field-resolution.types";
import {
  CreateTestCaseBody,
  CreateTestCaseResponse,
  type CreateTestCaseResponseType,
} from "../../schema/test-case.schema";

// Maps each input field to its resolver key. Add entries here to resolve new fields.
const FIELD_CONFIG: Record<string, string> = {
  [InputField.PRIORITY]: ResolverKeys.CommonAttribute.PRIORITY,
  [InputField.STATUS]: ResolverKeys.CommonAttribute.TESTCASE_STATUS,
  [InputField.COMPONENTS]: ResolverKeys.SearchableField.COMPONENTS,
  [InputField.LABELS]: ResolverKeys.SearchableField.LABEL,
};

// Folder used when the caller does not pass a folderId. Resolved by name, so it
// is only added to FIELD_CONFIG on the fallback path.
const DEFAULT_FOLDER_NAME = "MCP Generated";
const FOLDER_FIELD_CONFIG: Record<string, string> = {
  [InputField.FOLDER]: ResolverKeys.CommonAttribute.TESTCASE_FOLDER,
};

/**
 * CreateTestCase Tool
 *
 * Creates a new test case in QTM4J with full auto-resolution support.
 *
 * Prerequisites:
 *   - Active project MUST be set via set_project_context.
 *
 * Resolved fields (driven by FIELD_CONFIG):
 *   - priority   → EAGER
 *   - status     → EAGER
 *   - labels     → LAZY
 *   - components → LAZY
 *
 * folderId: a caller-supplied numeric folder ID is used as-is. When omitted, the
 * test case falls back to the 'MCP Generated' folder.
 */
export class CreateTestCase extends Tool<Qtm4jClient> {
  // ─── Tool Specification ────────────────────────────────────────────────────

  specification: ToolParams = {
    title: TOOL_NAMES.CREATE_TEST_CASE.TITLE,
    toolset: TOOLSETS.TEST_CASES,
    summary: TOOL_NAMES.CREATE_TEST_CASE.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseBody,
    outputSchema: CreateTestCaseResponse,
    purpose:
      "Create a new test case in QTM4J with steps, metadata, and field auto-resolution. " +
      "For priority and status, use the names returned by set_project_context and map via NLP. " +
      "For labels and components, provide exact names — resolved on demand. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Create a basic test case with just a summary",
      "Create a test case with priority and status using names from set_project_context response",
      "Create a test case with labels and components by exact name",
      "Add detailed test steps with step descriptions, test data, and expected results",
      "Create a test case in a specific folder using its numeric folderId",
      "Set assignee and reporter using Jira account IDs",
      "Create test cases for manual testing with step-by-step instructions",
      "Create test cases with all metadata fields for comprehensive test management",
    ],
    examples: [
      {
        description:
          "Create a simple test case (project must be set via set_project_context first)",
        parameters: { summary: "Search Functionality" },
        expectedOutput: "Test case created with key 'SCRUM-TC-xxx'",
      },
      {
        description: "Create a test case with priority and status",
        parameters: {
          summary: "Search Functionality",
          description: "Verify search functionality works correctly",
          priority: "High",
          status: "To Do",
        },
        expectedOutput:
          "Test case created with resolved priority and status IDs",
      },
      {
        description: "Create a test case with labels, components, and steps",
        parameters: {
          summary: "Search Functionality",
          description: "Search Functionality Test",
          priority: "High",
          status: "To Do",
          labels: ["Release_1", "Sprint 1"],
          components: ["UI", "Cloud"],
          steps: [
            {
              stepDetails: "Enter a keyword in the search box",
              testData: 'Keyword = "Test"',
              expectedResult: "The keyword should be visible in the search box",
            },
            {
              stepDetails: "Click on the Search button",
              testData: "Click on Search Button",
              expectedResult:
                "Search results matching the keyword should be displayed",
            },
            {
              stepDetails: "Verify the search results",
              testData: "Expected results list",
              expectedResult:
                "Results should be relevant to the entered keyword",
            },
          ],
        },
        expectedOutput:
          "Test case created with resolved labels/components/priority/status and 3 steps",
      },
      {
        description: "Create a test case in a specific folder",
        parameters: { summary: "Login with SSO", folderId: 109987 },
        expectedOutput: "Test case created inside folder 109987",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "Priority and status values were returned by set_project_context. Use NLP to map user input (e.g., 'Major' → 'High', 'Critical' → 'Blocker').",
      "If priority or status name is not found, the operation proceeds without that field and a warning is returned.",
      "Labels and components are resolved on demand. If a name is not found, it is skipped with a warning.",
      "Steps: ALWAYS include all three fields — stepDetails, testData, and expectedResult. Generate reasonable values if not provided.",
      "folderId is optional and must be the numeric folder ID — never a folder name. Ask the user for the ID directly " +
        "(right-click the target folder in QTM4J → 'Copy Folder Id'); never guess it. " +
        "When omitted, the test case is created in the 'MCP Generated' folder.",
      "assignee and reporter accept Jira account IDs.",
    ],
    outputDescription:
      "JSON object with test case ID, key, version number, and summary. Warnings included if any fields were skipped.",
  };

  // ─── Handle Implementation ──────────────────────────────────────────────────

  handle = async (rawArgs: any) => {
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const parsed = CreateTestCaseBody.parse(rawArgs) as Record<string, unknown>;
    const usesDefaultFolder = parsed[InputField.FOLDER] === undefined;
    const body = {
      ...parsed,
      projectId: String(context.projectId),
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

    await Promise.all(
      Object.entries(fieldConfig).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    const response = await this.client
      .getApiClient()
      .post(ENDPOINTS.CREATE_TEST_CASE, body);
    const validated: CreateTestCaseResponseType =
      CreateTestCaseResponse.parse(response);

    return {
      structuredContent: validated,
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
