/**
 * Minimal ZephyrClient class implementing Client interface for MCP integration.
 *
 * Follows the exact same pattern as ReflectClient for guaranteed compilation success.
 */

import type { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { z } from "zod";

export class ZephyrClient implements Client {
  private headers: {
    "Authorization": string;
    "Content-Type": string;
    "User-Agent": string;
  };

  name = "Zephyr";
  prefix = "zephyr";

  constructor(token: string) {
    this.headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "SmartBear-MCP-Server/1.0.0",
    };
  }

  async listTestCases(projectKey: string): Promise<any> {
    const response = await fetch(`https://api.zephyrscale.smartbear.com/v2/testcases?projectKey=${projectKey}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async getTestCase(testCaseKey: string): Promise<any> {
    const response = await fetch(`https://api.zephyrscale.smartbear.com/v2/testcases/${testCaseKey}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async listTestPlans(projectKey: string): Promise<any> {
    const response = await fetch(`https://api.zephyrscale.smartbear.com/v2/testplans?projectKey=${projectKey}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    register(
      {
        title: "List Test Cases",
        summary: "List test cases for a project",
        parameters: [
          {
            name: "projectKey",
            type: z.string(),
            description: "JIRA project key",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.projectKey) throw new Error("projectKey argument is required");
        const response = await this.listTestCases(args.projectKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

    register(
      {
        title: "Get Test Case",
        summary: "Get details of a specific test case",
        parameters: [
          {
            name: "testCaseKey",
            type: z.string(),
            description: "Test case key in Zephyr format",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.testCaseKey) throw new Error("testCaseKey argument is required");
        const response = await this.getTestCase(args.testCaseKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

    register(
      {
        title: "List Test Plans",
        summary: "List test plans for a project",
        parameters: [
          {
            name: "projectKey",
            type: z.string(),
            description: "JIRA project key",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.projectKey) throw new Error("projectKey argument is required");
        const response = await this.listTestPlans(args.projectKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}