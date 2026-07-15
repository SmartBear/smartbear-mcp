// biome-ignore-all lint/style/noExcessiveLinesPerFile: single Functional Testing HTTP client; splitting per-endpoint would fragment the shared ftFetch/error-mapping helpers used by all of them
import { appendClientIdentity } from "../../common/info.ts";
import { ToolError } from "../../common/tools.ts";
import type {
  CancelFunctionalTestingSuiteExecutionParams,
  GetFunctionalTestingExecutionTestParams,
  GetFunctionalTestingSuiteExecutionParams,
  ListFunctionalTestingSuiteExecutionsParams,
  ListSuiteExecutionsResponse,
  ListSuitesResponse,
  RunFunctionalTestingSuiteParams,
  RunFunctionalTestingTestParams,
} from "./functional-testing-types.ts";

const API_HOSTNAME = "api.reflect.run";
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

function suiteExecutionsErrorMessage(response: Response): string {
  switch (response.status) {
    // Defensive: the Reflect API currently returns 200 with an empty
    // `executions.data` list for an unknown suiteId rather than a 404, so this
    // branch is not expected to fire today. Kept in case the API starts
    // returning 404 for missing suites.
    case HTTP_NOT_FOUND:
      return "Test suite not found. Verify the suiteId is correct and belongs to your workspace.";
    default:
      return `Failed to list suite executions: ${response.status} ${response.statusText}`;
  }
}

function cancelSuiteExecutionErrorMessage(response: Response): string {
  switch (response.status) {
    case HTTP_NOT_FOUND:
      return "Suite execution not found. Verify the suiteId and executionId are correct and belong to your workspace.";
    case HTTP_CONFLICT:
      return "Suite execution cannot be cancelled because it has already finished.";
    default:
      return `Failed to cancel suite execution: ${response.status} ${response.statusText}`;
  }
}

export const FUNCTIONAL_TESTING_API_KEY_HEADER = "X-API-KEY";

export class FunctionalTestingApi {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;
  private readonly userAgent: string;

  constructor(
    getToken: () => string | null,
    userAgent: string,
    baseUrl?: string,
  ) {
    this.getToken = getToken;
    this.userAgent = userAgent;
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
      "User-Agent": appendClientIdentity(this.userAgent),
    };
  }

  private async ftFetch(input: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      throw new ToolError(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
        { cause: error },
      );
    }

    if (
      response.status === HTTP_UNAUTHORIZED ||
      response.status === HTTP_FORBIDDEN
    ) {
      throw new ToolError(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    }

    return response;
  }

  async listTests(): Promise<unknown> {
    const response = await this.ftFetch(`${this.baseUrl}/tests`, {
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
    if (!args.testId) {
      throw new ToolError("testId argument is required");
    }

    const response = await this.ftFetch(
      `${this.baseUrl}/tests/${encodeURIComponent(args.testId)}/executions`,
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

    const response = await this.ftFetch(
      `${this.baseUrl}/executions/${encodeURIComponent(args.executionId)}`,
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

    const data = (await response.json()) as Record<string, unknown>;
    // Reflect API returns video recording URL for each test run, which SFT does not need so we remove it.
    if (Array.isArray(data.tests)) {
      for (const test of data.tests as Record<string, unknown>[]) {
        const run = test.run as Record<string, unknown> | undefined;
        if (run) {
          run.videoUrl = undefined;
        }
      }
    }
    return data;
  }

  async listSuiteExecutions(
    args: ListFunctionalTestingSuiteExecutionsParams,
  ): Promise<ListSuiteExecutionsResponse> {
    if (!args.suiteId) {
      throw new ToolError("suiteId argument is required");
    }

    const response = await this.ftFetch(
      `${this.baseUrl}/suites/${encodeURIComponent(args.suiteId)}/executions`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(suiteExecutionsErrorMessage(response));
    }

    const data: ListSuiteExecutionsResponse = await response.json();
    // Will be adjusted after https://smartbear.atlassian.net/browse/RF-5271 is done
    return {
      ...data,
      executions: {
        data: data.executions.data.map(
          ({ executionId, status, isFinished }) => ({
            executionId,
            status,
            isFinished,
          }),
        ),
      },
    };
  }
  async listSuites(): Promise<ListSuitesResponse> {
    const response = await this.ftFetch(`${this.baseUrl}/suites`, {
      method: "GET",
      headers: this.getFtHeaders(),
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to list Functional Testing suites: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async cancelSuiteExecution(
    args: CancelFunctionalTestingSuiteExecutionParams,
  ): Promise<unknown> {
    if (!args.suiteId) {
      throw new ToolError("suiteId argument is required");
    }
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await this.ftFetch(
      `${this.baseUrl}/suites/${encodeURIComponent(args.suiteId)}/executions/${encodeURIComponent(args.executionId)}/cancel`,
      {
        method: "PATCH",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(cancelSuiteExecutionErrorMessage(response));
    }

    return response.json();
  }

  async runSuite(args: RunFunctionalTestingSuiteParams): Promise<unknown> {
    if (!args.suiteId) {
      throw new ToolError("suiteId argument is required");
    }

    const body = args.tunnelAgentName
      ? JSON.stringify({
          overrides: { agent: { name: args.tunnelAgentName } },
        })
      : undefined;

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/suites/${args.suiteId}/executions`,
        {
          method: "POST",
          headers: this.getFtHeaders(),
          body,
        },
      );
    } catch (error) {
      throw new ToolError(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
        { cause: error },
      );
    }

    if (
      response.status === HTTP_UNAUTHORIZED ||
      response.status === HTTP_FORBIDDEN
    ) {
      throw new ToolError(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    }

    if (!response.ok) {
      throw new ToolError(
        `Failed to run suite: ${response.status} ${response.statusText}`,
      );
    }

    // Reflect API returns suite URL, in format which currently is not supported within Private Workspaces epic.
    // We remove it for now, but will bring it back corrected in scope of https://smartbear.atlassian.net/browse/RF-5271.
    return this.withoutField("url", response);
  }

  async getSuiteExecution(
    args: GetFunctionalTestingSuiteExecutionParams,
  ): Promise<unknown> {
    if (!args.suiteId) {
      throw new ToolError("suiteId argument is required");
    }
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/suites/${args.suiteId}/executions/${args.executionId}`,
        {
          method: "GET",
          headers: this.getFtHeaders(),
        },
      );
    } catch (error) {
      throw new ToolError(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
        { cause: error },
      );
    }

    if (
      response.status === HTTP_UNAUTHORIZED ||
      response.status === HTTP_FORBIDDEN
    ) {
      throw new ToolError(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    }

    if (!response.ok) {
      throw new ToolError(
        `Failed to get suite execution status: ${response.status} ${response.statusText}`,
      );
    }

    // Reflect API returns suite URL, in format which currently is not supported within Private Workspaces epic.
    // We remove it for now, but will bring it back corrected in scope of https://smartbear.atlassian.net/browse/RF-5271.
    const data = await this.withoutField("url", response);
    // Reflect API returns video recording URL for each test run within suite, which SFT does not need so we remove it.
    this.stripSuiteVideoUrls(data);
    return data;
  }

  private async withoutField(
    field: string,
    response: Response,
  ): Promise<Record<string, unknown>> {
    const data = (await response.json()) as Record<string, unknown>;
    delete data[field];
    return data;
  }

  /**
   * Remove the video recording URL from each test run within a suite
   * execution's tests, which SFT does not need.
   */
  private stripSuiteVideoUrls(data: Record<string, unknown>): void {
    const testsData = (data.tests as Record<string, unknown> | undefined)?.data;
    if (!Array.isArray(testsData)) {
      return;
    }
    for (const test of testsData as Record<string, unknown>[]) {
      if (Array.isArray(test.runs)) {
        for (const run of test.runs as Record<string, unknown>[]) {
          run.videoUrl = undefined;
        }
      }
    }
  }
}
