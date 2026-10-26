import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CacheService } from "../common/cache";
import { setProcessClientIdentity } from "../common/client-identity";
import { USER_AGENT } from "../common/info";
import { PactflowClient } from "./client";
import * as toolsModule from "./client/tools";
import { TOOLS } from "./client/tools";

const fetchMock = createFetchMock(vi);

// Helper to create and configure a client
async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
  base_url?: string;
  clientInfo?: { name: string; version: string };
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = {
    server: vi.fn(),
    getClientInfo: vi.fn().mockReturnValue(config.clientInfo),
    getCache: vi.fn().mockReturnValue(new CacheService()),
  } as any;
  const defaultConfig = {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  };
  await client.configure(mockServer, defaultConfig);
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    // Suppress console.error for error test cases
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

    it("includes client identity in User-Agent when a client is identified", async () => {
      setProcessClientIdentity({ name: "Claude Code", version: "1.2.3" });
      client = await createConfiguredClient({ token: "my-token" });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          "User-Agent": `${USER_AGENT} (client: Claude Code; clientVersion: 1.2.3)`,
        }),
      );

      setProcessClientIdentity(undefined);
    });

    it("uses base User-Agent when no client identity is available", async () => {
      setProcessClientIdentity(undefined);
      client = await createConfiguredClient({ token: "my-token" });

      expect(client.requestHeaders).toEqual(
        expect.objectContaining({
          "User-Agent": USER_AGENT,
        }),
      );
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

    it("routes paginated tools through withPagination and reuses the cached result across pages", async () => {
      const fakeTools = [
        {
          title: "Fake Paginated Tool",
          summary: "summary",
          purpose: "purpose",
          inputSchema: undefined,
          handler: "listWebhooks",
          clients: ["pactflow"],
          paginated: true,
        },
      ];
      vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue(fakeTools as any);

      const client = await createConfiguredClient({ token: "token" });
      // 1st fetch: registerTools' internal checkAIEntitlements() call — reuses
      // the same canned body, which is harmless since it has no `aiEnabled`
      // field and this fake tool has no `tags`, so it's registered either way.
      fetchMock.mockResponse(
        JSON.stringify({ _embedded: { webhooks: [{ id: "a" }, { id: "b" }] } }),
      );

      const registered: Array<(args: any, extra: any) => Promise<any>> = [];
      const register = vi.fn((_params, callback) => registered.push(callback));

      await client.registerTools(register as any, vi.fn());

      const page1 = await registered[0]({ pageNumber: 1, pageSize: 1 }, {});
      const page2 = await registered[0]({ pageNumber: 2, pageSize: 1 }, {});

      // 2 total: 1 for checkAIEntitlements + 1 for listWebhooks (page 2 is a cache hit).
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const page1Body = JSON.parse(page1.content[0].text);
      const page2Body = JSON.parse(page2.content[0].text);
      expect(page1Body._embedded.webhooks).toEqual([{ id: "a" }]);
      expect(page2Body._embedded.webhooks).toEqual([{ id: "b" }]);
    });

    describe("structured output", () => {
      const fakeTool = (handler: string, extra: Record<string, unknown> = {}) =>
        ({
          title: handler,
          toolset: "t",
          summary: "summary",
          purpose: "purpose",
          inputSchema: undefined,
          handler,
          clients: ["pactflow"],
          ...extra,
        }) as any;

      const registerFake = async (tool: any, body: string | null) => {
        vi.spyOn(toolsModule, "TOOLS", "get").mockReturnValue([tool]);
        const client = await createConfiguredClient({ token: "token" });
        fetchMock.mockImplementation(
          async () => new Response(body, { status: body === null ? 204 : 200 }),
        );
        const registered: Array<{ params: any; callback: any }> = [];
        const register = vi.fn((params, callback) =>
          registered.push({ params, callback }),
        );
        await client.registerTools(register as any, vi.fn());
        return registered[0];
      };

      it("returns the handler result as structuredContent", async () => {
        const { params, callback } = await registerFake(
          fakeTool("getMetrics"),
          JSON.stringify({ matrix: { count: -1 } }),
        );
        const result = await callback({}, {});

        expect(params.outputSchema).toBeDefined();
        expect(result.structuredContent).toEqual({ matrix: { count: -1 } });
        expect(JSON.parse(result.content[0].text)).toEqual(
          result.structuredContent,
        );
      });

      it("reports success for tools whose API returns no body", async () => {
        const { callback } = await registerFake(
          fakeTool("deletePacticipant"),
          null,
        );
        const result = await callback({ pacticipantName: "x" }, {});

        expect(result.structuredContent).toEqual({ success: true });
      });

      it("advertises pagination on paginated tools only", async () => {
        const paginated = await registerFake(
          fakeTool("listWebhooks", { paginated: true }),
          JSON.stringify({ _embedded: { webhooks: [] } }),
        );
        expect(
          paginated.params.outputSchema.safeParse({
            pagination: { pageNumber: "one" },
          }).success,
        ).toBe(false);

        const plain = await registerFake(
          fakeTool("listEnvironments"),
          JSON.stringify({}),
        );
        expect(
          plain.params.outputSchema.safeParse({
            pagination: { pageNumber: "one" },
          }).success,
        ).toBe(true);
      });

      it("keeps structuredContent when a tool uses formatResponse", async () => {
        const { callback } = await registerFake(
          fakeTool("getMetrics", {
            formatResponse: () => ({
              content: [{ type: "text", text: "custom" }],
            }),
          }),
          JSON.stringify({ matrix: { count: -1 } }),
        );
        const result = await callback({}, {});

        expect(result.content[0].text).toBe("custom");
        expect(result.structuredContent).toEqual({ matrix: { count: -1 } });
      });
    });
  });

  describe("registerPrompts", () => {
    const mockRegisterPrompt = vi.fn();

    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
      mockRegisterPrompt.mockClear();
    });

    it("should register all prompts from PROMPTS array", async () => {
      client.registerPrompts(mockRegisterPrompt);
      expect(mockRegisterPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe("handlerMap completeness", () => {
    it("every TOOLS handler resolves in the merged handlerMap", async () => {
      const client = await createConfiguredClient({ token: "token" });
      const missing = TOOLS.map((t) => t.handler).filter(
        (h) => typeof (client as any)[h] !== "function",
      );
      expect(missing).toEqual([]);
    });
  });

  describe("BDCT pagination integration", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
    });

    it("caches the raw BDCT response across pages and passes it through unchanged (no array to paginate)", async () => {
      // An earlier "registerTools" test leaves `toolsModule.TOOLS` permanently
      // stubbed via vi.spyOn(...).mockReturnValue(...) (vi.clearAllMocks() in
      // the outer beforeEach clears call history but not that stub). Restore
      // it so this test drives the real TOOLS array, as intended.
      vi.restoreAllMocks();

      // 1st fetch: registerTools' internal checkAIEntitlements() call.
      fetchMock.mockResponseOnce(JSON.stringify({ aiEnabled: true }));
      // 2nd fetch: the actual BDCT provider-contract request (cache miss on page 1).
      fetchMock.mockResponseOnce(
        JSON.stringify({
          verificationStatus: "success",
          _embedded: { providerVersion: { number: "1.0.0" } },
        }),
      );

      const registered: Array<(args: any, extra: any) => Promise<any>> = [];
      const register = vi.fn((params: any, callback: any) => {
        if (params.title === "Get BDCT Provider Contract")
          registered.push(callback);
      });

      await client.registerTools(register as any, vi.fn());
      expect(registered).toHaveLength(1);

      const page1 = await registered[0](
        {
          providerName: "prov",
          providerVersionNumber: "1.0.0",
          pageNumber: 1,
          pageSize: 5,
        },
        {},
      );
      const page2 = await registered[0](
        {
          providerName: "prov",
          providerVersionNumber: "1.0.0",
          pageNumber: 2,
          pageSize: 5,
        },
        {},
      );

      // Only 2 fetches total (entitlements + one BDCT fetch) — page 2 is a cache hit.
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const page1Body = JSON.parse(page1.content[0].text);
      const page2Body = JSON.parse(page2.content[0].text);
      expect(page1Body.verificationStatus).toBe("success");
      expect(page1Body.pagination).toEqual({
        pageNumber: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1,
      });
      expect(page2Body).toEqual({
        pagination: {
          pageNumber: 2,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        },
      });
    });
  });
});
