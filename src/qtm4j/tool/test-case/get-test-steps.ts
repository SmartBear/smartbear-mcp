import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import {
  ENDPOINTS,
  RESPONSE_FIELDS,
  TOOL_NAMES,
  TOOLSETS,
} from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import {
  GetTestStepsBody,
  GetTestStepsResponse,
  type GetTestStepsResponseType,
} from "../../schema/get-test-steps.schema";

export class GetTestSteps extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_TEST_STEPS.TITLE,
    toolset: TOOLSETS.TEST_CASES,
    summary: TOOL_NAMES.GET_TEST_STEPS.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestStepsBody,
    outputSchema: GetTestStepsResponse,
    purpose:
      "Retrieve the test steps for a specific test case version using the human-readable test case key. " +
      "The key is automatically resolved to the internal test case UID via a dedicated batch API — no separate lookup required. " +
      "Test steps describe the step-by-step actions (stepDetails), input data (testData), and expected results (expectedResult) for executing a test case. " +
      "Steps may also reference shared (reusable) test cases, surfaced via the 'shareable' field. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "View all steps of a test case before executing it",
      "Review steps for a specific test case version",
      "Filter steps by action text, test data, or expected result",
      "Get steps for a test case found via search_test_cases",
      "Inspect shared (reusable) steps embedded in a test case",
      "Sort steps by sequence number to view them in execution order",
      "Paginate through test cases that have a large number of steps",
    ],
    examples: [
      {
        description: "Get all steps for a test case (latest version)",
        parameters: { key: "SCRUM-TC-145" },
        expectedOutput:
          "All steps for SCRUM-TC-145 with stepDetails, testData, expectedResult, and any shared step blocks",
      },
      {
        description: "Get steps for a specific version",
        parameters: { key: "SCRUM-TC-145", versionNo: 2 },
        expectedOutput: "Steps for version 2 of SCRUM-TC-145",
      },
      {
        description: "Get steps in execution order",
        parameters: { key: "SCRUM-TC-85", sort: "seqNo:asc" },
        expectedOutput: "All steps sorted by sequence number ascending",
      },
      {
        description: "Filter steps by action text",
        parameters: {
          key: "SCRUM-TC-32",
          filter: { stepDetails: "Open the application" },
        },
        expectedOutput:
          "Steps whose stepDetails contain 'Open the application'",
      },
      {
        description: "Filter steps by expected result",
        parameters: {
          key: "SCRUM-TC-65",
          filter: { expectedResult: "logged in successfully" },
        },
        expectedOutput:
          "Steps whose expectedResult contains 'logged in successfully'",
      },
      {
        description: "Filter steps by test data",
        parameters: {
          key: "SCRUM-TC-125",
          filter: { testData: "Username: user1" },
        },
        expectedOutput: "Steps with testData containing 'Username: user1'",
      },
      {
        description: "Paginate through many steps",
        parameters: {
          key: "SCRUM-TC-105",
          startAt: 0,
          maxResults: 10,
          sort: "seqNo:asc",
        },
        expectedOutput: "First 10 steps in sequence order",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'. PROJECT_KEY is the Jira project key; the number is the test case counter within that project (auto-incremented, not the same as seqNo).",
      "VERSION: versionNo defaults to the latest version. Get the version number from search_test_cases response: version.versionNo.",
      "Use search_test_cases to discover test case keys before calling this tool.",
      "SHAREABLE STEPS: Steps with a non-null 'shareable' field are references to shared/reusable test cases. The 'shareable.shareableTestSteps' array contains the embedded sub-steps with decimal seqNo values (e.g. '1.1', '1.2').",
      "FILTER: Each filter field is a substring match (case-insensitive). Multiple fields combine with AND.",
      "SORT: 'seqNo:asc' shows steps in their natural execution order. Allowed sort fields: stepDetails, testData, seqNo, expectedResult.",
      "PAGINATION: startAt and maxResults are URL query params. Default page size is 50, maximum is 100.",
    ],
    outputDescription:
      "JSON object with total (total matching steps), startAt, maxResults, and data (array of step objects). " +
      "Each step has: id, seqNo, stepDetails, testData, expectedResult, attachmentCount. " +
      "Shared steps also have a 'shareable' object containing shareableTestcaseUID and shareableTestSteps array.",
  };

  handle = async (rawArgs: any) => {
    const args = GetTestStepsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    const resolved = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
      .resolveAndReturn(context.projectId, [args.key])) as Record<
      string,
      ResolvedTestCase
    >;
    const entry = resolved[args.key];

    if (!entry) {
      throw new ToolError(
        `Test case '${args.key}' not found in project '${context.projectKey}'. ` +
          "Verify the key using the search_test_cases tool.",
      );
    }

    const versionNo = args.versionNo ?? entry.latestVersion;

    const params = new URLSearchParams();
    params.set(RESPONSE_FIELDS.START_AT, String(args.startAt));
    params.set(RESPONSE_FIELDS.MAX_RESULTS, String(args.maxResults));
    if (args.sort) params.set(RESPONSE_FIELDS.SORT, args.sort);

    const endpoint = `${ENDPOINTS.TEST_STEPS(entry.uid, versionNo)}?${params.toString()}`;

    const filterBody =
      args.filter && Object.keys(args.filter).length > 0
        ? { filter: args.filter }
        : {};

    const response = await this.client
      .getApiClient()
      .post(endpoint, filterBody);

    const validated: GetTestStepsResponseType =
      GetTestStepsResponse.parse(response);

    return { structuredContent: validated, content: [] };
  };
}
