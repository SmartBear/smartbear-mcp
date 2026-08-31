import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  ListTestPlansCursorPaginatedQueryParams,
  ListTestPlansCursorPaginated200Response as ListTestPlansCursorPaginatedResponse,
} from "../../common/rest-api-schemas";

export class GetTestPlans extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Test Plans",
    toolset: "Test Plans",
    summary: "Get details of Test Plans in Zephyr",
    readOnly: true,
    idempotent: true,
    inputSchema: ListTestPlansCursorPaginatedQueryParams,
    outputSchema: ListTestPlansCursorPaginatedResponse,
    examples: [
      {
        description: "Get the first 10 Test Plans",
        parameters: {
          limit: 10,
          startAtId: 0,
        },
        expectedOutput: "The first 10 Test Plans with their details",
      },
      {
        description: "Get any Test Plan",
        parameters: {
          limit: 1,
        },
        expectedOutput: "One Test Plan with its details",
      },
      {
        description: "Get five Test Plans starting from the ID 123",
        parameters: {
          limit: 5,
          startAtId: 123,
        },
        expectedOutput:
          "Five Test Plans starting from the ID 123 with their details",
      },
      {
        description: "Get one Test Plan from the project PROJ",
        parameters: {
          projectKey: "PROJ",
          limit: 1,
        },
        expectedOutput: "One Test Plan from project PROJ with its details",
      },
      {
        description: "Get Test Plans updated after a given time",
        parameters: {
          updatedAfter: "2024-01-01T00:00:00Z",
          limit: 10,
        },
        expectedOutput:
          "Up to 10 Test Plans updated after 2024-01-01 with their details",
      },
    ],
  };

  handle: ToolHandler = async (args) => {
    const parsedArgs = ListTestPlansCursorPaginatedQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/testplans/nextgen", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
