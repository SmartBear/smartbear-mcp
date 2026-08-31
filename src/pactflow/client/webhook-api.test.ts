import { beforeEach, describe, expect, it } from "vitest";
import { ToolError } from "../../common/tools";
import { createMockHttpClient } from "./test-helpers";
import { WebhookApi } from "./webhook-api";

const WEBHOOK_UUID = "550e8400-e29b-41d4-a716-446655440000";
const WEBHOOK_WITH_SPECIAL_CHARS = "hook/name with spaces";

describe("WebhookApi", () => {
  let api: WebhookApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new WebhookApi(mockHttp);
  });

  describe("listWebhooks", () => {
    it("should retrieve all webhooks", async () => {
      const mockResponse = { _embedded: { webhooks: [] } };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listWebhooks();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks",
        { method: "GET", errorContext: "List Webhooks" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Webhooks Failed - status: 401 Unauthorized"),
      );

      await expect(api.listWebhooks()).rejects.toThrow(
        "List Webhooks Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("getWebhook", () => {
    it("should retrieve a webhook by id", async () => {
      const mockResponse = { uuid: WEBHOOK_UUID, description: "My webhook" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getWebhook({ webhookId: WEBHOOK_UUID });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `https://test.example.com/webhooks/${WEBHOOK_UUID}`,
        { method: "GET", errorContext: "Get Webhook" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the webhookId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getWebhook({ webhookId: WEBHOOK_WITH_SPECIAL_CHARS });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks/hook%2Fname%20with%20spaces",
        { method: "GET", errorContext: "Get Webhook" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Webhook Failed - status: 404 Not Found"),
      );

      await expect(api.getWebhook({ webhookId: WEBHOOK_UUID })).rejects.toThrow(
        "Get Webhook Failed - status: 404 Not Found",
      );
    });
  });

  describe("createWebhook", () => {
    const webhookBody = {
      description: "Test webhook",
      enabled: true,
      events: [{ name: "contract_content_changed" }],
      request: {
        method: "POST" as const,
        url: "https://ci.example.com/trigger",
      },
    };

    it("should create a webhook with the correct body", async () => {
      const mockResponse = { uuid: WEBHOOK_UUID, ...webhookBody };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createWebhook(webhookBody);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks",
        { method: "POST", body: webhookBody, errorContext: "Create Webhook" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Create Webhook Failed - status: 422 Unprocessable Entity",
        ),
      );

      await expect(api.createWebhook(webhookBody)).rejects.toThrow(
        "Create Webhook Failed - status: 422 Unprocessable Entity",
      );
    });
  });

  describe("updateWebhook", () => {
    const updateInput = {
      webhookId: WEBHOOK_UUID,
      description: "Updated webhook",
      events: [{ name: "provider_verification_published" }],
      request: {
        method: "POST" as const,
        url: "https://ci.example.com/trigger-updated",
      },
    };

    it("should update a webhook with the correct body", async () => {
      const { webhookId, ...body } = updateInput;
      const mockResponse = { uuid: webhookId, ...body };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateWebhook(updateInput);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `https://test.example.com/webhooks/${WEBHOOK_UUID}`,
        { method: "PUT", body, errorContext: "Update Webhook" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the webhookId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateWebhook({
        ...updateInput,
        webhookId: WEBHOOK_WITH_SPECIAL_CHARS,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks/hook%2Fname%20with%20spaces",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Webhook Failed - status: 404 Not Found"),
      );

      await expect(api.updateWebhook(updateInput)).rejects.toThrow(
        "Update Webhook Failed - status: 404 Not Found",
      );
    });
  });

  describe("deleteWebhook", () => {
    it("should delete a webhook by id", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteWebhook({ webhookId: WEBHOOK_UUID });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `https://test.example.com/webhooks/${WEBHOOK_UUID}`,
        { method: "DELETE", errorContext: "Delete Webhook" },
      );
    });

    it("should URL-encode the webhookId", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteWebhook({ webhookId: WEBHOOK_WITH_SPECIAL_CHARS });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks/hook%2Fname%20with%20spaces",
        { method: "DELETE", errorContext: "Delete Webhook" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Webhook Failed - status: 404 Not Found"),
      );

      await expect(
        api.deleteWebhook({ webhookId: WEBHOOK_UUID }),
      ).rejects.toThrow("Delete Webhook Failed - status: 404 Not Found");
    });
  });

  describe("executeWebhooks", () => {
    it("should execute all webhooks", async () => {
      const mockResponse = { _embedded: { results: [] } };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.executeWebhooks();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks/execute",
        { method: "POST", body: {}, errorContext: "Execute Webhooks" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Execute Webhooks Failed - status: 500 Internal Server Error",
        ),
      );

      await expect(api.executeWebhooks()).rejects.toThrow(
        "Execute Webhooks Failed - status: 500 Internal Server Error",
      );
    });
  });

  describe("executeWebhook", () => {
    it("should execute a specific webhook by id", async () => {
      const mockResponse = { triggerType: "manual", status: "success" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.executeWebhook({ webhookId: WEBHOOK_UUID });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        `https://test.example.com/webhooks/${WEBHOOK_UUID}/execute`,
        { method: "POST", body: {}, errorContext: "Execute Webhook" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the webhookId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.executeWebhook({ webhookId: WEBHOOK_WITH_SPECIAL_CHARS });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks/hook%2Fname%20with%20spaces/execute",
        { method: "POST", body: {}, errorContext: "Execute Webhook" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Execute Webhook Failed - status: 404 Not Found"),
      );

      await expect(
        api.executeWebhook({ webhookId: WEBHOOK_UUID }),
      ).rejects.toThrow("Execute Webhook Failed - status: 404 Not Found");
    });
  });

  describe("handlers", () => {
    it("should expose all 7 handler keys with correct names", () => {
      const handlers = api.handlers;
      const expectedKeys = [
        "listWebhooks",
        "getWebhook",
        "createWebhook",
        "updateWebhook",
        "deleteWebhook",
        "executeWebhooks",
        "executeWebhook",
      ];
      expect(Object.keys(handlers)).toEqual(expectedKeys);
    });

    it("should bind handlers to the api instance", async () => {
      const mockResponse = { _embedded: { webhooks: [] } };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const { listWebhooks } = api.handlers;
      const result = await listWebhooks();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/webhooks",
        { method: "GET", errorContext: "List Webhooks" },
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
