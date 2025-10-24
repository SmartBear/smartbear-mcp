import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  ProjectIdOrKeySchema,
  type ZephyrProject,
  ZephyrProjectSchema,
} from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetProjectInputSchema = z.object({
  projectIdOrKey: ProjectIdOrKeySchema,
});

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
    inputSchema: GetProjectInputSchema,
    outputSchema: ZephyrProjectSchema,
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
    const { projectIdOrKey } = GetProjectInputSchema.parse(args);
    const response: ZephyrProject = await this.apiClient.get(
      `/projects/${projectIdOrKey}`,
    );
    return {
      structuredContent: response,
      content: [],
    };
  };
}
