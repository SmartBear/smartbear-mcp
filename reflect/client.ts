import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "../common/types.js";
import { z } from "zod";

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

// ReflectClient class implementing the Client interface
export class ReflectClient implements Client {
  private headers: { "X-API-KEY": string; "Content-Type": string };

  constructor(token: string) {
    this.headers = {
      "X-API-KEY": `${token}`,
      "Content-Type": "application/json",
    };
  }

  async listReflectSuites(): Promise<any> {
    const response = await fetch("https://api.reflect.run/v1/suites", {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async listSuiteExecutions(suiteId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async getSuiteExecutionStatus(suiteId: string, executionId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions/${executionId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async executeSuite(suiteId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions`,
      {
        method: "POST",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async cancelSuiteExecution(suiteId: string, executionId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/suites/${suiteId}/executions/${executionId}/cancel`,
      {
        method: "PATCH",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async listReflectTests(): Promise<any> {
    const response = await fetch("https://api.reflect.run/v1/tests", {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async runReflectTest(testId: string): Promise<any> {
    const response = await fetch(`https://api.reflect.run/v1/tests/${testId}/executions`, {
      method: "POST",
      headers: this.headers,
    });

    return response.json();
  }

  async getReflectTestStatus(testId: string, executionId: string): Promise<any> {
    const response = await fetch(
      `https://api.reflect.run/v1/executions/${executionId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  registerTools(server: McpServer): void {
    server.tool(
      "list_reflect_suites",
      "List all reflect suites",
      {},
      async (_args, _extra) => {
        const response = await this.listReflectSuites();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "list_reflect_suite_executions",
      "List all executions for a given reflect suite",
      { suiteId: z.string().describe("ID of the reflect suite to list executions for") },
      async (args, _extra) => {
        if (!args.suiteId) throw new Error("suiteId argument is required");
        const response = await this.listSuiteExecutions(args.suiteId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "reflect_suite_execution_status",
      "Get the status of a reflect suite execution",
      {
        suiteId: z.string().describe("ID of the reflect suite to list executions for"),
        executionId: z.string().describe("ID of the reflect suite execution to get status for"),
      },
      async (args, _extra) => {
        if (!args.suiteId || !args.executionId) throw new Error("Both suiteId and executionId arguments are required");
        const response = await this.getSuiteExecutionStatus(args.suiteId, args.executionId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "reflect_suite_execution",
      "Execute a reflect suite",
      { suiteId: z.string().describe("ID of the reflect suite to list executions for") },
      async (args, _extra) => {
        if (!args.suiteId) throw new Error("suiteId argument is required");
        const response = await this.executeSuite(args.suiteId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "cancel_reflect_suite_execution",
      "Cancel a reflect suite execution",
      {
        suiteId: z.string().describe("ID of the reflect suite to cancel execution for"),
        executionId: z.string().describe("ID of the reflect suite execution to cancel"),
      },
      async (args, _extra) => {
        if (!args.suiteId || !args.executionId) throw new Error("Both suiteId and executionId arguments are required");
        const response = await this.cancelSuiteExecution(args.suiteId, args.executionId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "list_reflect_tests",
      "List all reflect tests",
      {},
      async (_args, _extra) => {
        const response = await this.listReflectTests();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "run_reflect_test",
      "Run a reflect test",
      { testId: z.string().describe("ID of the reflect test to run") },
      async (args, _extra) => {
        if (!args.testId) throw new Error("testId argument is required");
        const response = await this.runReflectTest(args.testId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
    server.tool(
      "reflect_test_status",
      "Get the status of a reflect test execution",
      {
        testId: z.string().describe("ID of the reflect test to run"),
        executionId: z.string().describe("ID of the reflect test execution to get status for"),
      },
      async (args, _extra) => {
        if (!args.testId || !args.executionId) throw new Error("Both testId and executionId arguments are required");
        const response = await this.getReflectTestStatus(args.testId, args.executionId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );
  }

  registerResources(_server: McpServer): void {
    // Reflect does not currently support dynamic resources
  }
}
