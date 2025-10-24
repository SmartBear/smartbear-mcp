import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  FolderIdSchema,
  JiraProjectVersionIdSchema,
  MaxResultsSchema,
  ProjectKeySchema,
  StartAtSchema,
  ZephyrTestCycleListSchema,
} from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetTestCyclesInputSchema = z.object({
  projectKey: ProjectKeySchema.optional(),
  folderId: FolderIdSchema.optional(),
  jiraProjectVersionId: JiraProjectVersionIdSchema.optional(),
  maxResults: MaxResultsSchema.optional(),
  startAt: StartAtSchema.optional(),
});

type GetTestCyclesInput = z.infer<typeof GetTestCyclesInputSchema>;

export class GetTestCycles implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Test Cycles",
    summary: "Get details of Test Cycles in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCyclesInputSchema,
    outputSchema: ZephyrTestCycleListSchema,
    examples: [
      {
        description: "Get the first 10 Test Cycles",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 Test Cycles with their details",
      },
      {
        description: "Get any Test Cycle",
        parameters: {
          maxResults: 1,
        },
        expectedOutput: "One Test Cycle with its details",
      },
      {
        description:
          "Get five Test Cycles starting from the 7th Test Cycles of the list",
        parameters: {
          maxResults: 5,
          startAt: 6,
        },
        expectedOutput: "The 7th to the 11th Test Cycles with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: GetTestCyclesInput) => {
    const { projectKey, folderId, jiraProjectVersionId, maxResults, startAt } =
      args;
    const response = await this.apiClient.get("/testcycles", {
      projectKey,
      folderId,
      jiraProjectVersionId,
      maxResults,
      startAt,
    });
    return {
      structuredContent: response,
      content: [],
    };
  };
}
