import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES } from "../../config/constants";
import {
  CommonAttributeField,
  InputField,
  SearchableField,
} from "../../config/field-resolution.types";
import {
  CreateTestCaseBody,
  CreateTestCaseResponse,
  type CreateTestCaseResponseType,
} from "../../schema/test-case.schema";
import {
  type FieldResolutionConfig,
  withResolution,
} from "../../resolver/resolution-helper";

const RESOLUTION_CONFIG: FieldResolutionConfig[] = [
  { inputField: InputField.PRIORITY, fieldKey: CommonAttributeField.PRIORITY },
  {
    inputField: InputField.STATUS,
    fieldKey: CommonAttributeField.TESTCASE_STATUS,
  },
  { inputField: InputField.COMPONENTS, fieldKey: SearchableField.COMPONENTS },
  { inputField: InputField.LABELS, fieldKey: SearchableField.LABEL },
];

/**
 * CreateTestCase Tool
 *
 * Creates a new test case in QTM4J with full auto-resolution support.
 *
 * Prerequisites:
 *   - Active project MUST be set via set_project_context.
 *
 * Resolved fields (driven entirely by fieldResolutionConfig):
 *   - priority   → EAGER
 *   - status     → EAGER
 *   - labels     → LAZY
 *   - components → LAZY
 */
export class CreateTestCase extends Tool<Qtm4jClient> {
  // ─── Tool Specification ────────────────────────────────────────────────────

  specification: ToolParams = {
    title: TOOL_NAMES.CREATE_TEST_CASE.TITLE,
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
      "Create a test case in a specific folder using folderId",
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
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "Priority and status values were returned by set_project_context. Use NLP to map user input (e.g., 'Major' → 'High', 'Critical' → 'Blocker').",
      "If priority or status name is not found, the operation proceeds without that field and a warning is returned.",
      "Labels and components are resolved on demand. If a name is not found, it is skipped with a warning.",
      "Steps: ALWAYS include all three fields — stepDetails, testData, and expectedResult. Generate reasonable values if not provided.",
      "folderId is optional. assignee and reporter accept Jira account IDs.",
    ],
    outputDescription:
      "JSON object with test case ID, key, version number, and summary. Warnings included if any fields were skipped.",
  };

  // ─── Handle Implementation ──────────────────────────────────────────────────

  /**
   * Handle method: Call withResolution to get ready-to-use body, then execute API call.
   * Resolution logic is internal - no need to manually merge resolved IDs.
   */
  handle = async (rawArgs: any) => {
    // Get project context to extract projectId
    const context = this.client.getFieldResolver().requireProjectContext();

    // Step 1: Resolve fields and get ready-to-use body
    const { body, warnings } = await withResolution(
      () => this.client,
      CreateTestCaseBody,
      RESOLUTION_CONFIG,
      rawArgs,
      { projectId: String(context.projectId) }, // Extra fields to merge
    );

    // Step 2: Make API call with resolved body
    const response = await this.client
      .getApiClient()
      .post(ENDPOINTS.CREATE_TEST_CASE, body);

    // Step 3: Validate response
    const validated: CreateTestCaseResponseType =
      CreateTestCaseResponse.parse(response);

    // Step 4: Return with warnings if any
    return {
      structuredContent: validated,
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
