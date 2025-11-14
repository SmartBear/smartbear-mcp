import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  getProjectParams,
  getProjectResponse,
} from "../../common/rest-api-schemas.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export class GetProject implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Project",
    summary: "Get details of project specified by id or key in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: getProjectParams,
    outputSchema: getProjectResponse,
    examples: [
      {
        description: "Get the project with id 1",
        parameters: {
          projectIdOrKey: "1",
        },
        expectedOutput: "The project with its details",
      },
      {
        description: "Get the project with key 'PROJ'",
        parameters: {
          projectIdOrKey: "PROJ",
        },
        expectedOutput: "The project with its details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: ZodRawShape) => {
    const { projectIdOrKey } = getProjectParams.parse(args);
    const response = await this.apiClient.get(`/projects/${projectIdOrKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
