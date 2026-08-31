/**
 * Portability fixes for the JSON Schema we advertise to MCP clients.
 *
 * The generated API schemas use `zod.looseObject(...)`, which is sugar for
 * `.catchall(z.unknown())`. Zod serialises `z.unknown()` as the empty schema,
 * so every loose object emits `"additionalProperties": {}`.
 *
 * That is valid JSON Schema and semantically identical to `true`, but some
 * clients reject it: Gemini CLI validates tool declarations with
 * `additionalProperties` typed as a boolean and fails discovery with
 * `Expected boolean, received object`, while the Gemini Developer API rejects
 * the keyword outright as an unknown field. Omitting the keyword means the
 * same thing as `{}` in JSON Schema and is accepted by both, so we strip it
 * rather than rewriting it to `true`.
 *
 * We must not instead tighten the schemas to `z.object(...)`: with
 * `io: "output"` that emits `"additionalProperties": false`, and real API
 * responses carrying extra fields would then fail client-side validation of
 * `structuredContent`.
 */

/** Keywords whose values are maps of *arbitrary names* to schemas. */
const SCHEMA_MAP_KEYWORDS = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The `{}` Zod emits for `z.unknown()` — an object carrying no keywords. */
function isEmptySchemaObject(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function walkSchema(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(walkSchema);
  }
  if (!isPlainObject(node)) {
    return node;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "additionalProperties" && isEmptySchemaObject(value)) {
      continue;
    }
    result[key] = SCHEMA_MAP_KEYWORDS.has(key)
      ? walkSchemaMap(value)
      : walkSchema(value);
  }
  return result;
}

/**
 * Walks a map of names to schemas. Kept separate from {@link walkSchema} so a
 * property that happens to be *named* `additionalProperties` is treated as a
 * property rather than as the keyword.
 */
function walkSchemaMap(node: unknown): unknown {
  if (!isPlainObject(node)) {
    return node;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = walkSchema(value);
  }
  return result;
}

/**
 * Returns a copy of `schema` with every `"additionalProperties": {}` removed.
 * The input is not mutated — Zod may hand back a memoised object.
 */
export function stripEmptyAdditionalProperties<T>(schema: T): T {
  return walkSchema(schema) as T;
}

type JsonSchemaConverter = (options: unknown) => unknown;

interface StandardSchemaProps {
  jsonSchema?: {
    input?: JsonSchemaConverter;
    output?: JsonSchemaConverter;
  };
}

function patchConverter(
  converter: JsonSchemaConverter | undefined,
): JsonSchemaConverter | undefined {
  if (!converter) {
    return converter;
  }
  return (options: unknown) =>
    stripEmptyAdditionalProperties(converter(options));
}

/**
 * Wraps a Standard Schema so the JSON Schema handed to MCP clients goes through
 * {@link stripEmptyAdditionalProperties}.
 *
 * `standardSchemaToJsonSchema` in `@modelcontextprotocol/server` prefers
 * `~standard.jsonSchema` over its own Zod conversion, so overriding that hook
 * changes only what is *advertised*. `~standard.validate` is left alone, so
 * `structuredContent` is still validated by Zod exactly as before.
 *
 * A proxy is used rather than a fresh object so the result still behaves like
 * the underlying Zod schema (`.shape`, `.def`, `.parse`) for everything else.
 */
export function withPortableJsonSchema<T>(schema: T): T {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }
  const standard = (schema as Record<string, unknown>)["~standard"] as
    | StandardSchemaProps
    | undefined;
  if (!standard?.jsonSchema) {
    return schema;
  }
  const patched = {
    ...standard,
    jsonSchema: {
      ...standard.jsonSchema,
      input: patchConverter(standard.jsonSchema.input),
      output: patchConverter(standard.jsonSchema.output),
    },
  };
  return new Proxy(schema as object, {
    get(target, prop) {
      if (prop === "~standard") {
        return patched;
      }
      const value = Reflect.get(target, prop);
      // Bind methods to the target so Zod's internals never see the proxy.
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}
