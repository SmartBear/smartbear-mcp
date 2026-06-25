import { ToolError } from "../../common/tools";
import type {
  GetFunctionalTestingExecutionTestParams,
  GetFunctionalTestingSuiteExecutionParams,
  ListSuitesResponse,
  RunFunctionalTestingSuiteParams,
  RunFunctionalTestingTestParams,
} from "./functional-testing-types";

const API_HOSTNAME = "api.reflect.run";

export const FUNCTIONAL_TESTING_API_KEY_HEADER = "X-API-KEY";

export class FunctionalTestingAPI {
  private readonly baseUrl: string;

  constructor(
    private readonly getToken: () => string | null,
    private readonly userAgent: string,
    baseUrl?: string,
  ) {
    this.baseUrl = baseUrl || `https://${API_HOSTNAME}/v1`;
  }

  getFtHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      throw new ToolError("Swagger Functional Testing API token not found");
    }
    return {
      [FUNCTIONAL_TESTING_API_KEY_HEADER]: token,
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
    };
  }

  async listTests(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/tests`, {
      method: "GET",
      headers: this.getFtHeaders(),
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to list Functional Testing tests: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async runTest(args: RunFunctionalTestingTestParams): Promise<unknown> {
    if (!args.testId) throw new ToolError("testId argument is required");

    const response = await fetch(
      `${this.baseUrl}/tests/${args.testId}/executions`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to run test: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getTestExecution(
    args: GetFunctionalTestingExecutionTestParams,
  ): Promise<unknown> {
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await fetch(
      `${this.baseUrl}/executions/${args.executionId}`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to get test status: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async listSuites(): Promise<ListSuitesResponse> {
    const headers = this.getFtHeaders();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/suites`, {
        method: "GET",
        headers,
      });
    } catch {
      throw new ToolError(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ToolError(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    }

    if (!response.ok) {
      throw new ToolError(
        `Failed to list Functional Testing suites: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async runSuite(args: RunFunctionalTestingSuiteParams): Promise<unknown> {
    if (!args.suiteId) throw new ToolError("suiteId argument is required");

    const body = args.tunnelAgentName
      ? JSON.stringify({
          overrides: { agent: { name: args.tunnelAgentName } },
        })
      : undefined;

    const response = await fetch(
      `${this.baseUrl}/suites/${args.suiteId}/executions`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
        body,
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to run suite: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    // Reflect API returns suite URL, in format which currently is not supported within Private Workspaces epic.
    // We remove it for now, but will bring it back corrected in scope of https://smartbear.atlassian.net/browse/RF-5271.
    delete data.url;
    return data;
  }

  async getSuiteExecution(
    args: GetFunctionalTestingSuiteExecutionParams,
  ): Promise<unknown> {
    if (!args.suiteId) throw new ToolError("suiteId argument is required");
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await fetch(
      `${this.baseUrl}/suites/${args.suiteId}/executions/${args.executionId}`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to get suite execution status: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    // Reflect API returns suite URL, in format which currently is not supported within Private Workspaces epic.
    // We remove it for now, but will bring it back corrected in scope of https://smartbear.atlassian.net/browse/RF-5271.
    delete data.url;
    if (Array.isArray(data.tests)) {
      for (const test of data.tests as Record<string, unknown>[]) {
        // Reflect API returns video recording URL for each test, which SFT does not need so we remove it.
        delete test.videoUrl;
      }
    }
    return data;
  }
}
