import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  listEnvironmentsQueryParams,
  listEnvironmentsResponse,
} from "../../common/rest-api-schemas.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export class GetEnvironments implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Environments",
    summary: "Get environments in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: listEnvironmentsQueryParams,
    outputSchema: listEnvironmentsResponse,
    examples: [
      {
        description: "Get the first 20 Environments",
        parameters: {
          maxResults: 20,
          startAt: 0,
        },
        expectedOutput:
          "The first 20 Environments with their details from different projects",
      },
      {
        description:
          "Get the first 10 Environments from the project with projectKey TEST",
        parameters: {
          projectKey: "TEST",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput:
          "The first 10 Environments with their details from project with projectKey TEST",
      },
      {
        description:
          "Get second 10 Environments from the project with projectKey TEST",
        parameters: {
          projectKey: "TEST",
          maxResults: 10,
          startAt: 10,
        },
        expectedOutput:
          "The first 10 Environments with their details from project with projectKey TEST",
      },
      {
        description:
          "Get Environments starting from the 5th Environment from different projects",
        parameters: {
          startAt: 5,
          maxResults: 10,
        },
        expectedOutput:
          "Environments starting from the 5th one with their details from different projects",
      },
      {
        description:
          "Get 5 Environments starting from the 10th Environment from the project with projectKey PROJ",
        parameters: {
          startAt: 10,
          maxResults: 5,
          projectKey: "PROJ",
        },
        expectedOutput:
          "The five environments starting from the 10th Environment from the project PROJ with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const getEnvironmentsInput = listEnvironmentsQueryParams.parse(args);
    const response = await this.apiClient.get(
      "/environments",
      getEnvironmentsInput,
    );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
