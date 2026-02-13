type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends object
        ? DeepPartial<T[P]> | null
        : T[P] | null;
    }
  : T;

/**
 * Deep merge two objects, with properties from 'updates' taking precedence.
 * For nested objects, this merges rather than replaces them entirely.
 *
 * @param baseObject - The base object to merge into
 * @param objectWithUpdates - The object with updates to apply
 * @returns The merged object
 */
export function deepMerge<T extends Record<string, any>>(
  baseObject: T,
  objectWithUpdates: DeepPartial<T>,
): T {
  const result: Record<string, any> = { ...baseObject };

  for (const key in objectWithUpdates) {
    if (objectWithUpdates[key] === undefined) {
      // Skip undefined values - don't include them in the merge
      continue;
    }

    if (objectsCanBeMerged(baseObject, objectWithUpdates, key)) {
      // Deep merge nested objects (like customFields)
      result[key] = deepMerge(baseObject[key], objectWithUpdates[key]);
    } else {
      // For primitives, arrays, and null values, just overwrite
      result[key] = objectWithUpdates[key];
    }
  }

  return result as T;
}

function objectsCanBeMerged<T extends Record<string, any>>(
  baseObject: T,
  objectWithUpdates: DeepPartial<T>,
  key: Extract<keyof DeepPartial<T>, string>,
): boolean {
  return (
    objectWithUpdates[key] &&
    typeof objectWithUpdates[key] === "object" &&
    !Array.isArray(objectWithUpdates[key]) &&
    baseObject[key] &&
    typeof baseObject[key] === "object" &&
    !Array.isArray(baseObject[key])
  );
}
