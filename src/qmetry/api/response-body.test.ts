import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../common/tools";
import { qmetryRequest } from "../client/api/client-api";
import {
  createNonJsonResponseError,
  readQMetryJson,
} from "../client/api/error-handler";
import { importAutomationResults } from "../client/automation";

// A successful (2xx) QMetry response must be read as JSON. An empty body is a
// success with nothing to return; anything else that is not JSON (sign-in,
// proxy or maintenance pages, a wrong base URL) is an expected environment
// failure (ToolError), never a raw SyntaxError treated as a server bug.

const url = "https://qmetry.example/rest/execution/link/issue";
const SIGN_IN_PAGE =
  "<!DOCTYPE html><html><head><title>Sign in</title></head>" +
  "<body><h1>Sign in to continue</h1><form>…</form></body></html>";

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("readQMetryJson", () => {
  it("parses a JSON body", async () => {
    await expect(
      readQMetryJson(new Response(JSON.stringify({ id: 7 })), url),
    ).resolves.toEqual({ id: 7 });
  });

  it.each([
    ["an empty 200", () => new Response("", { status: 200 })],
    ["a whitespace-only 200", () => new Response(" \n ", { status: 200 })],
    ["a 204 No Content", () => new Response(null, { status: 204 })],
  ])("treats %s as success with nothing to return", async (_label, make) => {
    await expect(readQMetryJson(make(), url)).resolves.toEqual({
      success: true,
    });
  });

  it("throws a ToolError with sign-in/proxy guidance for an HTML page", async () => {
    const error = await readQMetryJson(html(SIGN_IN_PAGE), url).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ToolError);
    const message = (error as Error).message;
    expect(message).toContain(
      `QMetry returned a non-JSON response (HTTP 200, text/html; charset=utf-8) for ${url}`,
    );
    expect(message).toContain("The response is an HTML page");
    expect(message).toContain("sign-in page");
    expect(message).toContain("base URL");
    // Markup is stripped so the model sees the page's text
    expect(message).toContain(
      "Response starts with: Sign in Sign in to continue",
    );
    expect(message).not.toContain("<!DOCTYPE");
  });

  it("recognises HTML by its content even without an HTML content type", async () => {
    const error = await readQMetryJson(
      new Response(SIGN_IN_PAGE, { status: 200 }),
      url,
    ).catch((e: unknown) => e);

    expect((error as Error).message).toContain("The response is an HTML page");
  });

  it("throws a ToolError for a body that is neither JSON nor HTML", async () => {
    const error = await readQMetryJson(
      new Response("Service temporarily unavailable", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
      url,
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ToolError);
    const message = (error as Error).message;
    expect(message).toContain("The response could not be read as JSON");
    expect(message).toContain(
      "Response starts with: Service temporarily unavailable",
    );
  });

  it("throws a ToolError when the body cannot be read", async () => {
    const broken = {
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw new TypeError("terminated");
      },
    } as unknown as Response;

    const error = await readQMetryJson(broken, url).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ToolError);
    expect((error as Error).message).toContain("terminated");
  });
});

describe("createNonJsonResponseError", () => {
  it("quotes at most 200 characters of the body", () => {
    const error = createNonJsonResponseError({
      status: 200,
      contentType: "text/plain",
      body: "x".repeat(500),
      url,
    });

    expect(error.message).toContain(
      `Response starts with: ${"x".repeat(200)}…`,
    );
    expect(error.message).not.toContain("x".repeat(201));
  });
});

describe("non-JSON success responses from the QMetry request helpers", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("qmetryRequest throws a ToolError for an HTML 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(html(SIGN_IN_PAGE));

    await expect(
      qmetryRequest({
        method: "PUT",
        path: "/rest/execution/link/issue",
        token: "fake-token",
        project: "MAC",
        baseUrl: "https://qmetry.example",
        body: { issueIds: [2038], tcrId: 23450 },
      }),
    ).rejects.toThrow(new RegExp(`non-JSON response .* for ${url}`));
  });

  it("qmetryRequest returns { success: true } for a 204", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      qmetryRequest({
        method: "PUT",
        path: "/rest/execution/link/issue",
        token: "fake-token",
        project: "MAC",
        baseUrl: "https://qmetry.example",
        body: { issueIds: [2038], tcrId: 23450 },
      }),
    ).resolves.toEqual({ success: true });
  });

  it("importAutomationResults throws a ToolError for an HTML 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(html(SIGN_IN_PAGE));

    const error = await importAutomationResults(
      "fake-token",
      "https://qmetry.example",
      "MAC",
      {
        file: btoa("<testsuite/>"),
        fileName: "results.xml",
        entityType: "TESTNG",
      } as any,
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ToolError);
    expect((error as Error).message).toContain("The response is an HTML page");
  });
});
