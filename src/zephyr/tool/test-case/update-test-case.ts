import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, z as zod } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  type getTestCase200Response,
  updateTestCaseBody,
  updateTestCaseParams,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils";

export class UpdateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Case",
    summary:
      'Update an existing Test Case in Zephyr. This operation fetches the current test case and merges your updates with it to prevent accidental property deletion. Properties which are not included in the tool call will be left unchanged. To remove a property, set it to null explicitly. For fields that accept multiple values, such as `labels`, if the field is provided, it will override the previous values. For example, if `labels` is provided with the values `["label1", "label2"]`, the Test Case will now only have those two labels, and any previous labels will be removed. If you want to add a label, you would need to specify in the prompt the intention to add a label.',
    readOnly: false,
    idempotent: true,
    inputSchema: updateTestCaseParams.and(updateTestCaseBody.partial()),
    examples: [
      {
        description:
          "Update the name of the test case 'SA-T10' to 'Check axial pump' and objective to 'To ensure the axial pump can be enabled'",
        parameters: {
          testCaseKey: "SA-T10",
          name: "Check axial pump",
          objective: "To ensure the axial pump can be enabled",
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
      },
      {
        description:
          "Update the test case 'MM2-T1' by adding labels 'Regression','Performance' and 'Automated' and changing the priority to the one with id 2.",
        parameters: {
          testCaseKey: "MM2-T1",
          priority: { id: 2 },
          labels: ["Regression", "Performance", "Automated"],
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
      },
      {
        description:
          "Update test case 'SA-T5', by setting the custom field 'Build Number' to 20, 'Release Date' to '2020-01-01' and setting the Test Cases's estimated time to 3600000 milliseconds.",
        parameters: {
          testCaseKey: "SA-T5",
          estimatedTime: 3600000,
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
          },
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
      },
      {
        description:
          "Remove the component from test case 'SA-T20' by setting it to null. Note: To remove a property, we need to set it to null explicitly.",
        parameters: {
          testCaseKey: "SA-T20",
          component: null,
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
      },
      {
        description:
          "Remove a specific custom field 'Pre-Condition(s)' from test case 'SA-T15' while keeping other custom fields intact",
        parameters: {
          testCaseKey: "SA-T15",
          customFields: {
            "Pre-Condition(s)": null,
            Implemented: false,
          },
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
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
    const existingTestCase: zod.infer<typeof getTestCase200Response> =
      await this.client.getApiClient().get(`/testcases/${testCaseKey}`);

    // Deep merge the updates with the existing test case
    // For nested objects like customFields, we merge instead of replacing
    const mergedBody = deepMerge(existingTestCase, updates);

    await this.client
      .getApiClient()
      .put(`/testcases/${testCaseKey}`, mergedBody);

    return {
      content: [],
    };
  };
}
