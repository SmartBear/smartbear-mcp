import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z as zod } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  type GetTestCase200Response,
  UpdateTestCaseBody,
  UpdateTestCaseParams,
  updateTestCaseBodyOwnerAccountIdRegExp,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils";

// The update API expects a folder/component/owner as `{ id }` / `{ accountId }`
// optional objects, but that optional objects are not supported the same way by all LLMs.
// Expose them as plain IDs here and expand them back into objects before merging into the
// real UpdateTestCaseBody shape (i.e., the one required by the REST API).
const UpdateTestCaseBodyToolInput = UpdateTestCaseBody.extend({
  folder: zod
    .number()
    .min(1)
    .nullish()
    .describe("The ID of the folder to move the test case into."),
  component: zod
    .number()
    .min(1)
    .nullish()
    .describe("The ID of the Jira component to associate."),
  owner: zod
    .string()
    .regex(updateTestCaseBodyOwnerAccountIdRegExp)
    .nullish()
    .describe("Atlassian Account ID of the Jira user to set as owner."),
}).partial();

export class UpdateTestCase extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Case",
    toolset: "Test Cases",
    summary:
      'Update an existing Test Case in Zephyr. This operation fetches the current test case and merges your updates with it to prevent accidental property deletion. Properties which are not included in the tool call will be left unchanged. To remove a property, set it to null explicitly. For fields that accept multiple values, such as `labels`, if the field is provided, it will override the previous values. For example, if `labels` is provided with the values `["label1", "label2"]`, the Test Case will now only have those two labels, and any previous labels will be removed. If you want to add a label, you would need to specify in the prompt the intention to add a label.',
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestCaseParams.and(UpdateTestCaseBodyToolInput),
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
          "Update the test case 'MM2-T1' by setting labels 'Regression','Performance' and 'Automated' and changing the priority to the one with id 2.",
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
        description: "Remove the component from test case 'SA-T20'.",
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
      {
        description: "Remove test case  from folder",
        parameters: {
          testCaseKey: "SA-T15",
          folder: null,
        },
        expectedOutput:
          "The test case should be updated, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsed = UpdateTestCaseParams.and(UpdateTestCaseBodyToolInput).parse(
      args,
    );

    const { testCaseKey, ...updatesFromToolInput } = parsed;

    const updatesForRestApi = this.toRestApiUpdates(updatesFromToolInput);

    // Fetch the existing test case to ensure we have all properties
    // This is necessary because Zephyr's PUT endpoints requires the complete resource
    // and will delete any properties that are not included in the request
    const existingTestCase: zod.infer<typeof GetTestCase200Response> =
      await this.client.getApiClient().get(`/testcases/${testCaseKey}`);

    // Deep merge the updatesForRestApi with the existing test case, then coerce to the
    // update body schema. For nested objects like customFields we merge instead
    // of replacing, and the schema strips fields the PUT endpoint rejects
    // (e.g. createdOn, links).
    const mergedBody = deepMerge(
      existingTestCase,
      updatesForRestApi,
      UpdateTestCaseBody.partial(),
    );

    await this.client
      .getApiClient()
      .put(`/testcases/${testCaseKey}`, mergedBody);

    return {
      structuredContent: {},
      content: [],
    };
  };

  // Convert the tool input into updates compatible with the REST API by
  // expanding the primitive folder/component/owner IDs back into the `{ id }` /
  // `{ accountId }` objects the REST API's UpdateTestCaseBody shape expects.
  private toRestApiUpdates(
    updatesFromToolInput: zod.infer<typeof UpdateTestCaseBodyToolInput>,
  ) {
    const restApiCompatibleFields: Partial<
      zod.infer<typeof UpdateTestCaseBody>
    > = {};

    if (updatesFromToolInput.folder) {
      restApiCompatibleFields.folder = { id: updatesFromToolInput.folder };
    }
    if (updatesFromToolInput.owner) {
      restApiCompatibleFields.owner = { accountId: updatesFromToolInput.owner };
    }
    if (updatesFromToolInput.component) {
      restApiCompatibleFields.component = {
        id: updatesFromToolInput.component,
      };
    }

    return {
      ...updatesFromToolInput,
      ...restApiCompatibleFields,
    };
  }
}
