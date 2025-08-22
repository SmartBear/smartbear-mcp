import { describe, it, expect, vi, beforeEach } from "vitest";
import { PactflowClient } from "../../../pactflow/client.js";
import * as toolsModule from "../../../pactflow/client/tools.js";

describe("PactflowClient.registerTools", () => {
  const mockRegister = vi.fn();
  const mockGetInput = vi.fn();

  beforeEach(() => {
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

    const client = new PactflowClient("token", "https://example.com", "pactflow");
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

    const client = new PactflowClient("token", "https://example.com", "pactflow");
    client.registerTools(mockRegister, mockGetInput);

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("sets correct headers for pactflow", () => {
    const client = new PactflowClient("my-token", "https://example.com", "pactflow");

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
            Authorization: expect.stringContaining(`Basic ${Buffer.from("user:pass").toString("base64")}`),
            "Content-Type": expect.stringContaining("application/json"),
        })
    );
  });
});
