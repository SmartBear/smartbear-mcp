import type { HttpClient } from "./http-client";
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookExecutionResponse,
  WebhookIdInput,
  WebhookResponse,
  WebhooksListResponse,
} from "./base";

export class WebhookApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all webhooks configured in the workspace.
   *
   * @returns List of webhook definitions and their trigger configurations.
   * @throws ToolError if the request fails.
   */
  async listWebhooks(): Promise<WebhooksListResponse> {
    return await this.http.fetch<WebhooksListResponse>(
      `${this.http.baseUrl}/webhooks`,
      { method: "GET", errorContext: "List Webhooks" },
    );
  }

  /**
   * Retrieves the configuration for a specific webhook by UUID.
   *
   * @param params - `webhookId`: UUID of the webhook.
   * @returns Webhook definition including its URL, events, and consumer/provider filters.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async getWebhook({ webhookId }: WebhookIdInput): Promise<WebhookResponse> {
    return await this.http.fetch<WebhookResponse>(
      `${this.http.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      { method: "GET", errorContext: "Get Webhook" },
    );
  }

  /**
   * Creates a new webhook triggered by pact publication or verification events.
   *
   * @param body - Webhook URL, HTTP method, headers, body, events, and optional
   *   consumer/provider filters.
   * @returns The created webhook resource.
   * @throws ToolError if the request fails.
   */
  async createWebhook({ ...body }: CreateWebhookInput): Promise<WebhookResponse> {
    return await this.http.fetch<WebhookResponse>(
      `${this.http.baseUrl}/webhooks`,
      { method: "POST", body, errorContext: "Create Webhook" },
    );
  }

  /**
   * Replaces the configuration of an existing webhook.
   *
   * @param params - `webhookId` (UUID) plus the full updated webhook definition.
   * @returns The updated webhook resource.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async updateWebhook({
    webhookId,
    ...body
  }: UpdateWebhookInput): Promise<WebhookResponse> {
    return await this.http.fetch<WebhookResponse>(
      `${this.http.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      { method: "PUT", body, errorContext: "Update Webhook" },
    );
  }

  /**
   * Deletes a webhook by UUID.
   *
   * @param params - `webhookId`: UUID of the webhook to delete.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async deleteWebhook({ webhookId }: WebhookIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      { method: "DELETE", errorContext: "Delete Webhook" },
    );
  }

  /**
   * Fires all webhooks in the workspace as a test, regardless of their trigger conditions.
   *
   * @throws ToolError if the request fails.
   */
  async executeWebhooks(): Promise<WebhookExecutionResponse> {
    return await this.http.fetch<WebhookExecutionResponse>(
      `${this.http.baseUrl}/webhooks/execute`,
      { method: "POST", body: {}, errorContext: "Execute Webhooks" },
    );
  }

  /**
   * Fires a specific webhook as a test, regardless of its trigger conditions.
   *
   * @param params - `webhookId`: UUID of the webhook to execute.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async executeWebhook({
    webhookId,
  }: WebhookIdInput): Promise<WebhookExecutionResponse> {
    return await this.http.fetch<WebhookExecutionResponse>(
      `${this.http.baseUrl}/webhooks/${encodeURIComponent(webhookId)}/execute`,
      { method: "POST", body: {}, errorContext: "Execute Webhook" },
    );
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      listWebhooks: this.listWebhooks.bind(this),
      getWebhook: this.getWebhook.bind(this),
      createWebhook: this.createWebhook.bind(this),
      updateWebhook: this.updateWebhook.bind(this),
      deleteWebhook: this.deleteWebhook.bind(this),
      executeWebhooks: this.executeWebhooks.bind(this),
      executeWebhook: this.executeWebhook.bind(this),
    };
  }
}
