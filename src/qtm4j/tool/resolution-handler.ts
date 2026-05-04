/**
 * Field Resolution Utilities for Tools
 *
 * Provides withResolution() — a higher-order function that wraps a tool handler
 * with automatic field resolution. Tools use this instead of extending a base class.
 *
 * Usage:
 *   handle = withResolution(() => this.client, Schema, RESOLUTION_CONFIG,
 *     async (args, resolved, context, warnings) => { ... })
 */
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, ZodSchema } from "zod";
import type { Client } from "../../common/types";
import type { ProjectContext } from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";
import type { FieldResolver } from "../resolver";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FieldResolutionConfig {
  readonly inputField: string;
  readonly fieldKey: string;
}

export type ResolvedFieldMap = Map<string, number | number[]>;

export interface ResolvableClient extends Client {
  getApiClient(): ApiClient;
  getFieldResolver(): FieldResolver;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WARNING_SKIPPED = (field: string, value: string) =>
  `Skipped ${field} '${value}' — not available in the current project.`;

// ─── HOF ─────────────────────────────────────────────────────────────────────

export function withResolution<T extends ResolvableClient>(
  getClient: () => T,
  schema: ZodSchema<any>,
  config: FieldResolutionConfig[],
  execute: (
    args: Record<string, unknown>,
    resolved: ResolvedFieldMap,
    context: ProjectContext,
    warnings: string[],
    // biome-ignore lint: return type matches ToolCallback contract
  ) => Promise<any>,
): ToolCallback<ZodRawShape> {
  return async (rawArgs) => {
    const client = getClient();
    const args = schema.parse(rawArgs) as Record<string, unknown>;

    // Context lives in FieldResolver — throws if not set
    const fieldResolver = client.getFieldResolver();
    const context = fieldResolver.requireProjectContext();

    const { resolved, warnings } = await resolveFields(
      fieldResolver,
      config,
      args,
    );

    return execute(args, resolved, context, warnings);
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function buildResolvedBody(
  args: Record<string, unknown>,
  resolved: ResolvedFieldMap,
  extraFields?: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...args, ...extraFields };
  for (const [field, value] of resolved) {
    body[field] = value;
  }
  return body;
}

// ─── Private ─────────────────────────────────────────────────────────────────

async function resolveFields(
  resolver: FieldResolver,
  config: FieldResolutionConfig[],
  args: Record<string, unknown>,
): Promise<{ resolved: ResolvedFieldMap; warnings: string[] }> {
  const resolved: ResolvedFieldMap = new Map();
  const warnings: string[] = [];

  await Promise.all(
    config
      .filter(({ inputField }) => args[inputField] != null)
      .map(({ inputField, fieldKey }) =>
        resolveField(
          resolver,
          fieldKey,
          inputField,
          args[inputField],
          resolved,
          warnings,
        ),
      ),
  );

  return { resolved, warnings };
}

async function resolveField(
  resolver: FieldResolver,
  fieldKey: string,
  inputField: string,
  value: unknown,
  resolved: ResolvedFieldMap,
  warnings: string[],
): Promise<void> {
  const names = Array.isArray(value) ? (value as string[]) : [value as string];
  const ids: number[] = [];

  for (const name of names) {
    const id = await resolver.resolve(fieldKey, name);
    if (id !== undefined) {
      ids.push(Number(id));
    } else {
      warnings.push(WARNING_SKIPPED(inputField, name));
    }
  }

  if (ids.length > 0) {
    resolved.set(inputField, Array.isArray(value) ? ids : ids[0]);
  }
}
