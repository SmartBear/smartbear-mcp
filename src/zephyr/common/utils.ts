function objectsCanBeMerged<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(baseObject: T, objectWithUpdates: U, key: Extract<keyof U, string>): boolean {
  return Boolean(
    objectWithUpdates[key] &&
      typeof objectWithUpdates[key] === "object" &&
      !Array.isArray(objectWithUpdates[key]) &&
      baseObject[key] &&
      typeof baseObject[key] === "object" &&
      !Array.isArray(baseObject[key]),
  );
}

/**
 * Deep merge two objects, with properties from 'updates' taking precedence.
 * For nested objects, this merges rather than replaces them entirely.
 *
 * @param baseObject - The base object to merge into
 * @param objectWithUpdates - The object with updates to apply
 * @returns The merged object
 */
export function deepMerge<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(baseObject: T, objectWithUpdates: U): T {
  const result: Record<string, unknown> = { ...baseObject };

  const keysToApply = (
    Object.keys(objectWithUpdates) as Extract<keyof U, string>[]
  ).filter((key) => objectWithUpdates[key] !== undefined);

  for (const key of keysToApply) {
    if (objectsCanBeMerged(baseObject, objectWithUpdates, key)) {
      // Deep merge nested objects (like customFields)
      result[key] = deepMerge(
        baseObject[key] as Record<string, unknown>,
        objectWithUpdates[key] as Record<string, unknown>,
      );
    } else {
      // For primitives, arrays, and null values, just overwrite
      result[key] = objectWithUpdates[key];
    }
  }

  return result as T;
}
