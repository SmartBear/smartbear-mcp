import { appendClientIdentity } from "../../common/info";
import { ToolError } from "../../common/tools";
import type {
  CancelFunctionalTestingSuiteExecutionParams,
  CreateFunctionalTestingSuiteParams,
  CreateFunctionalTestingSuiteResponse,
  CreateFunctionalTestingTestParams,
  CreateFunctionalTestingTestResponse,
  GetFunctionalTestHistoryParams,
  GetFunctionalTestingExecutionTestParams,
  GetFunctionalTestingSuiteExecutionParams,
  ListFunctionalTestingSuiteExecutionsParams,
  ListSuiteExecutionsResponse,
  ListSuitesApiResponse,
  ListSuitesResponse,
  ListTestsResponse,
  RunFunctionalTestingSuiteParams,
  RunFunctionalTestingTestParams,
  TestRunHistoryResponse,
} from "./functional-testing-types";

const API_HOSTNAME = "api.reflect.run";

export const FUNCTIONAL_TESTING_API_KEY_HEADER = "X-API-KEY";

// SFT API responses identify the suite by `suiteId`,
// renaming the field to avoid suiteId / slug confusion.
function renameSuiteIdToSlug(
  data: Record<string, unknown>,
): Record<string, unknown> {
  if ("suiteId" in data) {
    const { suiteId, ...rest } = data;
    return { ...rest, slug: suiteId };
  }
  return data;
}

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
      "User-Agent": appendClientIdentity(this.userAgent),
    };
  }

  /**
   * Wrapper around the fetch function for the Functional Testing API. It generates the full URL and performs
   * common error handling.
   * @param relativePath Path of the resource to fetch relative to the base URL
   * @param init RequestInit passed to the fetch function
   * @param onFailure Handler that generates the error message for failed responses
   * @returns Response having asserted it has not failed (status is 2xx)
   */
  private async ftFetch(
    relativePath: string,
    init: RequestInit,
    onFailure: ErrorMessageFn,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${relativePath}`, init);
    } catch (err: any) {
      // An exception being thrown by fetch() can happen for networking or TLS issues. Attempt to
      // extract the code to include it in the error message.
      const code = err.cause?.code;
      if (code) {
        throw new ToolError(
          `Failed to reach Swagger Functional Testing API: ${code}. Please verify your settings and network connectivity.`,
        );
      }

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
      throw new ToolError(onFailure(response));
    }

    return response;
  }

  async createTest(
    args: CreateFunctionalTestingTestParams,
  ): Promise<CreateFunctionalTestingTestResponse> {
    const {
      type: _type,
      steps,
      ...rest
    } = args as Record<string, unknown> & {
      steps?: unknown[];
    };
    const sanitizedSteps = steps?.map((step) => {
      const { type: _stepType, ...stepRest } = step as Record<string, unknown>;
      return { ...stepRest, type: "api" };
    });
    const response = await this.ftFetch(
      `tests`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
        body: JSON.stringify({
          ...rest,
          type: "api",
          steps: sanitizedSteps,
        }),
      },
      errorMessageFor(`create Functional Testing test`),
    );

    return response.json();
  }

  async listTests(): Promise<ListTestsResponse> {
    const response = await this.ftFetch(
      `tests`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      errorMessageFor(`list Functional Testing tests`),
    );

    return response.json();
  }

  async runTest(args: RunFunctionalTestingTestParams): Promise<unknown> {
    if (!args.testId) throw new ToolError("testId argument is required");

    const response = await this.ftFetch(
      `tests/${encodeURIComponent(args.testId)}/executions`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
      },
      errorMessageFor(`run test`),
    );

    return response.json();
  }

  async getTestExecution(
    args: GetFunctionalTestingExecutionTestParams,
  ): Promise<unknown> {
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await this.ftFetch(
      `executions/${encodeURIComponent(args.executionId)}`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      errorMessageFor("get test status"),
    );

    const data = (await response.json()) as Record<string, unknown>;
    // Reflect API returns video recording URL for each test run, which SFT does not need so we remove it.
    if (Array.isArray(data.tests)) {
      for (const test of data.tests as Record<string, unknown>[]) {
        const run = test.run as Record<string, unknown> | undefined;
        if (run) {
          delete run.videoUrl;
        }
      }
    }
    return data;
  }

  async listSuiteExecutions(
    args: ListFunctionalTestingSuiteExecutionsParams,
  ): Promise<ListSuiteExecutionsResponse> {
    if (!args.slug) throw new ToolError("slug argument is required");

    const response = await this.ftFetch(
      `suites/${encodeURIComponent(args.slug)}/executions`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      handleStatus(
        new Map([
          // Defensive: the Reflect API currently returns 200 with an empty
          // `executions.data` list for an unknown slug rather than a 404, so this
          // branch is not expected to fire today. Kept in case the API starts
          // returning 404 for missing suites.
          [
            404,
            "Test suite not found. Verify the slug is correct and belongs to your workspace.",
          ],
        ]),
        errorMessageFor("list suite executions"),
      ),
    );

    const data: ListSuiteExecutionsResponse = await response.json();
    return {
      slug: args.slug,
      executions: {
        data: data.executions.data.map(
          ({ executionId, status, isFinished, url }) => ({
            executionId,
            status,
            isFinished,
            url,
          }),
        ),
      },
    };
  }

  async createSuite(
    args: CreateFunctionalTestingSuiteParams,
  ): Promise<CreateFunctionalTestingSuiteResponse> {
    const response = await this.ftFetch(
      `suites`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
        body: JSON.stringify({
          name: args.name,
          agentName: args.agentName,
          runApiTests: args.runApiTests,
        }),
      },
      errorMessageFor("create Functional Testing suite"),
    );

    const data: CreateFunctionalTestingSuiteResponse = await response.json();
    return {
      slug: data.slug,
      url: data.url,
    };
  }

  async listSuites(): Promise<ListSuitesResponse> {
    const response = await this.ftFetch(
      `suites`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      errorMessageFor("list Functional Testing suites"),
    );

    const data: ListSuitesApiResponse = await response.json();
    return {
      suites: data.suites.data.map(({ name, suiteId, created }) => ({
        name,
        slug: suiteId,
        created,
      })),
    };
  }

  async cancelSuiteExecution(
    args: CancelFunctionalTestingSuiteExecutionParams,
  ): Promise<unknown> {
    if (!args.slug) throw new ToolError("slug argument is required");
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await this.ftFetch(
      `suites/${encodeURIComponent(args.slug)}/executions/${encodeURIComponent(args.executionId)}/cancel`,
      {
        method: "PATCH",
        headers: this.getFtHeaders(),
      },
      handleStatus(
        new Map([
          [
            404,
            "Suite execution not found. Verify the slug and executionId are correct and belong to your workspace.",
          ],
          [
            409,
            "Suite execution cannot be cancelled because it has already finished.",
          ],
        ]),
        errorMessageFor("cancel suite execution"),
      ),
    );

    return renameSuiteIdToSlug(
      (await response.json()) as Record<string, unknown>,
    );
  }

  async runSuite(args: RunFunctionalTestingSuiteParams): Promise<unknown> {
    if (!args.slug) throw new ToolError("slug argument is required");

    const body = args.tunnelAgentName
      ? JSON.stringify({
          overrides: { agent: { name: args.tunnelAgentName } },
        })
      : undefined;

    const response = await this.ftFetch(
      `suites/${args.slug}/executions`,
      {
        method: "POST",
        headers: this.getFtHeaders(),
        body,
      },
      errorMessageFor("run suite"),
    );

    return renameSuiteIdToSlug(
      (await response.json()) as Record<string, unknown>,
    );
  }

  async getSuiteExecution(
    args: GetFunctionalTestingSuiteExecutionParams,
  ): Promise<unknown> {
    if (!args.slug) throw new ToolError("slug argument is required");
    if (!args.executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await this.ftFetch(
      `suites/${args.slug}/executions/${args.executionId}`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      errorMessageFor("get suite execution status"),
    );

    const data = (await response.json()) as Record<string, unknown>;
    // Reflect API returns video recording URL for each test run within suite, which SFT does not need so we remove it.
    const testsData = (data.tests as Record<string, unknown> | undefined)?.data;
    if (Array.isArray(testsData)) {
      for (const test of testsData as Record<string, unknown>[]) {
        if (Array.isArray(test.runs)) {
          for (const run of test.runs as Record<string, unknown>[]) {
            delete run.videoUrl;
          }
        }
      }
    }
    return renameSuiteIdToSlug(data);
  }

  async getTestHistory(
    args: GetFunctionalTestHistoryParams,
  ): Promise<TestRunHistoryResponse> {
    if (!args.testId) throw new ToolError("testId argument is required");

    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    if (args.offset !== undefined) params.set("offset", String(args.offset));
    const query = params.toString() ? `?${params.toString()}` : "";

    const response = await this.ftFetch(
      `tests/${encodeURIComponent(args.testId)}/runs${query}`,
      {
        method: "GET",
        headers: this.getFtHeaders(),
      },
      handleStatus(
        new Map([
          [404, "Test not found. Verify the testId belongs to your workspace."],
        ]),
        errorMessageFor("get test execution history"),
      ),
    );

    return response.json();
  }
}

/**
 * Maps a failed (status code other than 2xx) HTTP response to a string explaining the failure.
 */
type ErrorMessageFn = (response: Response) => string;

/**
 * Returns an error message handler that selects the message to return based on the
 * response's status code. If no match is found, delegates on the default function
 * @param messages Map associating status code -> error message
 * @param defaultMessage Default function if no entry is found in the map for the responses status code
 */
function handleStatus(
  messages: Map<number, string>,
  defaultMessage: ErrorMessageFn,
): ErrorMessageFn {
  return (response) =>
    messages.get(response.status) || defaultMessage(response);
}

/**
 * Returns an error message handler that renders a message based on the responses
 * status code, status text as well as the given operation. The operation is concatenated
 * so must not start with uppercase
 * @param operation description of the attempted operation
 */
function errorMessageFor(operation: string): ErrorMessageFn {
  return (response) =>
    `Failed to ${operation}: ${response.status} ${response.statusText}`;
}
