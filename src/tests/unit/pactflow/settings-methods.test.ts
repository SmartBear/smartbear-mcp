import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { PactflowClient } from "../../../pactflow/client";

const fetchMock = createFetchMock(vi);

async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
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

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
    });

    describe("listWebhooks", () => {
      it("should list all webhooks", async () => {
        const mockResponse = {
          _embedded: { webhooks: [{ uuid: "wh-uuid-1" }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listWebhooks();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/webhooks", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result._embedded?.webhooks).toHaveLength(1);
      });
    });

    describe("getWebhook", () => {
      it("should retrieve a specific webhook", async () => {
        const mockResponse = {
          uuid: "wh-uuid-1",
          request: { url: "https://ci.example.com/trigger" },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getWebhook({ webhookId: "wh-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/webhooks/wh-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.uuid).toBe("wh-uuid-1");
      });
    });

    describe("createWebhook", () => {
      const mockWebhookBody = {
        description: "Trigger CI build",
        events: [{ name: "contract_published" }],
        request: {
          method: "POST",
          url: "https://ci.example.com/trigger",
          headers: { "Content-Type": "application/json" },
          body: '{"ref": "main"}',
        },
      };

      it("should create a new webhook", async () => {
        const mockResponse = { uuid: "wh-uuid-2", ...mockWebhookBody };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createWebhook(mockWebhookBody as any);

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/webhooks", {
          method: "POST",
          headers: client.requestHeaders,
          body: JSON.stringify(mockWebhookBody),
        });
        expect(result.uuid).toBe("wh-uuid-2");
      });
    });

    describe("updateWebhook", () => {
      it("should update an existing webhook", async () => {
        const mockResponse = { uuid: "wh-uuid-1" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updateWebhook({
          webhookId: "wh-uuid-1",
          description: "Updated webhook",
          events: [{ name: "contract_published" }],
          request: {
            method: "POST",
            url: "https://ci.example.com/new-trigger",
          },
        } as any);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/webhooks/wh-uuid-1",
          expect.objectContaining({ method: "PUT" }),
        );
      });
    });

    describe("deleteWebhook", () => {
      it("should delete a webhook", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteWebhook({ webhookId: "wh-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/webhooks/wh-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("executeWebhooks", () => {
      it("should fire all webhooks", async () => {
        const mockResponse = { results: [] };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.executeWebhooks();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/webhooks/execute",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("executeWebhook", () => {
      it("should fire a specific webhook", async () => {
        const mockResponse = { succeeded: true };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.executeWebhook({ webhookId: "wh-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/webhooks/wh-uuid-1/execute",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("listSecrets", () => {
      it("should list all secrets", async () => {
        const mockResponse = {
          _embedded: { secrets: [{ uuid: "sec-uuid-1", name: "CI_TOKEN" }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listSecrets();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/secrets", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result._embedded?.secrets).toHaveLength(1);
      });
    });

    describe("getSecret", () => {
      it("should retrieve a secret by UUID", async () => {
        const mockResponse = { uuid: "sec-uuid-1", name: "CI_TOKEN" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getSecret({ secretId: "sec-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/secrets/sec-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.uuid).toBe("sec-uuid-1");
      });
    });

    describe("createSecret", () => {
      it("should create a new secret", async () => {
        const mockResponse = { uuid: "sec-uuid-2", name: "MY_TOKEN" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createSecret({
          name: "MY_TOKEN",
          description: "CI token",
          value: "s3cr3t",
        });

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/secrets", {
          method: "POST",
          headers: client.requestHeaders,
          body: JSON.stringify({
            name: "MY_TOKEN",
            description: "CI token",
            value: "s3cr3t",
          }),
        });
        expect(result.uuid).toBe("sec-uuid-2");
      });
    });

    describe("updateSecret", () => {
      it("should update a secret", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.updateSecret({
          secretId: "sec-uuid-1",
          name: "MY_TOKEN",
          value: "new-s3cr3t",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/secrets/sec-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ name: "MY_TOKEN", value: "new-s3cr3t" }),
          },
        );
      });
    });

    describe("deleteSecret", () => {
      it("should delete a secret", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteSecret({ secretId: "sec-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/secrets/sec-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("getCurrentUser", () => {
      it("should retrieve the current user profile", async () => {
        const mockResponse = {
          uuid: "user-uuid-1",
          email: "user@example.com",
          active: true,
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getCurrentUser();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/user", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result.email).toBe("user@example.com");
      });
    });

    describe("listTokens", () => {
      it("should list all API tokens for the current user", async () => {
        const mockResponse = {
          _embedded: {
            items: [{ uuid: "tok-uuid-1", description: "CI token" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listTokens();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/settings/tokens",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.items).toHaveLength(1);
      });
    });

    describe("regenerateToken", () => {
      it("should regenerate an API token", async () => {
        const mockResponse = { uuid: "tok-uuid-1", value: "new-token-value" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.regenerateToken({ tokenId: "tok-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/settings/tokens/tok-uuid-1/regenerate",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
        expect(result.value).toBe("new-token-value");
      });
    });

    describe("getUserPreferences", () => {
      it("should retrieve user preferences", async () => {
        const mockResponse = { theme: "dark", notifications: true };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getUserPreferences();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/preferences/current-user",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.theme).toBe("dark");
      });
    });

    describe("getSystemPreferences", () => {
      it("should retrieve system preferences", async () => {
        const mockResponse = { allowGuestAccess: false };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getSystemPreferences();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/preferences/system",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.allowGuestAccess).toBe(false);
      });
    });

    describe("getAuditLog", () => {
      it("should retrieve the audit log with no filters", async () => {
        const mockResponse = { _embedded: { events: [] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.getAuditLog({});

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/audit", {
          method: "GET",
          headers: client.requestHeaders,
        });
      });

      it("should pass all filter parameters as query string", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ events: [] }));

        await client.getAuditLog({
          since: "2024-01-01",
          userUuid: "user-uuid-1",
          type: "create",
          sort: "desc",
          pageNumber: 2,
          pageSize: 25,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/audit?since=2024-01-01&userUuid=user-uuid-1&type=create&sort=desc&pageNumber=2&pageSize=25",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });
  });
});
