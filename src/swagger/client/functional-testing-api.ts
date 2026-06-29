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

  async listSuiteExecutions(
    args: ListFunctionalTestingSuiteExecutionsParams,
  ): Promise<ListSuiteExecutionsResponse> {
    if (!args.suiteId) throw new ToolError("suiteId argument is required");

    const response = await fetch(
      `${this.baseUrl}/suites/${args.suiteId}/executions`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(suiteExecutionsErrorMessage(response));
    }

    return response.json();
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
