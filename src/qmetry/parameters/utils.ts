import { PARAM_REGISTRY } from "./index.js";
import { EntityKey } from "../config/constants.js";

const memoCache = new Map<string, any[]>();

/**
 * Get parameters by entity name + list of fields.
 * @param entity One of "testcase" | "testsuite" | "requirement"
 * @param names Array of parameter names to fetch
 */
export function getParams<
  T extends EntityKey,
  R extends (typeof PARAM_REGISTRY)[T]
>(entity: T, names: R[number]["name"][]) {
  const key = `${entity}:${names.join(",")}`;
  if (memoCache.has(key)) return memoCache.get(key)!;

  const registry = PARAM_REGISTRY[entity];
  if (!registry) throw new Error(`Unknown entity: ${entity}`);

  const nameSet = new Set(names);
  const params = registry.filter((p) => nameSet.has(p.name));

  // Warn if any requested names are missing in registry
  const missing = names.filter((n) => !params.some((p) => p.name === n));
  if (missing.length > 0) {
    console.warn(
      `[getParams] Unknown params for ${entity}: ${missing.join(", ")}`
    );
  }

  memoCache.set(key, params);
  return params;
}