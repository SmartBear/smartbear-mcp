import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";

// Type definitions for tool arguments
export interface suiteArgs {
  suiteId: string;
}

export interface suiteExecutionArgs {
  suiteId: string;
  executionId: string;
}

export interface testArgs {
  testId: string;
}

export interface testExecutionArgs {
  testId: string;
  executionId: string;
}

const ConfigurationSchema = z.object({
  api_token: z.string().describe("Reflect API authentication token"),
});

// ReflectClient class implementing the Client interface
export class ReflectClient implements Client {
  private _apiToken: string | undefined;

  name = "Reflect";
  toolPrefix = "reflect";
  configPrefix = "Reflect";

  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this._apiToken = config.api_token;
  }

  getAuthToken(): string | null {
    // 1. Try request context
    const contextHeader =
      getRequestHeader("Reflect-Api-Token") ||
      getRequestHeader("X-API-KEY") ||
      getRequestHeader("Authorization");

    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle Bearer or token prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.substring(7);
      }
      return token;
    }

    // 2. Fallback to configured token
    return this._apiToken || null;
  }

  isConfigured(): boolean {
    return this._apiToken !== undefined;
  }

  private getHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Reflect API token not found");
    }

    return {
      "X-API-KEY": token,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  async listReflectSuites(): Promise<any> {
    const response = await fetch("https://api.reflect.run/v1/suites", {
      method: "GET",
      headers: this.getHeaders(),
    });

    return response.json();
  }

  async listSuiteExecutions(suiteId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async getSuiteExecutionStatus(
    suiteId: string,
    executionId: string,
  ): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions/${executionId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async executeSuite(suiteId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async cancelSuiteExecution(
    suiteId: string,
    executionId: string,
  ): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions/${executionId}/cancel`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async listReflectTests(): Promise<any> {
    const response = await fetch("https://api.reflect.run/v1/tests", {
      method: "GET",
      headers: this.getHeaders(),
    });

    return response.json();
  }

  async runReflectTest(testId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/tests/${testId}/executions`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async getReflectTestStatus(
    _testId: string,
    executionId: string,
  ): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/executions/${executionId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    );

    return response.json();
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    register(
      {
        title: "List Suites",
        summary: "Retrieve a list of all reflect suites available",
        parameters: [],
      },
      async (_args, _extra) => {
        const response = await this.listReflectSuites();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "List Suite Executions",
        summary: "List all executions for a given suite",
        parameters: [
          {
            name: "suiteId",
            type: z.string(),
            description: "ID of the reflect suite to list executions for",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.suiteId) throw new ToolError("suiteId argument is required");
        const response = await this.listSuiteExecutions(args.suiteId as string);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Get Suite Execution Status",
        summary: "Get the status of a reflect suite execution",
        parameters: [
          {
            name: "suiteId",
            type: z.string(),
            description: "ID of the reflect suite to get execution status for",
            required: true,
          },
          {
            name: "executionId",
            type: z.string(),
            description: "ID of the reflect suite execution to get status for",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.suiteId || !args.executionId)
          throw new ToolError(
            "Both suiteId and executionId arguments are required",
          );
        const response = await this.getSuiteExecutionStatus(
          args.suiteId as string,
          args.executionId as string,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Execute Suite",
        summary: "Execute a reflect suite",
        parameters: [
          {
            name: "suiteId",
            type: z.string(),
            description: "ID of the reflect suite to list executions for",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.suiteId) throw new ToolError("suiteId argument is required");
        const response = await this.executeSuite(args.suiteId as string);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Cancel Suite Execution",
        summary: "Cancel a reflect suite execution",
        parameters: [
          {
            name: "suiteId",
            type: z.string(),
            description: "ID of the reflect suite to cancel execution for",
            required: true,
          },
          {
            name: "executionId",
            type: z.string(),
            description: "ID of the reflect suite execution to cancel",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.suiteId || !args.executionId)
          throw new ToolError(
            "Both suiteId and executionId arguments are required",
          );
        const response = await this.cancelSuiteExecution(
          args.suiteId as string,
          args.executionId as string,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "List Tests",
        summary: "List all reflect tests",
        parameters: [],
      },
      async (_args, _extra) => {
        const response = await this.listReflectTests();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Run Test",
        summary: "Run a reflect test",
        parameters: [
          {
            name: "testId",
            type: z.string(),
            description: "ID of the reflect test to run",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.testId) throw new ToolError("testId argument is required");
        const response = await this.runReflectTest(args.testId as string);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Get Test Status",
        summary: "Get the status of a reflect test execution",
        parameters: [
          {
            name: "testId",
            type: z.string(),
            description: "ID of the reflect test to run",
            required: true,
          },
          {
            name: "executionId",
            type: z.string(),
            description: "ID of the reflect test execution to get status for",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.testId || !args.executionId)
          throw new ToolError(
            "Both testId and executionId arguments are required",
          );
        const response = await this.getReflectTestStatus(
          args.testId as string,
          args.executionId as string,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}
