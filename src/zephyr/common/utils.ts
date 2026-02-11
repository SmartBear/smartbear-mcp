/**
 * Deep merge two objects, with properties from 'updates' taking precedence.
 * For nested objects, this merges rather than replaces them entirely.
 *
 * @param target - The base object to merge into
 * @param updates - The object with updates to apply
 * @returns The merged object
 */
export function deepMerge(target: any, updates: any): any {
  const result = { ...target };

  for (const key in updates) {
    if (updates[key] === undefined) {
      // Skip undefined values - don't include them in the merge
      continue;
    }

    if (
      updates[key] &&
      typeof updates[key] === "object" &&
      !Array.isArray(updates[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      // Deep merge nested objects (like customFields)
      result[key] = deepMerge(target[key], updates[key]);
    } else {
      // For primitives, arrays, and null values, just overwrite
      result[key] = updates[key];
    }
  }

  return result;
}
