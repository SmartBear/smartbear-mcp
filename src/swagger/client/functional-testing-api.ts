import { ToolError } from "../../common/tools";
import type {
  GetFunctionalTestingExecutionTestParams,
  ListFunctionalTestingSuiteExecutionsParams,
  ListSuiteExecutionsResponse,
  RunFunctionalTestingTestParams,
} from "./functional-testing-types";

const API_HOSTNAME = "api.reflect.run";

export const FUNCTIONAL_TESTING_API_KEY_HEADER = "X-API-KEY";

export class FunctionalTestingAPI {
  private baseUrl: string;

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

  private async ftFetch(input: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(input, init);
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
    if (!args.testId) throw new ToolError("testId argument is required");

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

    return response.json();
  }

  async listSuiteExecutions(
    args: ListFunctionalTestingSuiteExecutionsParams,
  ): Promise<ListSuiteExecutionsResponse> {
    if (!args.suiteId) throw new ToolError("suiteId argument is required");

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
        data: data.executions.data.map(({ executionId, status, isFinished }) => ({
          executionId,
          status,
          isFinished,
        })),
      },
    };
  }
}

function suiteExecutionsErrorMessage(response: Response): string {
  switch (response.status) {
    // Defensive: the Reflect API currently returns 200 with an empty
    // `executions.data` list for an unknown suiteId rather than a 404, so this
    // branch is not expected to fire today. Kept in case the API starts
    // returning 404 for missing suites.
    case 404:
      return "Test suite not found. Verify the suiteId is correct and belongs to your workspace.";
    default:
      return `Failed to list suite executions: ${response.status} ${response.statusText}`;
  }
}
