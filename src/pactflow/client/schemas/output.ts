/**
 * OUTPUT SCHEMAS
 *
 * Maps each PactFlow tool handler to the Zod schema describing its
 * `structuredContent`. The schemas live next to the tool inputs and response
 * types of the API area that implements the handler, e.g. `pacticipant-api.ts`
 * and `pacticipant-schemas.ts`.
 */

import { z } from "zod";
import Bugsnag from "../../../common/bugsnag";
import { AI_OUTPUT_SCHEMAS } from "../ai";
import { ADMIN_OUTPUT_SCHEMAS } from "./admin";
import { PaginationOutputSchema } from "./common";
import { CONTRACT_OUTPUT_SCHEMAS } from "./contract";
import { ENVIRONMENT_OUTPUT_SCHEMAS } from "./environment";
import { PACTICIPANT_OUTPUT_SCHEMAS } from "./pacticipant";
import { WEBHOOK_OUTPUT_SCHEMAS } from "./webhook";

/**
 * A schema shared through `$defs` (see `named`) would be advertised as a bare
 * `$ref` when it is the root. Extending it yields an unnamed copy, so the root
 * stays an inline object and only its nested schemas are referenced.
 */
const asRoot = (schema: z.ZodType): z.ZodType =>
  schema instanceof z.ZodObject ? schema.extend({}) : schema;

export const PACTFLOW_OUTPUT_SCHEMAS: Record<string, z.ZodType> =
  Object.fromEntries(
    Object.entries({
      ...ADMIN_OUTPUT_SCHEMAS,
      ...CONTRACT_OUTPUT_SCHEMAS,
      ...ENVIRONMENT_OUTPUT_SCHEMAS,
      ...PACTICIPANT_OUTPUT_SCHEMAS,
      ...WEBHOOK_OUTPUT_SCHEMAS,
      ...AI_OUTPUT_SCHEMAS,
    }).map(([handler, schema]) => [handler, asRoot(schema)]),
  );

/** `withPagination` adds a `pagination` object to every paginated result. */
export function withPaginationOutput(schema: z.ZodType): z.ZodType {
  return schema instanceof z.ZodObject
    ? schema.extend({ pagination: PaginationOutputSchema.optional() })
    : schema;
}

const reportedTools = new Set<string>();

function describeIssues(issues: ReadonlyArray<z.core.$ZodIssue>): string {
  return issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")
    .slice(0, 1000);
}

/**
 * Advertises `schema` to clients but does not enforce it. The MCP SDK fails a
 * tool call whose `structuredContent` does not match the output schema, after
 * the request has already been made; the schemas are derived from the OpenAPI
 * description and real brokers deviate from it, so a mismatch is reported once
 * per tool and the response is returned unchanged.
 */
export function advisoryOutputSchema(
  schema: z.ZodType,
  toolName: string,
): z.ZodType {
  const standard = schema["~standard"];
  const advisory = {
    ...standard,
    validate: async (value: unknown) => {
      const result = await standard.validate(value);
      if (!result.issues?.length) return result;
      if (!reportedTools.has(toolName)) {
        reportedTools.add(toolName);
        const message = `Response of ${toolName} does not match its output schema: ${describeIssues(result.issues as z.core.$ZodIssue[])}`;
        console.error(`[PactFlow] ${message}`);
        Bugsnag.notify(new Error(message), (event) => {
          event.severity = "warning";
          event.addMetadata("app", { tool: toolName });
        });
      }
      return { value };
    },
  };
  return new Proxy(schema, {
    get: (target, property) =>
      property === "~standard" ? advisory : Reflect.get(target, property),
  });
}
