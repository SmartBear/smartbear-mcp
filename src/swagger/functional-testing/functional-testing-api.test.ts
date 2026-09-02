import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { FunctionalTestingAPI } from "../client/functional-testing-api";
import {
  CreateFunctionalTestingSuiteParamsSchema,
  CreateFunctionalTestingTestParamsSchema,
} from "../client/functional-testing-types";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testsMock = {
  tests: [
    {
      id: 1,
      name: "Login Test",
      created: 1719400000000,
      tags: [],
      folders: [],
      url: "https://app.reflect.run/tests/1/definition?accountId=42",
    },
    {
      id: 2,
      name: "Checkout Test",
      created: 1719500000000,
      tags: [],
      folders: [],
      url: "https://app.reflect.run/tests/2/definition?accountId=42",
    },
  ],
};

const UNREACHABLE_MESSAGE =
  "Swagger Functional Testing service is currently unreachable. Retry after a moment.";

const AUTH_FAILED_MESSAGE =
  "Authentication failed. Verify your API token is valid and has not expired.";

const suitesResponseMock = {
  suites: {
    data: [
      {
        name: "Smoke Suite",
        suiteId: "smoke-suite",
        created: 1719400000000,
      },
      {
        name: "Regression Suite",
        suiteId: "regression-suite",
        created: 1719500000000,
      },
    ],
  },
};

const suitesResponseExpected = {
  suites: suitesResponseMock.suites.data.map(({ name, suiteId, created }) => ({
    name,
    slug: suiteId,
    created,
  })),
};

describe("FunctionalTestingAPI", () => {
  let api: FunctionalTestingAPI;

  beforeEach(() => {
    fetchMock.resetMocks();
    api = new FunctionalTestingAPI(
      () => "test-api-key",
      "SmartBear MCP Server/test",
    );
  });

  describe("createTest", () => {
    const createResponseMock = {
      id: 12345,
      url: "https://app.reflect.run/tests/12345/definition?accountId=54321",
    };

    it("should POST to the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({ name: "My New Test" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should inject type: api at top level of request body", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({ name: "My New Test" });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.type).toBe("api");
      expect(body.name).toBe("My New Test");
    });

    it("should inject type: api into each step", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "My New Test",
        steps: [
          { url: "https://example.com/api", httpMethod: "GET" },
          { url: "https://example.com/api/users", httpMethod: "POST" },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].type).toBe("api");
      expect(body.steps[1].type).toBe("api");
      expect(body.steps[0].url).toBe("https://example.com/api");
      expect(body.steps[0].httpMethod).toBe("GET");
      expect(body.steps[1].url).toBe("https://example.com/api/users");
      expect(body.steps[1].httpMethod).toBe("POST");
    });

    it("should forward all step fields to the request body", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Full Test",
        description: "Test description",
        steps: [
          {
            url: "https://example.com/api",
            httpMethod: "POST",
            requestBody: '{"key":"value"}',
            requestHeaders: [{ name: "X-Custom", value: "abc" }],
            followRedirects: true,
            description: "Step 1",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toMatchObject({
        name: "Full Test",
        description: "Test description",
        type: "api",
        steps: [
          {
            type: "api",
            url: "https://example.com/api",
            httpMethod: "POST",
            requestBody: '{"key":"value"}',
            requestHeaders: [{ name: "X-Custom", value: "abc" }],
            followRedirects: true,
            description: "Step 1",
          },
        ],
      });
    });

    it("should not allow caller to override the injected type", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      const rogueArgs: any = {
        name: "Override Test",
        type: "browser",
        steps: [{ url: "https://example.com", type: "click" }],
      };
      await api.createTest(rogueArgs);

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.type).toBe("api");
      expect(body.steps[0].type).toBe("api");
    });

    it("should handle test with no steps", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({ name: "Empty Test" });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps).toBeUndefined();
    });

    it("should return the new test id and url", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      const result = await api.createTest({ name: "My New Test" });

      expect(result).toEqual(createResponseMock);
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(api.createTest({ name: "My New Test" })).rejects.toThrow(
        "Failed to create Functional Testing test",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.createTest({ name: "My New Test" })).rejects.toThrow(
        UNREACHABLE_MESSAGE,
      );
    });

    it("should forward assertions.statusCodes on a step", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Status Code Test",
        steps: [
          {
            url: "https://example.com/api",
            httpMethod: "GET",
            assertions: { statusCodes: [{ start: 200, end: 299 }] },
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].assertions.statusCodes).toEqual([
        { start: 200, end: 299 },
      ]);
    });

    it("forwards assertions.bodyRules paths in bracket notation", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      const args = CreateFunctionalTestingTestParamsSchema.parse({
        name: "Body Rule Test",
        steps: [
          {
            url: "https://example.com/api",
            baseUrl: "https://example.com",
            httpMethod: "POST",
            assertions: {
              bodyRules: [
                {
                  path: '["data"]["name"]',
                  assertionType: "string",
                  operator: "eq",
                  target: "Alice",
                },
                {
                  path: '["data"]["token"]',
                  assertionType: "regex",
                  pattern: "nonempty",
                },
              ],
            },
          },
        ],
      });

      await api.createTest(args);

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].assertions.bodyRules).toEqual([
        {
          path: '["data"]["name"]',
          assertionType: "string",
          operator: "eq",
          target: "Alice",
        },
        {
          path: '["data"]["token"]',
          assertionType: "regex",
          pattern: "nonempty",
        },
      ]);
    });

    it("should forward assertions.bodyType on a step", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Body Type Test",
        steps: [
          {
            url: "https://example.com/api",
            httpMethod: "GET",
            assertions: {
              bodyType: "xml",
              bodyRules: [
                {
                  path: '["root"]["item"]',
                  assertionType: "string",
                  operator: "contains",
                  target: "foo",
                },
              ],
            },
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].assertions.bodyType).toBe("xml");
    });

    it("should forward status codes, body, bodyType and bodyRules under assertions", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Nested Assertion Test",
        steps: [
          {
            url: "https://example.com/api",
            httpMethod: "POST",
            assertions: {
              statusCodes: [{ start: 200, end: 299 }],
              body: '{"name":"doggie"}',
              bodyType: "json",
              bodyRules: [
                {
                  path: '["category"]["name"]',
                  assertionType: "string",
                  operator: "eq",
                  target: "Dogs",
                },
              ],
            },
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].assertions).toEqual({
        statusCodes: [{ start: 200, end: 299 }],
        body: '{"name":"doggie"}',
        bodyType: "json",
        bodyRules: [
          {
            path: '["category"]["name"]',
            assertionType: "string",
            operator: "eq",
            target: "Dogs",
          },
        ],
      });
    });
  });

  describe("createTest baseUrl templating", () => {
    const createResponseMock = {
      id: 12345,
      url: "https://app.reflect.run/tests/12345/definition?accountId=54321",
    };

    it("templates a step url with baseUrl and creates a base-URL parameter", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Petstore Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/pet/${var(petId)}",
      );
      expect(body.steps[0].baseUrl).toBeUndefined();
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "petId", value: "" },
      ]);
    });

    it("strips a trailing slash on baseUrl before templating", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Trailing Slash Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/1",
            baseUrl: "https://petstore.swagger.io/v2/",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe("${var(baseURLpetstoreswaggerio)}/pet/1");
    });

    it("reuses the same base-URL parameter for multiple steps sharing a baseUrl", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Petstore Multi Step Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
          {
            url: "https://petstore.swagger.io/v2/store/order/{orderId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/pet/${var(petId)}",
      );
      expect(body.steps[1].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/store/order/${var(orderId)}",
      );
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "petId", value: "" },
        { name: "orderId", value: "" },
      ]);
    });

    it("creates distinct base-URL parameters for multiple distinct base URLs", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Multi API Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
          {
            url: "https://api.example.com/v1/users/{userId}",
            baseUrl: "https://api.example.com/v1",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "petId", value: "" },
        { name: "baseURLapiexamplecom", value: "https://api.example.com/v1" },
        { name: "userId", value: "" },
      ]);
    });

    it("merges generated parameters with caller-supplied parameters", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "With Extra Param",
        parameters: [{ name: "apiKey", value: "secret" }],
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "petId", value: "" },
        { name: "apiKey", value: "secret" },
      ]);
    });

    it("binds the step to a caller-supplied parameter that already carries the generated base-URL name", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Name Collision Test",
        parameters: [{ name: "baseURLpetstoreswaggerio", value: "existing" }],
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/1",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.parameters).toEqual([
        { name: "baseURLpetstoreswaggerio", value: "existing" },
      ]);
      expect(body.steps[0].url).toBe("${var(baseURLpetstoreswaggerio)}/pet/1");
    });

    it("reuses the same base-URL parameter across steps whose baseUrl differs only by a trailing slash", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Trailing Slash Reuse Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/1",
            baseUrl: "https://petstore.swagger.io/v2",
          },
          {
            url: "https://petstore.swagger.io/v2/store/order/1",
            baseUrl: "https://petstore.swagger.io/v2/",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe("${var(baseURLpetstoreswaggerio)}/pet/1");
      expect(body.steps[1].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/store/order/1",
      );
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
      ]);
    });

    it("binds a path param to a caller-supplied parameter of the same name, across all steps sharing that path param", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Path Param Collision Test",
        parameters: [{ name: "petId", value: "10" }],
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
          {
            url: "https://petstore.swagger.io/v2/pet/{petId}/uploadImage",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/pet/${var(petId)}",
      );
      expect(body.steps[1].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/pet/${var(petId)}/uploadImage",
      );
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "petId", value: "10" },
      ]);
    });

    it("leaves steps without baseUrl untouched", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "No BaseUrl Test",
        steps: [{ url: "https://example.com/api/users" }],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe("https://example.com/api/users");
      expect(body.parameters).toBeUndefined();
    });

    it("throws a ToolError when the step url does not start with baseUrl", async () => {
      await expect(
        api.createTest({
          name: "Mismatched Base Test",
          steps: [
            {
              url: "https://other.example.com/pet/1",
              baseUrl: "https://petstore.swagger.io/v2",
            },
          ],
        }),
      ).rejects.toThrow(
        'Step url "https://other.example.com/pet/1" must start with its baseUrl "https://petstore.swagger.io/v2"',
      );
    });

    it("templates the url as the base-URL variable alone when url equals baseUrl exactly", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Root Path Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe("${var(baseURLpetstoreswaggerio)}/");
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
      ]);
    });

    it("maps the same path-param name across different resource paths to the same variable", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createResponseMock));

      await api.createTest({
        name: "Shared Path Param Test",
        steps: [
          {
            url: "https://petstore.swagger.io/v2/pet/{id}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
          {
            url: "https://petstore.swagger.io/v2/order/{id}",
            baseUrl: "https://petstore.swagger.io/v2",
          },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.steps[0].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/pet/${var(id)}",
      );
      expect(body.steps[1].url).toBe(
        "${var(baseURLpetstoreswaggerio)}/order/${var(id)}",
      );
      expect(body.parameters).toEqual([
        {
          name: "baseURLpetstoreswaggerio",
          value: "https://petstore.swagger.io/v2",
        },
        { name: "id", value: "" },
      ]);
    });
  });

  describe("listTests", () => {
    it("should call the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testsMock));

      await api.listTests();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testsMock));

      const result = await api.listTests();

      expect(result).toEqual(testsMock);
    });

    it("should return empty tests list when no tests exist", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ tests: [] }));

      const result = await api.listTests();

      expect(result).toEqual({ tests: [] });
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(api.listTests()).rejects.toThrow(
        "Failed to list Functional Testing tests",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.listTests()).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("runTest", () => {
    const executionMock = { executionId: "42", status: "running" };

    it("should call the correct endpoint with POST method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runTest({ testId: "94" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests/94/executions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.runTest({ testId: "94" });

      expect(result).toEqual(executionMock);
    });

    it("should throw ToolError when testId is missing", async () => {
      await expect(api.runTest({ testId: "" })).rejects.toThrow(
        "testId argument is required",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(api.runTest({ testId: "94" })).rejects.toThrow(
        "Failed to run test",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.runTest({ testId: "94" })).rejects.toThrow(
        UNREACHABLE_MESSAGE,
      );
    });
  });

  describe("getTestExecution", () => {
    const executionMock = { executionId: "42", status: "passed" };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.getTestExecution({ executionId: "42" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/executions/42",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.getTestExecution({ executionId: "42" });

      expect(result).toEqual(executionMock);
    });

    it("should strip videoUrl from nested test run", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...executionMock,
          tests: [
            {
              testId: 1,
              run: {
                runId: 10,
                status: "passed",
                videoUrl: "https://cdn.reflect.run/video/42.mp4",
              },
            },
          ],
        }),
      );

      const result = await api.getTestExecution({ executionId: "42" });
      const tests = (result as Record<string, unknown>).tests as Record<
        string,
        unknown
      >[];
      const run = tests[0].run as Record<string, unknown>;

      expect(run.videoUrl).toBeUndefined();
      expect(run.runId).toBe(10);
      expect((result as Record<string, unknown>).executionId).toBe("42");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(api.getTestExecution({ executionId: "" })).rejects.toThrow(
        "executionId argument is required",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(api.getTestExecution({ executionId: "42" })).rejects.toThrow(
        "Failed to get test status",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.getTestExecution({ executionId: "42" })).rejects.toThrow(
        UNREACHABLE_MESSAGE,
      );
    });
  });

  describe("listSuiteExecutions", () => {
    const suiteExecutionsMock = {
      slug: "regression-tests",
      executions: {
        data: [
          { executionId: 12, status: "pending", isFinished: false },
          { executionId: 47, status: "passed", isFinished: true },
          { executionId: 30, status: "failed", isFinished: true },
        ],
      },
    };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionsMock));

      await api.listSuiteExecutions({ slug: "regression-tests" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/regression-tests/executions",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return executions in the order the API returns them", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionsMock));

      const result = (await api.listSuiteExecutions({
        slug: "regression-tests",
      })) as typeof suiteExecutionsMock;

      expect(result.executions.data.map((e) => e.executionId)).toEqual([
        12, 47, 30,
      ]);
    });

    it("should return empty list as-is when no executions exist", async () => {
      const empty = { slug: "regression-tests", executions: { data: [] } };
      fetchMock.mockResponseOnce(JSON.stringify(empty));

      const result = await api.listSuiteExecutions({
        slug: "regression-tests",
      });

      expect(result).toEqual(empty);
    });

    it("should throw ToolError when slug is missing", async () => {
      await expect(api.listSuiteExecutions({ slug: "" })).rejects.toThrow(
        "slug argument is required",
      );
    });

    it("should map 404 to a suite-not-found message", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(
        api.listSuiteExecutions({ slug: "missing" }),
      ).rejects.toThrow(
        "Test suite not found. Verify the slug is correct and belongs to your workspace.",
      );
    });

    it("should fall back to a generic message for other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Boom", { status: 500 });

      await expect(
        api.listSuiteExecutions({ slug: "regression-tests" }),
      ).rejects.toThrow("Failed to list suite executions: 500");
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.listSuiteExecutions({ slug: "regression-tests" }),
      ).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("cancelSuiteExecution", () => {
    const cancelledMock = {
      suiteId: "regression-tests",
      executionId: 47,
      status: "cancelled",
      isFinished: true,
    };

    it("should call the correct endpoint with PATCH method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(cancelledMock));

      await api.cancelSuiteExecution({
        slug: "regression-tests",
        executionId: "47",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/regression-tests/executions/47/cancel",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response with suiteId renamed to slug", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(cancelledMock));

      const result = await api.cancelSuiteExecution({
        slug: "regression-tests",
        executionId: "47",
      });

      expect(result).toEqual({
        executionId: 47,
        status: "cancelled",
        isFinished: true,
        slug: "regression-tests",
      });
      expect(result).not.toHaveProperty("suiteId");
    });

    it("should throw ToolError when slug is missing", async () => {
      await expect(
        api.cancelSuiteExecution({ slug: "", executionId: "47" }),
      ).rejects.toThrow("slug argument is required");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(
        api.cancelSuiteExecution({
          slug: "regression-tests",
          executionId: "",
        }),
      ).rejects.toThrow("executionId argument is required");
    });

    it("should map 404 to a not-found message", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(
        api.cancelSuiteExecution({ slug: "missing", executionId: "47" }),
      ).rejects.toThrow(
        "Suite execution not found. Verify the slug and executionId are correct and belong to your workspace.",
      );
    });

    it("should map 409 to an already-finished message", async () => {
      fetchMock.mockResponseOnce("Conflict", { status: 409 });

      await expect(
        api.cancelSuiteExecution({
          slug: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow(
        "Suite execution cannot be cancelled because it has already finished.",
      );
    });

    it("should fall back to a generic message for other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Boom", { status: 500 });

      await expect(
        api.cancelSuiteExecution({
          slug: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow("Failed to cancel suite execution: 500");
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.cancelSuiteExecution({
          slug: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("ftFetch network error with cause code", () => {
    it("should include the cause code in the error message when fetch throws with err.cause.code", async () => {
      const err = new Error("connect ECONNREFUSED 127.0.0.1:443");
      (err as any).cause = { code: "ECONNREFUSED" };
      fetchMock.mockRejectOnce(err);

      await expect(api.listTests()).rejects.toThrow(
        "Failed to reach Swagger Functional Testing API: ECONNREFUSED. Please verify your settings and network connectivity",
      );
    });
  });

  describe("ftFetch authentication errors", () => {
    it("should map 401 responses to an auth-failed message", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.listTests()).rejects.toThrow(AUTH_FAILED_MESSAGE);
    });

    it("should map 403 responses to an auth-failed message", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.listTests()).rejects.toThrow(AUTH_FAILED_MESSAGE);
    });
  });

  describe("createSuite", () => {
    const createSuiteResponseMock = {
      slug: "nightly-api-regression",
      url: "https://app.reflect.run/suites/nightly-api-regression?accountId=1",
    };

    it("should POST to the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createSuiteResponseMock));

      await api.createSuite({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101, 102] }],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
          body: JSON.stringify({
            name: "Nightly API Regression",
            runApiTests: [{ testIds: [101, 102] }],
          }),
        }),
      );
    });

    it("should forward agentName and per-block parallel/maxRetryAttempts/title", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createSuiteResponseMock));

      await api.createSuite({
        name: "Nightly API Regression",
        agentName: "my-tunnel-agent",
        runApiTests: [
          {
            testIds: [101, 102],
            parallel: true,
            maxRetryAttempts: 2,
            title: "Smoke",
          },
          { testIds: [201] },
        ],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({
        name: "Nightly API Regression",
        agentName: "my-tunnel-agent",
        runApiTests: [
          {
            testIds: [101, 102],
            parallel: true,
            maxRetryAttempts: 2,
            title: "Smoke",
          },
          { testIds: [201] },
        ],
      });
    });

    it("should return the created suite", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createSuiteResponseMock));

      const result = await api.createSuite({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101, 102] }],
      });

      expect(result).toEqual(createSuiteResponseMock);
    });

    it("should send a minimal body for a single test in a single block with no optional fields", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(createSuiteResponseMock));

      await api.createSuite({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101] }],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101] }],
      });
      expect(body.agentName).toBeUndefined();
      expect(body.runApiTests[0].parallel).toBeUndefined();
      expect(body.runApiTests[0].maxRetryAttempts).toBeUndefined();
      expect(body.runApiTests[0].title).toBeUndefined();
    });

    it("should throw ToolError with the server message on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(
        api.createSuite({
          name: "Nightly API Regression",
          runApiTests: [{ testIds: [1] }],
        }),
      ).rejects.toThrow("Failed to create Functional Testing suite");
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.createSuite({
          name: "Nightly API Regression",
          runApiTests: [{ testIds: [1] }],
        }),
      ).rejects.toThrow(UNREACHABLE_MESSAGE);
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(
        api.createSuite({
          name: "Nightly API Regression",
          runApiTests: [{ testIds: [1] }],
        }),
      ).rejects.toThrow(AUTH_FAILED_MESSAGE);
    });
  });

  describe("CreateFunctionalTestingSuiteParamsSchema", () => {
    it("should accept blocks with distinct titles", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [
          { testIds: [101], title: "Smoke" },
          { testIds: [201], title: "Regression" },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should accept multiple blocks without a title", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101] }, { testIds: [201] }],
      });

      expect(result.success).toBe(true);
    });

    it("should reject duplicate block titles", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [
          { testIds: [101], title: "Smoke" },
          { testIds: [201], title: "Smoke" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Duplicate block title "Smoke"',
        );
        expect(result.error.issues[0].path).toEqual([
          "runApiTests",
          1,
          "title",
        ]);
      }
    });

    it("should reject a duplicate title anywhere in the suite, not just between adjacent blocks", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [
          { testIds: [101], title: "Smoke" },
          { testIds: [201] },
          { testIds: [301], title: "Smoke" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual([
          "runApiTests",
          2,
          "title",
        ]);
      }
    });

    it("should reject an empty name", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "",
        runApiTests: [{ testIds: [101] }],
      });

      expect(result.success).toBe(false);
    });

    it("should reject a missing runApiTests", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
      });

      expect(result.success).toBe(false);
    });

    it("should reject an empty runApiTests array", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [],
      });

      expect(result.success).toBe(false);
    });

    it("should reject a block with an empty testIds array", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [] }],
      });

      expect(result.success).toBe(false);
    });

    it("should reject maxRetryAttempts below 0", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101], maxRetryAttempts: -1 }],
      });

      expect(result.success).toBe(false);
    });

    it("should reject maxRetryAttempts above 3", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101], maxRetryAttempts: 4 }],
      });

      expect(result.success).toBe(false);
    });

    it("should accept maxRetryAttempts within the 0-3 range", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        runApiTests: [{ testIds: [101], maxRetryAttempts: 3 }],
      });

      expect(result.success).toBe(true);
    });

    it("should reject an empty agentName", () => {
      const result = CreateFunctionalTestingSuiteParamsSchema.safeParse({
        name: "Nightly API Regression",
        agentName: "",
        runApiTests: [{ testIds: [101] }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("listSuites", () => {
    it("should call the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suitesResponseMock));

      await api.listSuites();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response with suiteId renamed to slug", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suitesResponseMock));

      const result = await api.listSuites();

      expect(result).toEqual(suitesResponseExpected);
      for (const suite of result.suites) {
        expect(suite).not.toHaveProperty("suiteId");
      }
    });

    it("should return an empty suites list when no suites exist", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ suites: { data: [] } }));

      const result = await api.listSuites();

      expect(result).toEqual({ suites: [] });
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.listSuites()).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.listSuites()).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an error with the response status on other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Server Error", { status: 503 });

      await expect(api.listSuites()).rejects.toThrow(
        "Failed to list Functional Testing suites",
      );
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.listSuites()).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("runSuite", () => {
    const executionMock = {
      suiteId: "checkout-suite",
      executionId: "7",
      status: "pending",
    };

    it("should call the correct endpoint with POST method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({ slug: "checkout-suite" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should not send a request body when no tunnelAgentName is provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({ slug: "checkout-suite" });

      const [, init] = fetchMock.mock.calls[0];
      expect((init as RequestInit | undefined)?.body).toBeUndefined();
    });

    it("should send tunnel agent override body when tunnelAgentName is provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({
        slug: "checkout-suite",
        tunnelAgentName: "my-tunnel",
      });

      const [, init] = fetchMock.mock.calls[0];
      expect((init as RequestInit | undefined)?.body).toBe(
        JSON.stringify({
          overrides: { agent: { name: "my-tunnel" } },
        }),
      );
    });

    it("should return parsed JSON response with suiteId renamed to slug", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.runSuite({ slug: "checkout-suite" });

      expect(result).toEqual({
        executionId: "7",
        status: "pending",
        slug: "checkout-suite",
      });
      expect(result).not.toHaveProperty("suiteId");
    });

    it("should include url field in response", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...executionMock,
          url: "https://app.reflect.run/suites/checkout-suite/executions/7",
        }),
      );

      const result = await api.runSuite({ slug: "checkout-suite" });

      expect((result as Record<string, unknown>).url).toBe(
        "https://app.reflect.run/suites/checkout-suite/executions/7",
      );
    });

    it("should throw ToolError when slug is missing", async () => {
      await expect(api.runSuite({ slug: "" })).rejects.toThrow(
        "slug argument is required",
      );
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.runSuite({ slug: "checkout-suite" })).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.runSuite({ slug: "checkout-suite" })).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(api.runSuite({ slug: "checkout-suite" })).rejects.toThrow(
        "Failed to run suite",
      );
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.runSuite({ slug: "checkout-suite" })).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("getSuiteExecution", () => {
    const suiteExecutionMock = {
      suiteId: "checkout-suite",
      executionId: "7",
      isFinished: true,
      status: "passed",
      tests: [],
    };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionMock));

      await api.getSuiteExecution({
        slug: "checkout-suite",
        executionId: "7",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions/7",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response with suiteId renamed to slug", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionMock));

      const result = await api.getSuiteExecution({
        slug: "checkout-suite",
        executionId: "7",
      });

      expect(result).toEqual({
        executionId: "7",
        isFinished: true,
        status: "passed",
        tests: [],
        slug: "checkout-suite",
      });
      expect(result).not.toHaveProperty("suiteId");
    });

    it("should include url field in response", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...suiteExecutionMock,
          url: "https://app.reflect.run/suites/checkout-suite/executions/7",
        }),
      );

      const result = await api.getSuiteExecution({
        slug: "checkout-suite",
        executionId: "7",
      });

      expect((result as Record<string, unknown>).url).toBe(
        "https://app.reflect.run/suites/checkout-suite/executions/7",
      );
    });

    it("should strip videoUrl from each run in tests.data array", async () => {
      const mockWithTests = {
        ...suiteExecutionMock,
        tests: {
          data: [
            {
              id: "test-1",
              status: "passed",
              runs: [
                { runId: 1, videoUrl: "https://cdn.reflect.run/video/1.mp4" },
              ],
            },
            {
              id: "test-2",
              status: "failed",
              runs: [
                { runId: 2, videoUrl: "https://cdn.reflect.run/video/2.mp4" },
              ],
            },
          ],
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockWithTests));

      const result = await api.getSuiteExecution({
        slug: "checkout-suite",
        executionId: "7",
      });

      const testsData = (
        (result as Record<string, unknown>).tests as Record<string, unknown>
      ).data as Record<string, unknown>[];
      const runs0 = testsData[0].runs as Record<string, unknown>[];
      const runs1 = testsData[1].runs as Record<string, unknown>[];
      expect(runs0[0].videoUrl).toBeUndefined();
      expect(runs1[0].videoUrl).toBeUndefined();
      expect(testsData[0].id).toBe("test-1");
      expect(testsData[1].id).toBe("test-2");
    });

    it("should throw ToolError when slug is missing", async () => {
      await expect(
        api.getSuiteExecution({ slug: "", executionId: "7" }),
      ).rejects.toThrow("slug argument is required");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(
        api.getSuiteExecution({ slug: "checkout-suite", executionId: "" }),
      ).rejects.toThrow("executionId argument is required");
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(
        api.getSuiteExecution({
          slug: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(
        api.getSuiteExecution({
          slug: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(
        api.getSuiteExecution({
          slug: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow("Failed to get suite execution status");
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.getSuiteExecution({
          slug: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("getFtHeaders", () => {
    it("should return headers with X-API-KEY and Content-Type", () => {
      const headers = api.getFtHeaders();

      expect(headers["X-API-KEY"]).toBe("test-api-key");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("SmartBear MCP Server/test");
    });

    it("should throw ToolError when no token is available", () => {
      const apiWithNoToken = new FunctionalTestingAPI(
        () => null,
        "SmartBear MCP Server/test",
      );

      expect(() => apiWithNoToken.getFtHeaders()).toThrow(
        "Swagger Functional Testing API token not found",
      );
    });
  });
});
