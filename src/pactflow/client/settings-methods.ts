import type {
  AuditInput,
  AuditLogResponse,
  CreateSecretInput,
  CreateWebhookInput,
  CurrentUser,
  RegenerateTokenInput,
  RegenerateTokenResponse,
  Secret,
  SecretIdInput,
  SecretsResponse,
  SystemPreferences,
  TokensResponse,
  UpdateSecretInput,
  UpdateWebhookInput,
  UserPreferences,
  Webhook,
  WebhookExecutionResponse,
  WebhookIdInput,
  WebhooksResponse,
} from "./base";
import { PactflowBaseClient } from "./base-client";
import { toQueryString } from "./utils";

export abstract class PactflowSettingsMethods extends PactflowBaseClient {
  /**
   * Retrieves all webhooks configured in the workspace.
   *
   * @returns List of webhook definitions and their trigger configurations.
   * @throws ToolError if the request fails.
   */
  async listWebhooks(): Promise<WebhooksResponse> {
    return await this.fetchJson<WebhooksResponse>(`${this.baseUrl}/webhooks`, {
      method: "GET",
      errorContext: "List Webhooks",
    });
  }

  /**
   * Retrieves the configuration for a specific webhook by UUID.
   *
   * @param params - `webhookId`: UUID of the webhook.
   * @returns Webhook definition including its URL, events, and consumer/provider filters.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async getWebhook({ webhookId }: WebhookIdInput): Promise<Webhook> {
    return await this.fetchJson<Webhook>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
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
  async createWebhook(body: CreateWebhookInput): Promise<Webhook> {
    return await this.fetchJson<Webhook>(`${this.baseUrl}/webhooks`, {
      method: "POST",
      body,
      errorContext: "Create Webhook",
    });
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
  }: UpdateWebhookInput): Promise<Webhook> {
    return await this.fetchJson<Webhook>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
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
    return await this.fetchJson<void>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      { method: "DELETE", errorContext: "Delete Webhook" },
    );
  }

  /**
   * Fires all webhooks in the workspace as a test, regardless of their trigger conditions.
   *
   * @throws ToolError if the request fails.
   */
  async executeWebhooks(): Promise<WebhookExecutionResponse> {
    return await this.fetchJson<WebhookExecutionResponse>(
      `${this.baseUrl}/webhooks/execute`,
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
    return await this.fetchJson<WebhookExecutionResponse>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}/execute`,
      { method: "POST", body: {}, errorContext: "Execute Webhook" },
    );
  }

  /**
   * Retrieves all secrets stored in the workspace (names only, not values).
   *
   * @returns List of secret metadata.
   * @throws ToolError if the request fails.
   */
  async listSecrets(): Promise<SecretsResponse> {
    return await this.fetchJson<SecretsResponse>(`${this.baseUrl}/secrets`, {
      method: "GET",
      errorContext: "List Secrets",
    });
  }

  /**
   * Retrieves metadata for a specific secret by UUID (value is not returned).
   *
   * @param params - `secretId`: UUID of the secret.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async getSecret({ secretId }: SecretIdInput): Promise<Secret> {
    return await this.fetchJson<Secret>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "GET", errorContext: "Get Secret" },
    );
  }

  /**
   * Creates a new secret for use in webhook configurations.
   *
   * @param body - Secret name, description, and value.
   * @returns The created secret resource (value is not echoed back).
   * @throws ToolError if the request fails.
   */
  async createSecret(body: CreateSecretInput): Promise<Secret> {
    return await this.fetchJson<Secret>(`${this.baseUrl}/secrets`, {
      method: "POST",
      body,
      errorContext: "Create Secret",
    });
  }

  /**
   * Replaces the value and/or description of an existing secret.
   *
   * @param params - `secretId` (UUID) plus updated name, description, and/or value.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async updateSecret({
    secretId,
    ...body
  }: UpdateSecretInput): Promise<Secret> {
    return await this.fetchJson<Secret>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "PUT", body, errorContext: "Update Secret" },
    );
  }

  /**
   * Permanently deletes a secret from the workspace.
   *
   * @param params - `secretId`: UUID of the secret to delete.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async deleteSecret({ secretId }: SecretIdInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "DELETE", errorContext: "Delete Secret" },
    );
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   *
   * @returns Current user's name, email, roles, and active status.
   * @throws ToolError if the request fails.
   */
  async getCurrentUser(): Promise<CurrentUser> {
    return await this.fetchJson<CurrentUser>(`${this.baseUrl}/user`, {
      method: "GET",
      errorContext: "Get Current User",
    });
  }

  /**
   * Lists all API tokens associated with the current user's account.
   *
   * @returns Token metadata (IDs, descriptions) — values are not returned.
   * @throws ToolError if the request fails.
   */
  async listTokens(): Promise<TokensResponse> {
    return await this.fetchJson<TokensResponse>(
      `${this.baseUrl}/settings/tokens`,
      { method: "GET", errorContext: "List Tokens" },
    );
  }

  /**
   * Regenerates (rotates) an API token, invalidating the previous value.
   *
   * @param params - `tokenId`: The identifier of the token to regenerate.
   * @returns The new token value.
   * @throws ToolError if the token is not found or the request fails.
   */
  async regenerateToken({
    tokenId,
  }: RegenerateTokenInput): Promise<RegenerateTokenResponse> {
    return await this.fetchJson<RegenerateTokenResponse>(
      `${this.baseUrl}/settings/tokens/${encodeURIComponent(tokenId)}/regenerate`,
      { method: "POST", body: {}, errorContext: "Regenerate Token" },
    );
  }

  /**
   * Retrieves UI and notification preferences for the currently authenticated user.
   *
   * @returns User preference settings.
   * @throws ToolError if the request fails.
   */
  async getUserPreferences(): Promise<UserPreferences> {
    return await this.fetchJson<UserPreferences>(
      `${this.baseUrl}/preferences/current-user`,
      { method: "GET", errorContext: "Get User Preferences" },
    );
  }

  /**
   * Retrieves workspace-level system preferences and configuration.
   *
   * @returns System preference settings.
   * @throws ToolError if the request fails.
   */
  async getSystemPreferences(): Promise<SystemPreferences> {
    return await this.fetchJson<SystemPreferences>(
      `${this.baseUrl}/preferences/system`,
      { method: "GET", errorContext: "Get System Preferences" },
    );
  }

  /**
   * Retrieves the workspace audit log with optional filtering and pagination.
   *
   * @param params - Optional filters: `since` (ISO date), `userUuid`, `type`,
   *   `sort`, `from` cursor, `pageNumber`, and `pageSize`.
   * @returns Paginated list of audit events.
   * @throws ToolError if the request fails.
   */
  async getAuditLog(params: AuditInput): Promise<AuditLogResponse> {
    return await this.fetchJson<AuditLogResponse>(
      `${this.baseUrl}/audit${toQueryString({
        since: params.since,
        userUuid: params.userUuid,
        type: params.type,
        sort: params.sort,
        from: params.from,
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
      })}`,
      { method: "GET", errorContext: "Get Audit Log" },
    );
  }
}
