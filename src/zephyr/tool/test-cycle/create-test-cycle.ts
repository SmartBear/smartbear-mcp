import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createTestCycleBody,
  createTestCycle201Response as createTestCycleResponse,
} from "../../common/rest-api-schemas";

export class CreateTestCycle extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Cycle",
    summary: "Create a new Test Cycle in Zephyr specified project",
    readOnly: false,
    idempotent: false,
    inputSchema: createTestCycleBody,
    outputSchema: createTestCycleResponse,
    examples: [
      {
        description:
          "Create a Test Cycle in project SA to ensure that the axial pump can be enabled",
        parameters: {
          projectKey: "SA",
          name: "Check axial pump",
          description: "Ensure the axial pump can be enabled",
        },
        expectedOutput: "The newly created Test Cycle with its details and key",
      },
      {
        description:
          "Create a Test Cycle to ensure that the axial pump can be enabled. The test cycle should be in project MM2, have status 'In Progress', and be planned from 2026-03-01 to 2026-03-10",
        parameters: {
          projectKey: "MM2",
          name: "Check axial pump",
          description: "Ensure the axial pump can be enabled",
          statusName: "In Progress",
          plannedStartDate: "2026-03-01T00:00:00Z",
          plannedEndDate: "2026-03-10T00:00:00Z",
        },
        expectedOutput: "The newly created Test Cycle with its details and key",
      },
      {
        description:
          "Create a Test Cycle for verifying strength of the axial pump with custom field 'Axial pump strength' having value '5' in project SA",
        parameters: {
          projectKey: "SA",
          name: "Check axial pump strength",
          description:
            "Make sure the axial pump operates at the required strength",
          customFields: {
            "Axial pump strength": 5,
          },
        },
        expectedOutput: "The newly created Test Cycle with its details and key",
      },
      {
        description:
          "Create a Test Cycle in project MM2 to verify the performance of the axial pump with Jira Project Version ID 10001, owner Atlassian Account ID '12', in folder with ID 18",
        parameters: {
          projectKey: "MM2",
          name: "Check axial pump performance",
          description:
            "Ensure the axial pump performs within acceptable limits",
          jiraProjectVersion: 10001,
          ownerId: "12",
          folderId: 18,
        },
        expectedOutput: "The newly created Test Cycle with its details and key",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const body = createTestCycleBody.parse(args);
    const response = await this.client
      .getApiClient()
      .post(`/testcycles/`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
