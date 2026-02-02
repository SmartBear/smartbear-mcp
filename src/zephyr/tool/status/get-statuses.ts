import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  listStatusesQueryParams,
  listStatuses200Response as listStatusesResponse,
} from "../../common/rest-api-schemas";

export class GetStatuses extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Statuses",
    summary: "Get statuses of different types of test artifacts in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: listStatusesQueryParams,
    outputSchema: listStatusesResponse,
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
          "A list of statuses related to test cases with their details",
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

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const getStatusesInput = listStatusesQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/statuses", getStatusesInput);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
