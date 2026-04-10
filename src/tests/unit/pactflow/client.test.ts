import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ToolError } from "../../../common/tools";
import { PactflowClient } from "../../../pactflow/client";
import * as toolsModule from "../../../pactflow/client/tools";

const fetchMock = createFetchMock(vi);

async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
  base_url?: string;
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { server: vi.fn() } as any;
  await client.configure(mockServer, {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  });
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("sets correct headers when client is pactflow", async () => {
      client = await createConfiguredClient({ token: "my-token" });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining("Bearer my-token"),
          "Content-Type": expect.stringContaining("application/json"),
        }),
      );
    });

    it("sets correct headers when client is pact_broker", async () => {
      client = await createConfiguredClient({
        username: "user",
        password: "pass",
      });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          Authorization: expect.stringContaining(
            `Basic ${Buffer.from("user:pass").toString("base64")}`,
          ),
          "Content-Type": expect.stringContaining("application/json"),
        }),
      );
    });

    it("does not configure when neither token nor credentials are provided", async () => {
      const unconfigured = new PactflowClient();
      const mockServer = { server: vi.fn() } as any;
      await unconfigured.configure(mockServer, {
        base_url: "https://example.com",
      });
      expect(unconfigured.isConfigured()).toBe(false);
      expect(unconfigured.requestHeaders).toBeUndefined();
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();

    it("registers only tools matching the given clientType", async () => {
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

      const client = await createConfiguredClient({ token: "token" });
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0].title).toBe("tool1");
      expect(mockRegister.mock.calls[0][0].summary).toBe("summary1");
    });

    it("registers no tools if none match the clientType", async () => {
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

      const client = await createConfiguredClient({ token: "token" });
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("skips AI-tagged tools when entitlements check returns 404", async () => {
      const aiTool = {
        title: "ai-tool",
        summary: "AI tool",
        purpose: "AI purpose",
        parameters: [],
        handler: "generate",
        clients: ["pactflow"],
        tags: ["pactflow-ai"],
      };
      const regularTool = {
        title: "regular-tool",
        summary: "Regular tool",
        purpose: "Regular purpose",
        parameters: [],
        handler: "listPacticipants",
        clients: ["pactflow"],
      };
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([
        aiTool,
        regularTool,
      ] as any);

      const client = await createConfiguredClient({ token: "token" });
      vi.spyOn(client, "checkAIEntitlements").mockRejectedValue(
        new ToolError(
          "Not Found",
          undefined,
          new Map([["responseStatus", 404]]),
        ),
      );

      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0].title).toBe("regular-tool");
    });

    it("skips AI-tagged tools when aiEnabled is false", async () => {
      const aiTool = {
        title: "ai-tool",
        summary: "AI tool",
        purpose: "AI purpose",
        parameters: [],
        handler: "generate",
        clients: ["pactflow"],
        tags: ["pactflow-ai"],
      };
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([aiTool] as any);

      const client = await createConfiguredClient({ token: "token" });
      vi.spyOn(client, "checkAIEntitlements").mockResolvedValue({
        aiEnabled: false,
      } as any);

      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("throws when registered handler does not exist on client", async () => {
      const fakeTool = {
        title: "bad-tool",
        summary: "bad",
        purpose: "bad",
        parameters: [],
        handler: "nonExistentMethod",
        clients: ["pactflow"],
      };
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([fakeTool] as any);

      const client = await createConfiguredClient({ token: "token" });
      vi.spyOn(client, "checkAIEntitlements").mockResolvedValue({
        aiEnabled: true,
      } as any);

      let registeredCallback: (
        args: unknown,
        extra: unknown,
      ) => Promise<unknown>;
      mockRegister.mockImplementation(
        (_params: unknown, cb: typeof registeredCallback) => {
          registeredCallback = cb;
        },
      );

      await client.registerTools(mockRegister, mockGetInput);

      await expect(registeredCallback?.({}, {})).rejects.toThrow(
        "Handler 'nonExistentMethod' not found on PactClient",
      );
    });

    it("calls handler with getInput when enableElicitation is true", async () => {
      const fakeTool = {
        title: "elicitation-tool",
        summary: "elicitation",
        purpose: "elicitation",
        parameters: [],
        handler: "generate",
        clients: ["pactflow"],
        enableElicitation: true,
      };
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([fakeTool] as any);

      const client = await createConfiguredClient({ token: "token" });
      vi.spyOn(client, "checkAIEntitlements").mockResolvedValue({
        aiEnabled: true,
      } as any);
      const generateSpy = vi
        .spyOn(client, "generate")
        .mockResolvedValue({ code: "test", language: "js" } as any);

      let registeredCallback: (
        args: unknown,
        extra: unknown,
      ) => Promise<unknown>;
      mockRegister.mockImplementation(
        (_params: unknown, cb: typeof registeredCallback) => {
          registeredCallback = cb;
        },
      );

      await client.registerTools(mockRegister, mockGetInput);
      await registeredCallback?.({ language: "js" }, {});

      expect(generateSpy).toHaveBeenCalledWith(
        { language: "js" },
        mockGetInput,
      );
    });

    it("uses formatResponse when provided", async () => {
      const mockFormatResponse = vi
        .fn()
        .mockReturnValue({ content: [{ type: "text", text: "formatted" }] });
      const fakeTool = {
        title: "format-tool",
        summary: "format",
        purpose: "format",
        parameters: [],
        handler: "listPacticipants",
        clients: ["pactflow"],
        formatResponse: mockFormatResponse,
      };
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([fakeTool] as any);

      const client = await createConfiguredClient({ token: "token" });
      vi.spyOn(client, "checkAIEntitlements").mockResolvedValue({
        aiEnabled: true,
      } as any);
      vi.spyOn(client, "listPacticipants").mockResolvedValue({
        _embedded: { pacticipants: [] },
      } as any);

      let registeredCallback: (
        args: unknown,
        extra: unknown,
      ) => Promise<unknown>;
      mockRegister.mockImplementation(
        (_params: unknown, cb: typeof registeredCallback) => {
          registeredCallback = cb;
        },
      );

      await client.registerTools(mockRegister, mockGetInput);
      const result = await registeredCallback?.({}, {});

      expect(mockFormatResponse).toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: "text", text: "formatted" }],
      });
    });
  });

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
    });

    describe("registerPrompts", () => {
      const mockRegisterPrompt = vi.fn();

      beforeEach(async () => {
        mockRegisterPrompt.mockClear();
      });

      it("should register all prompts from PROMPTS array", async () => {
        client.registerPrompts(mockRegisterPrompt);
        expect(mockRegisterPrompt).toHaveBeenCalledTimes(1);
      });
    });

    describe("getResult", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should return parsed JSON when response is OK", async () => {
        const mockData = { foo: "bar", value: 42 };
        fetchMock.mockResponseOnce(JSON.stringify(mockData), { status: 200 });
        const result = await client.getResult<typeof mockData>(
          "https://example.com/api/result/1",
        );
        expect(result).toEqual(mockData);
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/api/result/1",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should throw error if response is not OK", async () => {
        fetchMock.mockResponseOnce("Not found", { status: 404 });
        await expect(
          client.getResult("https://example.com/api/result/404"),
        ).rejects.toThrow("HTTP error! status: 404");
      });
    });

    describe("getStatus", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should return isComplete true for status 200", async () => {
        fetchMock.mockResponseOnce("", { status: 200 });
        const result = await client.getStatus("https://example.com/status/ok");
        expect(result).toEqual({ status: 200, isComplete: true });
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/status/ok",
          {
            method: "HEAD",
            headers: client.requestHeaders,
          },
        );
      });

      it("should return isComplete false for status 202", async () => {
        fetchMock.mockResponseOnce("", { status: 202 });
        const result = await client.getStatus(
          "https://example.com/status/pending",
        );
        expect(result).toEqual({ status: 202, isComplete: false });
      });

      it("should return correct status for other codes", async () => {
        fetchMock.mockResponseOnce("", { status: 500 });
        const result = await client.getStatus(
          "https://example.com/status/error",
        );
        expect(result).toEqual({ status: 500, isComplete: false });
      });
    });

    describe("pollForCompletion", () => {
      beforeEach(async () => {
        client = await createConfiguredClient({ token: "test-token" });
      });

      it("should resolve when status becomes 200", async () => {
        const status_response = {
          status_url: "https://example.com/status/123",
          result_url: "https://example.com/result/123",
        };

        fetchMock.mockResponses(
          ["", { status: 202 }],
          ["", { status: 200 }],
          [JSON.stringify({ result: "done" }), { status: 200 }],
        );

        const spyGetStatus = vi.spyOn(client, "getStatus");
        spyGetStatus.mockImplementationOnce(async () => ({
          status: 202,
          isComplete: false,
        }));
        spyGetStatus.mockImplementationOnce(async () => ({
          status: 200,
          isComplete: true,
        }));

        const spyGetResult = vi.spyOn(client, "getResult");
        spyGetResult.mockResolvedValue({ result: "done" });
        const result = await (client as any).pollForCompletion(
          status_response as any,
          "TestOp",
        );
        expect(result).toEqual({ result: "done" });
        expect(spyGetStatus).toHaveBeenCalledTimes(2);
        expect(spyGetResult).toHaveBeenCalledWith(
          "https://example.com/result/123",
        );
      });

      it("should throw error if status is not 202 or 200", async () => {
        const status_response = {
          status_url: "https://example.com/status/123",
          result_url: "https://example.com/result/123",
        };
        const spyGetStatus = vi.spyOn(client, "getStatus");
        spyGetStatus.mockResolvedValue({ status: 500, isComplete: false });
        await expect(
          (client as any).pollForCompletion(status_response as any, "TestOp"),
        ).rejects.toThrow("TestOp failed with status: 500");
      });

      it("should throw timeout error after 120 seconds have elapsed", async () => {
        const status_response = {
          status_url: "https://example.com/status/123",
          result_url: "https://example.com/result/123",
        };
        const baseTime = 1_000_000;
        let callCount = 0;
        vi.spyOn(Date, "now").mockImplementation(() =>
          callCount++ === 0 ? baseTime : baseTime + 200_000,
        );

        const spyGetStatus = vi.spyOn(client, "getStatus");
        spyGetStatus.mockResolvedValue({ status: 202, isComplete: false });

        await expect(
          (client as any).pollForCompletion(status_response as any, "TestOp"),
        ).rejects.toThrow("TestOp timed out after 120 seconds");
      });
    });

    describe("fetchJson 204 No Content", () => {
      it("should return undefined for 204 No Content responses", async () => {
        fetchMock.mockImplementationOnce(
          async () => new Response(null, { status: 204 }),
        );
        const result = await client.deletePacticipant({
          pacticipantName: "test-app",
        });
        expect(result).toBeUndefined();
      });
    });
  });
});
