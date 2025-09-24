
import { z } from "zod";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";


export interface createTestCycleArgs {
  id?: number;
  name: string;
  description?: string;
  key?: string;
  estimatedTime?: number;
  executionTime?: number;
  folderId?: number;
  userAids?: string;
  iterationId?: number;
  statusId?: number;
  owner?: string;
  createdByAid?: string;
  serverId?: number;
  projectId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  testRunItems?: any[];
  projectVersionId?: string;
  customFieldValues?: any[];
  clientId?: number;
}


// Tool definitions for the API client
export class TestManagementClient implements Client {
  private headers: {
    Authorization: string;
    "Content-Type": string;
    "User-Agent": string;
  };

  name = "Test Management";
  prefix = "test_management";

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  // Method to create a new test cycle
  async createTestCycle(body: createTestCycleArgs): Promise<any> {
    const response = await fetch(
      `http://localhost:8085/backend/rest/tests/2.0/testrun`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }


  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    register(
      {
        title: "Create Test Cycle",
        summary: "Create a new test cycle within the test management system.",
        parameters: [
          { name: "id", type: z.number(), required: false, description: "Test cycle ID." },
          { name: "name", type: z.string(), required: true, description: "Test cycle name." },
          {
            name: "description", type: z.string().optional(), description: "Description of the test cycle.",
            required: false
          },
          {
            name: "key", type: z.string().optional(), description: "Unique key for the test cycle.",
            required: false
          },
          {
            name: "estimatedTime", type: z.number().optional(), description: "Estimated time for the test cycle.",
            required: false
          },
          {
            name: "executionTime", type: z.number().optional(), description: "Execution time for the test cycle.",
            required: false
          },
          {
            name: "folderId", type: z.number().optional(), description: "Folder ID where the test cycle is located.",
            required: false
          },
          {
            name: "userAids", type: z.string().optional(), description: "User aids associated with the test cycle.",
            required: false
          },
          {
            name: "iterationId", type: z.number().optional(), description: "Iteration ID associated with the test cycle.",
            required: false
          },
          {
            name: "statusId", type: z.number().optional(), description: "Status ID of the test cycle.",
            required: false
          },
          {
            name: "owner", type: z.string().optional(), description: "Owner of the test cycle.",
            required: false
          },
          {
            name: "createdByAid", type: z.string().optional(), description: "Creator's aid for the test cycle.",
            required: false
          },
          {
            name: "serverId", type: z.number().optional(), description: "Server ID associated with the test cycle.",
            required: false
          },
          {
            name: "projectId", type: z.number().optional(), description: "Project ID associated with the test cycle.",
            required: false
          },
          {
            name: "plannedStartDate", type: z.string().optional(), description: "Planned start date for the test cycle.",
            required: false
          },
          {
            name: "plannedEndDate", type: z.string().optional(), description: "Planned end date for the test cycle.",
            required: false
          },
          {
            name: "testRunItems", type: z.array(z.any()).optional(), description: "Test run items associated with the cycle.",
            required: false
          },
          {
            name: "projectVersionId", type: z.string().optional(), description: "Project version ID associated with the test cycle.",
            required: false
          },
          {
            name: "customFieldValues", type: z.array(z.any()).optional(), description: "Custom field values for the test cycle.",
            required: false
          },
          {
            name: "clientId", type: z.number().optional(), description: "Client ID associated with the test cycle.",
            required: false
          },
        ],
      },
      async (args, _extra) => {
        const createTestCycleArgs = args as createTestCycleArgs;
        const response = await this.createTestCycle(createTestCycleArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

  }
}
