import type { CacheService } from "../../../common/cache";

/** In-memory cache for field metadata, keyed by projectKey → fieldKey → name→value map. */
export class Cache<V = string> {
  private readonly trackedKeys = new Map<string, Set<string>>();
  private readonly cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  private compositeKey(projectKey: string, fieldKey: string): string {
    return `qtm4j:${projectKey}:${fieldKey}`;
  }

  get(projectKey: string, fieldKey: string): Record<string, V> | undefined {
    return this.cacheService.get<Record<string, V>>(
      this.compositeKey(projectKey, fieldKey),
    );
  }

  set(projectKey: string, fieldKey: string, values: Record<string, V>): void {
    const key = this.compositeKey(projectKey, fieldKey);
    const existing =
      this.cacheService.get<Record<string, V>>(key) ??
      ({} as Record<string, V>);
    this.cacheService.set(key, { ...existing, ...values });
    if (!this.trackedKeys.has(projectKey)) {
      this.trackedKeys.set(projectKey, new Set());
    }
    this.trackedKeys.get(projectKey)?.add(key);
  }

  has(projectKey: string, fieldKey: string): boolean {
    return (
      this.cacheService.get(this.compositeKey(projectKey, fieldKey)) !==
      undefined
    );
  }

  clear(projectKey?: string): void {
    if (projectKey) {
      const keys = this.trackedKeys.get(projectKey);
      if (keys) {
        for (const key of keys) {
          this.cacheService.del(key);
        }
        this.trackedKeys.delete(projectKey);
      }
    } else {
      for (const keys of this.trackedKeys.values()) {
        for (const key of keys) {
          this.cacheService.del(key);
        }
      }
      this.trackedKeys.clear();
    }
  }

  /** Case-insensitive lookup of a name within a cached field. */
  matchValue(
    projectKey: string,
    fieldKey: string,
    name: string,
  ): V | undefined {
    return this.get(projectKey, fieldKey)?.[name.toLowerCase()];
  }
}
export type { FieldValues };
