import { ToolError } from "../../common/tools";
import type {
  GetFunctionalTestingExecutionParams,
  RunFunctionalTestingTestParams,
} from "./functional-testing-types";

const API_HOSTNAME_DEV = "localhost:8900";
const API_HOSTNAME = "api.reflect.run";

export const FUNCTIONAL_TESTING_API_KEY_HEADER = "X-API-KEY";

export class FunctionalTestingAPI {
  private urlBase: string | undefined;

  constructor(
    private readonly getToken: () => string | null,
    private readonly userAgent: string,
  ) {}

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
    const response = await fetch(`${this.getUrlBase()}/tests`, {
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
      `${this.getUrlBase()}/tests/${args.testId}/executions`,
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

  async getExecution(
    args: GetFunctionalTestingExecutionParams,
  ): Promise<unknown> {
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await fetch(
      `${this.getUrlBase()}/executions/${args.executionId}`,
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

  /**
   * Get the URL base for API calls. When running against a local environment (NODE_ENV: development),
   * the endpoints are exposed at the `/api` path. When running against production, the endpoints
   * are exposed at `/v1`.
   *
   * If NODE_ENV is anything other than `development`, defaults to the production URL
   */
  private getUrlBase(): string {
    if (!this.urlBase) {
      this.urlBase =
        process.env.NODE_ENV === "development"
          ? `http://${API_HOSTNAME_DEV}/api`
          : `https://${API_HOSTNAME}/v1`;
    }

    return this.urlBase;
  }
}
