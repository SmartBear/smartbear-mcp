/**
 * Field Resolution Utilities for Tools
 *
 * Provides withResolution() — a function that performs field resolution
 * and returns a ready-to-use body with resolved IDs.
 *
 * Usage:
 *   const { body, warnings } = await withResolution(
 *     () => this.client, Schema, RESOLUTION_CONFIG, rawArgs, extraFields
 *   );
 */
import type { ZodSchema } from "zod";
import type { ProjectContext } from "../config/field-resolution.types";
import type { FieldResolver } from "../resolver";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FieldResolutionConfig {
  readonly inputField: string;
  readonly fieldKey: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WARNING_SKIPPED = (field: string, value: string) =>
  `Skipped ${field} '${value}' — not available in the current project.`;

// ─── Resolution Function ─────────────────────────────────────────────────────

/**
 * Performs field resolution for tool input and returns a ready-to-use body.
 *
 * Steps:
 * 1. Parses and validates input with schema
 * 2. Validates project context is set
 * 3. Builds initial body with args + extra fields
 * 4. Resolves fields and updates body directly (no intermediate map)
 * 5. Returns body with resolved IDs already in place
 *
 * @param getClient - Function that returns the client instance
 * @param schema - Zod schema for input validation
 * @param config - Field resolution configuration
 * @param rawArgs - Raw input arguments
 * @param extraFields - Additional fields to merge into the body (e.g., projectId)
 * @returns Object with final body (resolved IDs in place), context, and warnings
 */
export async function withResolution(
  getClient: () => any,
  schema: ZodSchema<any>,
  config: FieldResolutionConfig[],
  rawArgs: any,
  extraFields?: Record<string, unknown>,
): Promise<{
  body: Record<string, unknown>;
  context: ProjectContext;
  warnings: string[];
}> {
  const client = getClient();
  const args = schema.parse(rawArgs) as Record<string, unknown>;

  // Context lives in FieldResolver — throws if not set
  const fieldResolver = client.getFieldResolver();
  const context = fieldResolver.requireProjectContext();

  // Build body with args + extra fields
  const body: Record<string, unknown> = { ...args, ...extraFields };

  // Resolve fields directly into body (no intermediate map!)
  const warnings = await resolveFieldsIntoBody(fieldResolver, config, body);

  return { body, context, warnings };
}

// ─── Private Utilities ───────────────────────────────────────────────────────

/**
 * Resolves fields and updates the body directly.
 * No intermediate Map - resolvers update body in place.
 */
async function resolveFieldsIntoBody(
  resolver: FieldResolver,
  config: FieldResolutionConfig[],
  body: Record<string, unknown>,
): Promise<string[]> {
  const warnings: string[] = [];

  await Promise.all(
    config
      .filter(({ inputField }) => body[inputField] != null)
      .map(({ inputField, fieldKey }) =>
        resolveFieldIntoBody(resolver, fieldKey, inputField, body, warnings),
      ),
  );

  return warnings;
}

/**
 * Resolves a single field and updates the body directly.
 */
async function resolveFieldIntoBody(
  resolver: FieldResolver,
  fieldKey: string,
  inputField: string,
  body: Record<string, unknown>,
  warnings: string[],
): Promise<void> {
  const value = body[inputField];
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

  // Update body directly with resolved ID(s)
  if (ids.length > 0) {
    body[inputField] = Array.isArray(value) ? ids : ids[0];
  }
}
