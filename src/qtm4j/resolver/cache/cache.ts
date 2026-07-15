import type { CacheService } from "../../../common/cache.ts";
import type { FieldValues } from "../../config/field-resolution.types.ts";

/** In-memory cache for field metadata, keyed by projectKey → fieldKey → name→ID map. */
export class Cache {
  private readonly trackedKeys = new Map<string, Set<string>>();
  private readonly cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  private compositeKey(projectKey: string, fieldKey: string): string {
    return `qtm4j:${projectKey}:${fieldKey}`;
  }

  get(projectKey: string, fieldKey: string): FieldValues | undefined {
    return this.cacheService.get<FieldValues>(
      this.compositeKey(projectKey, fieldKey),
    );
  }

  set(projectKey: string, fieldKey: string, values: FieldValues): void {
    const key = this.compositeKey(projectKey, fieldKey);
    const existing =
      this.cacheService.get<FieldValues>(key) ?? ({} as FieldValues);
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
  ): string | undefined {
    return this.get(projectKey, fieldKey)?.[name.toLowerCase()];
  }
}
