import { z } from "zod";

/**
 * Deep merge two objects and coerce the result to a target Zod schema.
 *
 * Merge rules:
 * - Values from `objectWithUpdates` take precedence over `baseObject`.
 * - `undefined` in `objectWithUpdates` is skipped (the base value is kept).
 * - `null` is treated as a real value and overwrites the base value.
 * - Plain objects are merged recursively; arrays and non-plain objects
 *   (e.g. Date, Map, class instances) are replaced completely.
 *
 * The merged result is parsed through `targetSchema` so the output shape/type
 * is guaranteed. The schema is deep-stripped first (see {@link deepStrip}), so
 * any key not declared in the schema - at any nesting level - is dropped rather
 * than causing a validation error, even when the schema is `.strict()`. Leaf
 * validations (min, regex, ...) still apply, and the return value is typed as
 * `z.infer<typeof targetSchema>`.
 *
 * @param baseObject - The base object to merge into (fallback values)
 * @param objectWithUpdates - The object with updates to apply (takes precedence)
 * @param targetSchema - The Zod schema the merged result must conform to
 * @returns The merged object, stripped to the schema shape and typed as `z.infer<typeof targetSchema>`
 */
export function deepMerge<S extends z.ZodTypeAny>(
  baseObject: Record<string, any>,
  objectWithUpdates: Record<string, any>,
  targetSchema: S,
): z.infer<S> {
  const merged = mergeValues(baseObject, objectWithUpdates);
  return deepStrip(targetSchema).parse(merged);
}

/** Recursively merge two arbitrary values, with `updated` taking precedence. */
function mergeValues(base: unknown, updated: unknown): unknown {
  // Skip undefined updates - don't include them in the merge.
  if (updated === undefined) {
    return base;
  }

  if (isPlainObject(base) && isPlainObject(updated)) {
    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(updated)) {
      if (updated[key] === undefined) {
        continue;
      }
      result[key] = mergeValues(base[key], updated[key]);
    }
    return result;
  }

  // Primitives, arrays, null, and non-plain objects: overwrite the whole value.
  return updated;
}

/** True only for plain object literals (not arrays, Dates, Maps, class instances, ...). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively rebuild a Zod schema so every object level strips unknown keys
 * instead of rejecting them. Only object strictness is loosened - leaf
 * validations and the inferred type are preserved - so parsing a superset
 * object yields exactly the schema's shape without throwing on extra keys.
 *
 * Handles the constructs used by the update-body schemas (object, array,
 * optional, nullable, default, record, union). Any other node is returned
 * unchanged, which means strict objects nested inside an unsupported wrapper
 * would not be loosened - none exist in the current schemas.
 */
export function deepStrip<T extends z.ZodTypeAny>(schema: T): T {
  return stripNode(schema) as unknown as T;
}

function stripNode(schema: z.ZodTypeAny): z.ZodTypeAny {
  // biome-ignore lint/suspicious/noExplicitAny: traversing zod's internal defs
  const def = schema.def as any;

  switch (def.type) {
    case "object": {
      const shape = def.shape as Record<string, z.ZodTypeAny>;
      const strippedShape: Record<string, z.ZodTypeAny> = {};
      for (const key of Object.keys(shape)) {
        strippedShape[key] = stripNode(shape[key]);
      }
      // z.object strips unknown keys by default in zod v4.
      return z.object(strippedShape);
    }
    case "array":
      return z.array(stripNode(def.element));
    case "optional":
      return z.optional(stripNode(def.innerType));
    case "nullable":
      return z.nullable(stripNode(def.innerType));
    case "default":
      return stripNode(def.innerType).default(def.defaultValue);
    case "record":
      return z.record(def.keyType, stripNode(def.valueType));
    case "union":
      return z.union(
        def.options.map((option: z.ZodTypeAny) => stripNode(option)),
      );
    default:
      return schema;
  }
}
