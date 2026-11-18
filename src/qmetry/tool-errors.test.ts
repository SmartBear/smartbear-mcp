import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import Bugsnag from "../common/bugsnag";
import { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import { QmetryClient } from "./client";
import { createQMetryApiError } from "./client/api/error-handler";

vi.mock("../common/bugsnag", () => ({
  default: { notify: vi.fn() },
}));

const fetchMock = createFetchMock(vi);

// End to end through the common tool wrapper (SmartBearMcpServer.addClient),
// with only fetch mocked: expected QMetry failures must come back to the model
// as `isError` results and must not be reported to BugSnag as bugs.
describe("QMetry tool errors through the common tool wrapper", () => {
  let wrappedTools: Map<string, (args: any, ctx: any) => Promise<any>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();

    const server = new SmartBearMcpServer();
    // Capture the wrapper the server registers with the SDK for each tool
    const superRegisterTool = vi
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(server)),
        "registerTool",
      )
      .mockImplementation(vi.fn());

    const client = new QmetryClient();
    await client.configure(server, {
      api_key: "fake-token",
      base_url: "https://qmetry.example",
    });
    await server.addClient(client);

    wrappedTools = new Map(
      superRegisterTool.mock.calls.map((c: any[]) => [c[1].title, c[2]]),
    );
    superRegisterTool.mockRestore();
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  const callTool = (title: string, args: Record<string, unknown>) => {
    const wrapped = wrappedTools.get(`QMetry: ${title}`);
    if (!wrapped) throw new Error(`Tool not registered: ${title}`);
    return wrapped(args, { mcpReq: {} });
  };

  it("returns isError for a QMetry API error and does not report it to BugSnag", async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        code: "CO.INVALID_API_KEY",
        message: "Invalid API key",
      }),
      { status: 401 },
    );

    const result = await callTool("Fetch QMetry Project Info", {
      projectKey: "MAC",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("QMetry API error 401 CO.INVALID_API_KEY");
    expect(text).toContain("Invalid API key");
    expect(text).toContain("Tool: qmetry_fetch_qmetry_project_info");
    expect(text).toContain("Hint: Check that the QMetry API key is valid");
    expect(text).not.toContain("fake-token");
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });

  it("returns isError for invalid tool input caught by the API client", async () => {
    const result = await callTool("Link Issues to Testcase Run", {
      projectKey: "MAC",
      issueIds: [],
      tcrId: 23450,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'issueIds'");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });

  it("returns isError for an HTML page served with 200 (e.g. SSO sign-in) and does not report it to BugSnag", async () => {
    fetchMock.mockResponse(
      "<!DOCTYPE html><html><body><h1>Sign in</h1></body></html>",
      { status: 200, headers: { "content-type": "text/html" } },
    );

    const result = await callTool("Link Issues to Testcase Run", {
      projectKey: "MAC",
      issueIds: [2038],
      tcrId: 23450,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "QMetry returned a non-JSON response",
    );
    expect(result.content[0].text).toContain("Response starts with: Sign in");
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });

  it("treats an empty 200 body as success", async () => {
    fetchMock.mockResponse("", { status: 200 });

    const result = await callTool("Link Issues to Testcase Run", {
      projectKey: "MAC",
      issueIds: [2038],
      tcrId: 23450,
    });

    expect(result).not.toHaveProperty("isError");
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });

  it("builds QMetry API errors as ToolErrors", () => {
    const error = createQMetryApiError(
      500,
      "Internal Server Error",
      "https://qmetry.example/rest/x",
    );

    expect(error).toBeInstanceOf(ToolError);
  });

  it("returns isError with QMetry's code, message and the folder ID for a missing folder", async () => {
    fetchMock.mockResponse((req) => {
      if (req.url.endsWith("/rest/testcases") && req.method === "POST") {
        return {
          status: 400,
          body: JSON.stringify({
            success: false,
            code: "CO.CREATE_ENTITY_IS_NOT_ALLOWED_AS_SELECTED_FOLDER_DOES_NOT_EXIST",
            message:
              "Create Test Case is not allowed as selected folder does not exist.",
          }),
        };
      }
      // Project info / UDF layout preflights: minimal valid answers
      return { status: 200, body: JSON.stringify({}) };
    });

    const result = await callTool("Create Test Case", {
      projectKey: "MAC",
      name: "Login works",
      tcFolderID: "999999",
      folderPath: "",
      steps: [{ orderId: 1, description: "Open the login page" }],
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain(
      "QMetry API error 400 CO.CREATE_ENTITY_IS_NOT_ALLOWED_AS_SELECTED_FOLDER_DOES_NOT_EXIST: Create Test Case is not allowed as selected folder does not exist.",
    );
    expect(text).toContain("Tool: qmetry_create_test_case");
    expect(text).toContain("projectKey=MAC");
    expect(text).toContain("tcFolderID=999999");
    expect(text).toContain("Hint: The folder ID does not exist");
    expect(text).not.toContain("Troubleshooting");
    expect(text).not.toContain("API key");
    expect(text).not.toContain("fake-token");
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });

  it("returns isError with a list-projects hint for an invalid project key", async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        success: false,
        code: "CO.INVALID_PROJECT_ID",
        message: "Invalid Project ID.",
      }),
      { status: 400 },
    );

    const result = await callTool("Fetch QMetry Project Info", {
      projectKey: "QMT",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain(
      "QMetry API error 400 CO.INVALID_PROJECT_ID: Invalid Project ID.",
    );
    expect(text).toContain("Tool: qmetry_fetch_qmetry_project_info");
    expect(text).toContain("Inputs: projectKey=QMT");
    expect(text).toContain(
      "Hint: Invalid project key: call qmetry_fetch_qmetry_list_projects to see valid keys.",
    );
    expect(text).not.toContain("Troubleshooting");
  });

  it("suggests close project keys for an invalid project key", async () => {
    fetchMock.mockResponse(async (req) => {
      if (req.url.includes("/rest/admin/project/list")) {
        return JSON.stringify({
          data: [
            { projectID: 192, projectKey: "QT", name: "QTM--to--QTM4J" },
            { projectID: 347, projectKey: "8d7b", name: "Pranshu Basic Test" },
            { projectID: 5, projectKey: "ZZZZZZ", name: "Unrelated" },
          ],
          total: 3,
        });
      }
      return {
        status: 400,
        body: JSON.stringify({
          code: "CO.INVALID_PROJECT_ID",
          message: "Invalid Project ID.",
        }),
      };
    });

    const result = await callTool("Fetch QMetry Project Info", {
      projectKey: "QMT",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("Did you mean: QT (QTM--to--QTM4J)");
    expect(text).not.toContain("ZZZZZZ");
    const listCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/rest/admin/project/list"),
    );
    expect(listCalls).toHaveLength(1);
  });

  it("keeps the plain hint when the project list lookup also fails", async () => {
    fetchMock.mockResponse({
      status: 400,
      body: JSON.stringify({
        code: "CO.INVALID_PROJECT_ID",
        message: "Invalid Project ID.",
      }),
    });

    const result = await callTool("Fetch QMetry Project Info", {
      projectKey: "QMT",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("Hint: Invalid project key");
    expect(text).not.toContain("Did you mean");
  });

  it("does not look up projects for other error codes", async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        code: "CO.INVALID_API_KEY",
        message: "Invalid API key",
      }),
      { status: 401 },
    );

    await callTool("Fetch QMetry Project Info", { projectKey: "MAC" });

    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/rest/admin/project/list"),
      ),
    ).toBe(false);
  });

  it("returns isError with connectivity tips when QMetry cannot be reached", async () => {
    fetchMock.mockReject(
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" },
      }),
    );

    const result = await callTool("Fetch QMetry Project Info", {
      projectKey: "MAC",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain(
      "Could not reach QMetry at https://qmetry.example/rest/admin/project/getinfo",
    );
    expect(text).toContain("ENOTFOUND");
    expect(text).toContain(
      "Hint: Check the QMetry instance URL (https://qmetry.example) and network connectivity.",
    );
    expect(text).not.toMatch(/CORS/i);
    expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
  });
});
