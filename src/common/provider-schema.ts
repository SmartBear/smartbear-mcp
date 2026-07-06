import { type ZodType, z } from "zod";

/**
 * LLM providers whose Structured Output / JSON Schema modes enforce a
 * restricted subset of JSON Schema.
 *
 * See the investigation write-up for the full context (TM4J-17877):
 * https://smartbear.atlassian.net/wiki/spaces/KT/pages/6447890562
 */
export type LlmProvider = "openai" | "gemini";

/** Loosely-typed JSON Schema node. */
export type JsonSchema = Record<string, unknown>;

/**
 * Context object passed to Zod v4's `toJSONSchema` `override` callback, invoked
 * once per generated JSON Schema node. Mutating `jsonSchema` in place rewrites
 * the emitted node.
 */
interface OverrideContext {
  jsonSchema: JsonSchema;
}

/**
 * Rewrites the `X | null` union that Zod emits for `.nullable()` /`.nullish()`
 * into a JSON Schema type-array (`{ "type": ["object", "null"] }`).
 *
 * By default Zod v4 serialises a nullable type as
 * `{ "anyOf": [ <schema>, { "type": "null" } ] }`. OpenAI's Structured Outputs
 * reject `anyOf` that contains a `null` branch; the only nullable form they
 * accept is the type-array pattern. This override folds the two branches back
 * into a single node so nullable objects (and primitives) stay compatible.
 *
 * Genuine multi-type unions (e.g. `z.union([z.string(), z.number()]).nullable()`)
 * are intentionally left untouched — they cannot be expressed as a type-array
 * and remain unsupported by both providers.
 */
export function foldNullableUnionsForOpenAi(ctx: OverrideContext): void {
  const js = ctx.jsonSchema;
  const anyOf = js.anyOf;
  if (!Array.isArray(anyOf) || anyOf.length !== 2) {
    return;
  }

  const nullBranch = anyOf.find((s) => s?.type === "null");
  const realBranch = anyOf.find((s) => s?.type !== "null");
  // Only fold `<single-typed schema> | null`. If the non-null branch has no
  // concrete `type` (e.g. it is itself a union), a type-array cannot represent
  // it, so leave the schema as-is.
  if (!nullBranch || !realBranch || realBranch.type === undefined) {
    return;
  }

  delete js.anyOf;
  Object.assign(js, realBranch);
  js.type = Array.isArray(realBranch.type)
    ? [...realBranch.type, "null"]
    : [realBranch.type, "null"];
}

/**
 * Converts a Zod schema to a JSON Schema that the given LLM provider's
 * structured-output mode accepts — in particular, one that keeps **nullable
 * objects** valid instead of tripping the provider's `anyOf`/union restrictions.
 *
 * - `openai`: emits draft-2020-12 and folds `X | null` unions into the
 *   `{ "type": [..., "null"] }` type-array form OpenAI requires.
 * - `gemini`: emits the OpenAPI 3.0 dialect, which expresses nullability as the
 *   `nullable: true` annotation Gemini / Vertex AI expects.
 *
 * Model fields as `.nullable()` (not `.nullish()`): both providers require every
 * declared property to be present, so keep the key required and let it be
 * nullable rather than optional.
 */
export function toProviderSchema(
  schema: ZodType,
  provider: LlmProvider,
): JsonSchema {
  if (provider === "gemini") {
    return z.toJSONSchema(schema, { target: "openapi-3.0" }) as JsonSchema;
  }
  return z.toJSONSchema(schema, {
    target: "draft-2020-12",
    override: foldNullableUnionsForOpenAi,
  }) as JsonSchema;
}
