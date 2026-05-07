import type { FieldValues } from "../../config/field-resolution.types";

/** In-memory cache for field metadata, keyed by projectKey → fieldKey → name→ID map. */
export class Cache {
  private readonly store = new Map<string, Map<string, FieldValues>>();

  get(projectKey: string, fieldKey: string): FieldValues | undefined {
    return this.store.get(projectKey)?.get(fieldKey);
  }

  set(projectKey: string, fieldKey: string, values: FieldValues): void {
    if (!this.store.has(projectKey)) {
      this.store.set(projectKey, new Map());
    }
    const existing = this.store.get(projectKey)?.get(fieldKey) ?? {};
    this.store.get(projectKey)?.set(fieldKey, { ...existing, ...values });
  }

  has(projectKey: string, fieldKey: string): boolean {
    return this.store.get(projectKey)?.has(fieldKey) ?? false;
  }

  clear(projectKey?: string): void {
    if (projectKey) {
      this.store.delete(projectKey);
    } else {
      this.store.clear();
    }
  }

  /** Case-insensitive lookup of a name within a cached field. */
  matchValue(
    projectKey: string,
    fieldKey: string,
    name: string,
  ): string | undefined {
    return this.get(projectKey, fieldKey)?.[name.toLowerCase()];
  }
}
