import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  MaxResultsSchema,
  StartAtSchema,
  type StatusList,
  StatusListSchema,
  StatusTypeSchema,
  ZephyrProjectKeySchema,
} from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetStatusesInputSchema = z.object({
  startAt: StartAtSchema.optional(),
  maxResults: MaxResultsSchema.optional(),
  projectKey: ZephyrProjectKeySchema.optional(),
  statusType: StatusTypeSchema.optional(),
});
type GetStatusesInput = z.infer<typeof GetStatusesInputSchema>;

export class GetStatuses implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Statuses",
    summary: "Get statuses of different types of test artifacts in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: GetStatusesInputSchema,
    outputSchema: StatusListSchema,
    examples: [
      {
        description: "Get the first 10 statuses",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput:
          "The first 10 statuses with their details from different projects and test artifact types",
      },
      {
        description: "Get 10 test case statuses",
        parameters: {
          maxResults: 10,
          statusType: "TEST_CASE",
        },
        expectedOutput:
          "A list of statuses and related to test cases with their details",
      },
      {
        description: "Get five statuses from the project PROJ",
        parameters: {
          maxResults: 5,
          projectKey: "PROJ",
        },
        expectedOutput:
          "The first five statuses from the project PROJ with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (
    getStatusesInput: GetStatusesInput,
  ) => {
    const response: StatusList = await this.apiClient.get(
      "/statuses",
      getStatusesInput,
    );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
