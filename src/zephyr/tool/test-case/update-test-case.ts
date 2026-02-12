import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z as zod } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  updateTestCaseBody,
  updateTestCaseDefaultResponse,
  updateTestCaseParams,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils";

export class UpdateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Case",
    summary:
      "Update an existing Test Case in Zephyr. This operation fetches the current test case and merges your updates with it to prevent accidental property deletion.",
    readOnly: false,
    idempotent: true,
    inputSchema: updateTestCaseParams.and(updateTestCaseBody.partial()),
    // Accept either empty object (200 response) or updateTestCaseDefaultResponse (other responses)
    outputSchema: zod.union([
      zod.object({}), // Empty object for 200 response
      updateTestCaseDefaultResponse, // updateTestCaseDefaultResponse for other responses
    ]),
    examples: [
      {
        description: "Update the name and objective of test case 'SA-T10'",
        parameters: {
          testCaseKey: "SA-T10",
          name: "Updated test case name",
          objective: "Updated objective for the test case",
        },
        expectedOutput: "The updated Test Case with its details",
      },
      {
        description:
          "Update test case 'MM2-T1' to add labels and change priority",
        parameters: {
          testCaseKey: "MM2-T1",
          priority: { id: 2 },
          labels: ["automated", "regression"],
        },
        expectedOutput: "The updated Test Case with new labels and priority",
      },
      {
        description:
          "Update test case 'SA-T5' with custom fields and estimated time",
        parameters: {
          testCaseKey: "SA-T5",
          estimatedTime: 3600000,
          customFields: {
            "Test Environment": "Production",
            "Test Data": "Dataset-A",
          },
        },
        expectedOutput:
          "The updated Test Case with custom fields and estimated time",
      },
      {
        description:
          "Remove the component from test case 'SA-T20' by setting it to null. Note: To remove a property, we need to set it to null explicitly.",
        parameters: {
          testCaseKey: "SA-T20",
          component: null,
        },
        expectedOutput:
          "The updated Test Case with the component property removed.",
      },
      {
        description:
          "Remove a specific custom field Test Environment from test case 'SA-T15' while keeping other custom fields intact",
        parameters: {
          testCaseKey: "SA-T15",
          customFields: {
            "Test Environment": null,
            Browser: "Chrome",
          },
        },
        expectedOutput:
          "The updated Test Case with 'Test Environment' custom field removed, and all other existing custom fields preserved.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsed = updateTestCaseParams
      .and(updateTestCaseBody.partial())
      .parse(args);
    const { testCaseKey, ...updates } = parsed;

    // Fetch the existing test case to ensure we have all properties
    // This is necessary because Zephyr's PUT endpoints requires the complete resource
    // and will delete any properties that are not included in the request
    const existingTestCase = await this.client
      .getApiClient()
      .get(`/testcases/${testCaseKey}`);

    // Deep merge the updates with the existing test case
    // For nested objects like customFields, we merge instead of replacing
    const mergedBody = deepMerge(existingTestCase, updates);

    const response = await this.client
      .getApiClient()
      .put(`/testcases/${testCaseKey}`, mergedBody);

    return {
      structuredContent: response,
      content: [],
    };
  };
}
