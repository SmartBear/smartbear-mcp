import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  listTestExecutionsNextgenQueryParams,
  listTestExecutionsNextgenResponse,
} from "../../common/rest-api-schemas";

export class GetTestExecutions extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Executions",
    summary: "Get test executions with optional filters",
    readOnly: true,
    idempotent: true,
    inputSchema: listTestExecutionsNextgenQueryParams,
    outputSchema: listTestExecutionsNextgenResponse,
    examples: [
      {
        description: "Get the first 10 test executions",
        parameters: { limit: 10, startAtId: 0 },
        expectedOutput: "The first 10 test executions with their details",
      },
      {
        description: "Get 5 test executions for the project PROJ",
        parameters: { projectKey: "PROJ", limit: 5 },
        expectedOutput: "Up to 5 test executions for project PROJ",
      },
      {
        description: "Get some test executions that finished after 01/Jan/2024",
        parameters: { actualEndDateAfter: "2024-01-01T00:00:00Z" },
        expectedOutput: "Test executions that ended after 2024-01-01",
      },
      {
        description: "Get test executions with step links included",
        parameters: { includeStepLinks: true },
        expectedOutput: "Test executions with step links included",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const parsedArgs = listTestExecutionsNextgenQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/testexecutions/nextgen", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
