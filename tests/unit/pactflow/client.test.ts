import { describe, it, expect, vi, beforeEach } from "vitest";
import { PactflowClient } from "../../../pactflow/client.js";
import * as toolsModule from "../../../pactflow/client/tools.js";
import createFetchMock from "vitest-fetch-mock";
import { afterEach } from "node:test";

describe("PactflowClient.registerTools", () => {
  const mockRegister = vi.fn();
  const mockGetInput = vi.fn();
  // Enable fetch mocking
  const fetchMocker = createFetchMock(vi);
  fetchMocker.enableMocks();

  beforeEach(() => {
    fetchMocker.doMock();
    vi.resetAllMocks();
  });

  it("registers only tools matching the given clientType", () => {
    // Arrange — mock TOOLS with multiple client types
    const fakeTools = [
      {
        title: "tool1",
        summary: "summary1",
        purpose: "purpose1",
        parameters: [],
        handler: "generate",
        clients: ["pactflow"], // should be registered
      },
      {
        title: "tool2",
        summary: "summary2",
        purpose: "purpose2",
        parameters: [],
        handler: "generate",
        clients: ["pact_broker"], // should NOT be registered
      },
    ];
    vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue(fakeTools as any);

    const client = new PactflowClient(
      "token",
      "https://example.com",
      "pactflow"
    );
    client.registerTools(mockRegister, mockGetInput);

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister.mock.calls[0][0].title).toBe("tool1");
    expect(mockRegister.mock.calls[0][0].summary).toBe("summary1");
  });

  it("registers no tools if none match the clientType", () => {
    const fakeTools = [
      {
        title: "tool2",
        summary: "summary2",
        purpose: "purpose2",
        parameters: [],
        handler: "generate",
        clients: ["pact_broker"],
      },
    ];
    vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue(fakeTools as any);

    const client = new PactflowClient(
      "token",
      "https://example.com",
      "pactflow"
    );
    client.registerTools(mockRegister, mockGetInput);

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("sets correct headers for pactflow", () => {
    const client = new PactflowClient(
      "my-token",
      "https://example.com",
      "pactflow"
    );

    expect(client["headers"]).toEqual(
      expect.objectContaining({
        Authorization: expect.stringContaining("Bearer my-token"),
        "Content-Type": expect.stringContaining("application/json"),
      })
    );
  });

  it("sets correct headers for pact_broker", () => {
    const client = new PactflowClient(
      { username: "user", password: "pass" },
      "https://example.com",
      "pact_broker"
    );

    expect(client["headers"]).toEqual(
      expect.objectContaining({
        Authorization: expect.stringContaining(
          `Basic ${Buffer.from("user:pass").toString("base64")}`
        ),
        "Content-Type": expect.stringContaining("application/json"),
      })
    );
  });

  it("Gets remote spec contents with correct auth token", async () => {
    const client = new PactflowClient(
      "my-token",
      "https://example.com",
      "pactflow"
    );
    fetchMocker.mockResponseOnce(JSON.stringify({ data: "mocked data" }));
    await client.getRemoteSpecContents({
      authToken: "my-token",
      url: "https://api.example.com/openapi.json",
    });
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/openapi.json", {
      headers: {
        Authorization: "Bearer my-token",
      },
      method: "GET",
    });
  });

  it("Gets throws an error if url is missing", async () => {
    const client = new PactflowClient(
      "my-token",
      "https://example.com",
      "pactflow"
    );
    await expect(client.getRemoteSpecContents({
      authToken: "my-token",
    })).rejects.toThrowError("url' must be provided.");
  });

  afterEach(() => {
    fetchMocker.resetMocks();
  });
});
