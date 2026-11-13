/**
 * Webhook schemas: tool inputs, API responses (output schemas) and the types derived from them.
 *
 * Output schemas were written from the PactFlow OpenAPI description and are
 * maintained by hand; they are not generated, so update them when the API
 * changes. They are deliberately lenient: every property is optional, objects
 * accept extra fields and formats (uuid, date-time, ...) are not enforced. The
 * same tools also run against OSS Pact Brokers whose responses are a subset of
 * PactFlow's, and validation is advisory (see `advisoryOutputSchema`).
 */
import { z } from "zod";
import {
  EmbeddedLinkOutputSchema,
  EmbeddedTeamOutputSchema,
  EmptyOutputSchema,
  named,
} from "./common";

export const EmbeddedWebhookOutputSchema = named(
  "EmbeddedWebhook",
  z.looseObject({
    consumerName: z.string().optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    providerName: z.string().optional(),
    teamUuid: z.string().optional(),
    uuid: z.string().optional(),
    _embedded: z
      .looseObject({
        team: EmbeddedTeamOutputSchema.optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const WebhooksOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      webhooks: z.array(EmbeddedWebhookOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      "pb:create": EmbeddedLinkOutputSchema.optional(),
      "pb:webhooks": z.array(EmbeddedLinkOutputSchema).optional(),
      curies: z.array(EmbeddedLinkOutputSchema).optional(),
    })
    .optional(),
});

export const WebhookOutputSchema = z.looseObject({
  consumer: z
    .looseObject({
      name: z.string().optional(),
    })
    .optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  events: z
    .array(
      z.looseObject({
        name: z.string().optional(),
      }),
    )
    .optional(),
  provider: z
    .looseObject({
      name: z.string().optional(),
    })
    .optional(),
  request: z
    .looseObject({
      body: z.unknown().optional(),
      headers: z
        .looseObject({})
        .describe(
          "Request headers. Values support template expressions and auth helper functions.",
        )
        .optional(),
      method: z.string().optional(),
      password: z.string().optional(),
      url: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
  teamUuid: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  uuid: z.string().optional(),
  _embedded: z
    .looseObject({
      team: EmbeddedTeamOutputSchema.optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      "pb:execute": EmbeddedLinkOutputSchema.optional(),
      "pb:consumer": EmbeddedLinkOutputSchema.optional(),
      "pb:provider": EmbeddedLinkOutputSchema.optional(),
      "pb:pact-webhooks": EmbeddedLinkOutputSchema.optional(),
      "pb:webhooks": EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const UnsavedWebhookExecutionResultOutputSchema = z.looseObject({
  logs: z.string().optional(),
  message: z.string().optional(),
  request: z
    .looseObject({
      headers: z.looseObject({}).optional(),
      url: z.string().optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  response: z
    .looseObject({
      headers: z.looseObject({}).optional(),
      status: z.number().optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  success: z.boolean().optional(),
  _links: z
    .looseObject({
      "try-again": EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const WebhookExecutionResultOutputSchema = z.looseObject({
  logs: z.string().optional(),
  message: z.string().optional(),
  request: z
    .looseObject({
      headers: z.looseObject({}).optional(),
      url: z.string().optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  response: z
    .looseObject({
      headers: z.looseObject({}).optional(),
      status: z.number().optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  success: z.boolean().optional(),
  _links: z
    .looseObject({
      "try-again": EmbeddedLinkOutputSchema.optional(),
      webhook: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

const WebhookRequestSchema = z.object({
  method: z.literal("POST").describe("HTTP method (must be POST)"),
  url: z.string().url().describe("URL to send the webhook request to"),
  body: z.any().optional().describe("Request body to send"),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe("HTTP headers to include"),
  username: z.string().optional().describe("Username for basic auth"),
  password: z.string().optional().describe("Password for basic auth"),
});

const WebhookEventSchema = z.object({
  name: z
    .string()
    .describe(
      "Event name (e.g. 'contract_content_changed', 'provider_verification_published')",
    ),
});

export const CreateWebhookSchema = z.object({
  description: z.string().describe("Human-readable description of the webhook"),
  events: z
    .array(WebhookEventSchema)
    .min(1)
    .describe("Events that trigger this webhook"),
  request: WebhookRequestSchema.describe("HTTP request to send when triggered"),
  consumer: z
    .object({ name: z.string() })
    .optional()
    .describe("Restrict to a specific consumer (omit for all)"),
  provider: z
    .object({ name: z.string() })
    .optional()
    .describe("Restrict to a specific provider (omit for all)"),
  enabled: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the webhook is enabled"),
  teamUuid: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("UUID of the owning team (null for global)"),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  webhookId: z.string().describe("UUID of the webhook to update"),
  description: z.string().optional().describe("Human-readable description"),
  events: z
    .array(WebhookEventSchema)
    .optional()
    .describe("Events that trigger this webhook"),
  request: WebhookRequestSchema.optional().describe(
    "HTTP request to send when triggered",
  ),
  consumer: z
    .object({ name: z.string() })
    .nullable()
    .optional()
    .describe("Restrict to a specific consumer"),
  provider: z
    .object({ name: z.string() })
    .nullable()
    .optional()
    .describe("Restrict to a specific provider"),
  enabled: z.boolean().optional().describe("Whether the webhook is enabled"),
  teamUuid: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("UUID of the owning team"),
});

export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

export const WebhookIdSchema = z.object({
  webhookId: z.string().describe("UUID of the webhook"),
});

export type WebhookIdInput = z.infer<typeof WebhookIdSchema>;

/** Output schema of each webhook handler, keyed by handler name. */
export const WEBHOOK_OUTPUT_SCHEMAS = {
  listWebhooks: WebhooksOutputSchema,
  getWebhook: WebhookOutputSchema,
  createWebhook: WebhookOutputSchema,
  updateWebhook: WebhookOutputSchema,
  executeWebhooks: UnsavedWebhookExecutionResultOutputSchema,
  executeWebhook: WebhookExecutionResultOutputSchema,
  deleteWebhook: EmptyOutputSchema,
};

export type WebhooksListResponse = z.infer<
  (typeof WEBHOOK_OUTPUT_SCHEMAS)["listWebhooks"]
>;

export type WebhookResponse = z.infer<
  (typeof WEBHOOK_OUTPUT_SCHEMAS)["getWebhook"]
>;

export type WebhookExecutionResponse = z.infer<
  (typeof WEBHOOK_OUTPUT_SCHEMAS)["executeWebhook"]
>;
