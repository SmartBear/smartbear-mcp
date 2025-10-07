import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import type { ApiClient } from "../../common/api-client.js";
import { MaxResultsSchema, StartAtSchema } from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetProjectsInputSchema = z.object({
  startAt: StartAtSchema.optional(),
  maxResults: MaxResultsSchema.optional(),
});
type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;

export class GetProjects implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification = {
    title: "Get Projects",
    summary: "Get details of projects in Zephyr",
    readOnly: true,
    idempotent: true,
    zodSchema: GetProjectsInputSchema,
    examples: [
      {
        description: "Get the first 10 projects",
        parameters: {
          maxResult: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 projects with their details",
      },
      {
        description: "Get any project",
        parameters: {
          maxResult: 1,
        },
        expectedOutput: "One project with its details",
      },
      {
        description:
          "Get five projects starting from the 7th project of the list",
        parameters: {
          maxResult: 5,
          startAt: 6,
        },
        expectedOutput: "The 7th to the 11th projects with their details",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: GetProjectsInput) => {
    const { maxResults, startAt } = args;
    const response = await this.apiClient.get("/projects", {
      maxResults,
      startAt,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  };
}
