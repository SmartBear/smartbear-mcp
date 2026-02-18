import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, z as zod } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  type getTestCycle200Response,
  updateTestCycleBody,
  updateTestCycleParams,
} from "../../common/rest-api-schemas";
import { deepMerge } from "../../common/utils";

export class UpdateTestCycle extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Update Test Cycle",
    summary:
      "Update an existing Test Cycle in Zephyr. This operation fetches the current test cycle and merges your updates with it to prevent accidental property deletion. To remove a property, set it to null explicitly. The plannedStartDate and plannedEndDate fields cannot be cleared",
    readOnly: false,
    idempotent: true,
    inputSchema: updateTestCycleParams.and(updateTestCycleBody.partial()),
    examples: [
      {
        description:
          "Update the name of the test cycle 'SA-R40' to 'Sprint 1 Regression - Updated' and set description.",
        parameters: {
          testCycleIdOrKey: "SA-R40",
          name: "Sprint 1 Regression - Updated",
          description: "Updated regression scope for Sprint 1",
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
      {
        description:
          "Update planned dates for test cycle id '1' (keep everything else unchanged).",
        parameters: {
          testCycleIdOrKey: "1",
          plannedStartDate: "2018-05-19T13:15:13Z",
          plannedEndDate: "2018-05-20T13:15:13Z",
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
      {
        description:
          "Change folder and status for test cycle 'SA-R40' by setting folder id and status id.",
        parameters: {
          testCycleIdOrKey: "SA-R40",
          folder: { id: 100006 },
          status: { id: 10000 },
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
      {
        description:
          "Update custom fields on test cycle 'SA-R40' while keeping other custom fields intact.",
        parameters: {
          testCycleIdOrKey: "SA-R40",
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
          },
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
      {
        description: "Remove the owner from test cycle 'SA-R40'.",
        parameters: {
          testCycleIdOrKey: "SA-R40",
          owner: null,
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
      {
        description:
          "Remove a specific custom field 'Pre-Condition(s)' from test cycle 'SA-R40' while keeping other custom fields intact.",
        parameters: {
          testCycleIdOrKey: "SA-R40",
          customFields: {
            "Pre-Condition(s)": null,
            Implemented: false,
          },
        },
        expectedOutput:
          "The test cycle should be updated, but no output is expected.",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsed = updateTestCycleParams
      .and(updateTestCycleBody.partial())
      .parse(args);

    const { testCycleIdOrKey, ...updatesRaw } = parsed;
    const updates: Record<string, unknown> = { ...updatesRaw };

    if (updates.plannedStartDate === null)
      delete updates.plannedStartDate;
    if (updates.plannedEndDate === null)
      delete updates.plannedEndDate;

    // Fetch the existing test cycle to ensure we have all properties.
    // Zephyr's PUT endpoints require the complete resource and clear unspecified fields.
    const existingTestCycle: zod.infer<typeof getTestCycle200Response> =
      await this.client.getApiClient().get(`/testcycles/${testCycleIdOrKey}`);

    // Merge updates into the existing resource so unspecified fields remain unchanged.
    const mergedBody = deepMerge(existingTestCycle, updates);

    await this.client
      .getApiClient()
      .put(`/testcycles/${testCycleIdOrKey}`, mergedBody);

    return {
      structuredContent: {},
      content: [],
    };
  };
}
