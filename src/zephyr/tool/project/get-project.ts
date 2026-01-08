import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  getProjectParams,
  getProjectResponse,
} from "../../common/rest-api-schemas";

export class GetProject extends Tool<ZephyrClient> {
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

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { projectIdOrKey } = getProjectParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/projects/${projectIdOrKey}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
