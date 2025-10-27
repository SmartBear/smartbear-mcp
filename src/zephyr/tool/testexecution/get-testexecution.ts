import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { ToolParams } from "../../../common/types.js";
import type { ApiClient } from "../../common/api-client.js";
import {
  GetTestExecutionResponseSchema,
  TestExecutionsQueryValuesSchema,
} from "../../common/types.js";
import type { ZephyrTool } from "../zephyr-tool.js";

export const GetTestExecutionsInputSchema = TestExecutionsQueryValuesSchema;
type GetTestExecutionsInput = typeof GetTestExecutionsInputSchema._type;

export class GetTestExecutions implements ZephyrTool {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  specification: ToolParams = {
    title: "Get Test Executions",
    summary: "Get test executions with optional filters",
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestExecutionsInputSchema,
    outputSchema: GetTestExecutionResponseSchema,
    examples: [
      {
        description: "Get the first 10 test executions",
        parameters: { limit: 10, startAtId: 0 },
        expectedOutput: "The first 10 test executions with their details",
      },
      {
        description: "Get test executions for a specific project",
        parameters: { projectKey: "PROJ", limit: 5 },
        expectedOutput: "Up to 5 test executions for project PROJ",
      },
      {
        description: "Get test executions after a specific date",
        parameters: { actualEndDateAfter: "2024-01-01T00:00:00Z" },
        expectedOutput: "Test executions that ended after 2024-01-01",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args: GetTestExecutionsInput) => {
    const response = await this.apiClient.get("/testexecutions/nextgen", args);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
