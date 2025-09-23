
import { z } from "zod";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";

// Type definitions for tool arguments
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

export interface createTestExecutionArgs {
  projectKey: string;
  testCaseKey: string;
  testCycleKey: string;
  statusName: string;
  testScriptResults?: any[];
  environmentName?: string;
  actualEndDate?: string;
  executionTime?: number;
  executedById?: string;
  assignedToId?: string;
  comment?: string;
  customFields?: Record<string, any>;
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

    if (!response.ok) {
      throw new Error(`Failed to create test cycle: ${response.statusText}`);
    }

    return response.json();
  }

  // Method to create a new test execution
  async createTestExecution(body: createTestExecutionArgs): Promise<any> {
    const response = await fetch(
      `http://localhost:8085/backend/rest/tests/2.0/testresult`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create test execution: ${response.statusText}`);
    }

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

    register(
      {
        title: "Create Test Execution",
        summary: "Create a new test execution within the test management system.",
        parameters: [
          { name: "projectKey", type: z.string(), description: "Project key for the test execution.", required: true },
          { name: "testCaseKey", type: z.string(), description: "Test case key for the test execution.", required: true },
          { name: "testCycleKey", type: z.string(), description: "Test cycle key for the test execution.", required: true },
          { name: "statusName", type: z.string(), description: "Status name for the test execution.", required: true },
          {
            name: "testScriptResults", type: z.array(z.any()).optional(), description: "Test script results for the execution.",
            required: false
          },
          {
            name: "environmentName", type: z.string().optional(), description: "Environment name for the test execution.",
            required: false
          },
          {
            name: "actualEndDate", type: z.string().optional(), description: "Actual end date for the test execution.",
            required: false
          },
          {
            name: "executionTime", type: z.number().optional(), description: "Execution time for the test execution.",
            required: false
          },
          {
            name: "executedById", type: z.string().optional(), description: "ID of the person who executed the test.",
            required: false
          },
          {
            name: "assignedToId", type: z.string().optional(), description: "ID of the person assigned to the test execution.",
            required: false
          },
          {
            name: "comment", type: z.string().optional(), description: "Comment for the test execution.",
            required: false
          },
          {
            name: "customFields", type: z.record(z.any()).optional(), description: "Custom fields for the test execution.",
            required: false
          },
        ],
      },
      async (args, _extra) => {
        const createTestExecutionArgs = args as createTestExecutionArgs;
        const response = await this.createTestExecution(createTestExecutionArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}