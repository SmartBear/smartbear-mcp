import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../common/tools";
import { pickErrorContextInputs } from "../client";
import { qmetryRequest } from "../client/api/client-api";
import {
  createQMetryApiError,
  createQMetryFetchError,
  QMetryApiError,
} from "../client/api/error-handler";

// Every failed QMetry call must become a QMetryApiError (a ToolError, so the
// tool result has `isError: true`) with a short message: status, QMetry's
// code and message, and a hint only where one applies.

const baseUrl = "https://qmetry.example";
const url = `${baseUrl}/rest/testcases`;
const GENERIC_TIPS = /Troubleshooting|instance URL|API key|permission/i;

describe("createQMetryApiError", () => {
  it("reports status, code and message from a QMetry JSON body without generic tips", () => {
    const error = createQMetryApiError(
      400,
      JSON.stringify({
        success: false,
        code: "CO.SOME_VALIDATION_ERROR",
        message: "Name is required.",
      }),
      url,
    );

    expect(error).toBeInstanceOf(ToolError);
    expect(error).toBeInstanceOf(QMetryApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("CO.SOME_VALIDATION_ERROR");
    expect(error.message).toBe(
      "QMetry API error 400 CO.SOME_VALIDATION_ERROR: Name is required.\n" +
        `Request: ${url}`,
    );
    expect(error.message).not.toMatch(GENERIC_TIPS);
  });

  it.each([404, 422])("adds no generic tips for %s", (status) => {
    const error = createQMetryApiError(
      status,
      JSON.stringify({ code: "CO.X", message: "Nope." }),
      url,
    );
    expect(error.message).toContain(`QMetry API error ${status} CO.X: Nope.`);
    expect(error.message).not.toMatch(GENERIC_TIPS);
    expect(error.message).not.toContain("Hint:");
  });

  it.each([
    [
      "CO.INVALID_PROJECT_ID",
      "Invalid project key: call qmetry_fetch_qmetry_list_projects to see valid keys.",
    ],
    [
      "CO.CREATE_ENTITY_IS_NOT_ALLOWED_AS_SELECTED_FOLDER_DOES_NOT_EXIST",
      "The folder ID does not exist",
    ],
  ])("adds a specific hint for %s", (code, hint) => {
    const error = createQMetryApiError(
      400,
      JSON.stringify({ success: false, code, message: "QMetry says no." }),
      url,
    );
    expect(error.message).toContain(`Hint: ${hint}`);
  });

  it.each([401, 403])("gives API key and permission tips for %s", (status) => {
    const error = createQMetryApiError(
      status,
      JSON.stringify({ message: "Access denied" }),
      url,
    );
    expect(error.details.kind).toBe("auth");
    expect(error.message).toContain(
      `QMetry API error ${status}: Access denied`,
    );
    expect(error.message).toContain(
      "Hint: Check that the QMetry API key is valid and not expired, and that its user has permission",
    );
  });

  it("treats CO.INVALID_API_KEY as an auth error whatever the status", () => {
    const error = createQMetryApiError(
      400,
      JSON.stringify({
        code: "CO.INVALID_API_KEY",
        message: "Invalid API key",
      }),
      url,
    );
    expect(error.details.kind).toBe("auth");
    expect(error.message).toContain("Hint: Check that the QMetry API key");
  });

  it("calls a 5xx a server error worth retrying", () => {
    const error = createQMetryApiError(503, "Service Unavailable", url);
    expect(error.message).toContain(
      "QMetry API error 503: Service Unavailable",
    );
    expect(error.message).toContain(
      "Hint: This is a QMetry server error; retrying the request may succeed.",
    );
  });

  it("quotes readable text from a non-JSON (HTML) body", () => {
    const error = createQMetryApiError(
      502,
      `<html><body><h1>Bad Gateway</h1>${"x".repeat(500)}</body></html>`,
      url,
      "text/html",
    );
    expect(error.message).toContain("QMetry API error 502: Bad Gateway x");
    expect(error.message).not.toContain("<h1>");
    expect(error.message).not.toContain("x".repeat(201));
  });

  it("falls back to the status for an empty body", () => {
    const error = createQMetryApiError(404, "", url);
    expect(error.message).toContain("QMetry API error 404: HTTP 404");
  });

  it("uses the raw JSON when it has no message field", () => {
    const error = createQMetryApiError(400, JSON.stringify([1, 2]), url);
    expect(error.message).toContain("QMetry API error 400: [1,2]");
  });

  it("adds tool context without losing the QMetry details", () => {
    const error = createQMetryApiError(
      400,
      JSON.stringify({ code: "CO.INVALID_PROJECT_ID", message: "Invalid." }),
      url,
    )
      .withContext({ step: "linking" })
      .withContext({
        tool: "qmetry_set_qmetry_project_info",
        inputs: { projectKey: "QMT" },
      });

    expect(error.code).toBe("CO.INVALID_PROJECT_ID");
    expect(error.message).toBe(
      "QMetry API error 400 CO.INVALID_PROJECT_ID: Invalid.\n" +
        "Tool: qmetry_set_qmetry_project_info\n" +
        "Inputs: projectKey=QMT\n" +
        "Step: linking\n" +
        `Request: ${url}\n` +
        "Hint: Invalid project key: call qmetry_fetch_qmetry_list_projects to see valid keys.",
    );
  });
});

describe("createQMetryFetchError", () => {
  it("reports a network failure with the URL and connectivity tips, not CORS", () => {
    const error = createQMetryFetchError(
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
      }),
      url,
      baseUrl,
    );
    expect(error.details.kind).toBe("network");
    expect(error.message).toContain(
      `Could not reach QMetry at ${url}: fetch failed — ECONNREFUSED — connect ECONNREFUSED`,
    );
    expect(error.message).toContain(
      `Hint: Check the QMetry instance URL (${baseUrl}) and network connectivity.`,
    );
    expect(error.message).not.toMatch(/CORS/i);
  });

  it("mentions a proxy for certificate failures", () => {
    const error = createQMetryFetchError(
      Object.assign(new TypeError("fetch failed"), {
        cause: {
          code: "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
          message: "unable to get local issuer certificate",
        },
      }),
      url,
      baseUrl,
    );
    expect(error.message).toContain("corporate proxy");
  });

  it("handles a non-Error rejection", () => {
    const error = createQMetryFetchError("boom", url, baseUrl);
    expect(error.message).toContain(`Could not reach QMetry at ${url}: boom`);
  });
});

describe("qmetryRequest error handling", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const request = () =>
    qmetryRequest({
      method: "POST",
      path: "/rest/testcases",
      token: "secret-api-key",
      project: "MAC",
      baseUrl,
      body: { name: "x" },
    });

  it("throws a QMetryApiError for a 400 with a QMetry body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "CO.INVALID_PROJECT_ID",
          message: "Invalid.",
        }),
        { status: 400 },
      ),
    );

    const error = await request().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QMetryApiError);
    expect((error as Error).message).toContain(
      "QMetry API error 400 CO.INVALID_PROJECT_ID: Invalid.",
    );
    expect((error as Error).message).not.toContain("secret-api-key");
  });

  it("does not throw anything else for a body that cannot be read", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => {
        throw new TypeError("terminated");
      },
    });

    const error = await request().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QMetryApiError);
    expect((error as Error).message).toContain(
      "QMetry API error 500: HTTP 500",
    );
  });

  it("returns a 2xx body unchanged", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 7, name: "x" }), { status: 200 }),
      );

    await expect(request()).resolves.toEqual({ id: 7, name: "x" });
  });
});

describe("pickErrorContextInputs", () => {
  it("keeps keys and IDs, drops credentials and free text", () => {
    expect(
      pickErrorContextInputs({
        projectKey: "QMT",
        tcFolderID: "999",
        tcrId: 12,
        issueIds: [1, 2, 3],
        viewId: 5,
        name: "Login works",
        description: "long text",
        apiKey: "secret",
        tokenId: "secret",
        udfFields: { a: 1 },
      }),
    ).toEqual({
      projectKey: "QMT",
      tcFolderID: "999",
      tcrId: "12",
      issueIds: "[1, 2, 3]",
      viewId: "5",
    });
  });

  it("truncates long ID lists", () => {
    const ids = Array.from({ length: 15 }, (_, i) => i);
    expect(pickErrorContextInputs({ tcRunIDs: ids }).tcRunIDs).toBe(
      "[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, …]",
    );
  });
});
