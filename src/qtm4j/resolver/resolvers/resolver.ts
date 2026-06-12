import type { ProjectContext } from "../../config/field-resolution.types.ts";

/**
 * Abstract base class all resolvers must extend.
 *
 * resolve()         — field resolvers: iterate input names, call resolveAndReturn per name,
 *                     replace body[inputField] with resolved IDs.
 * resolveAndReturn() — core logic per resolver: cache → API → cache (field resolvers),
 *                     or batch API call (TestCaseUidResolver).
 * clearCache()      — evict cached data for a project (or all).
 * fieldKeys         — resolver keys this resolver handles (used by ResolverRegistry lookup).
 */
export abstract class Resolver {
  readonly fieldKeys: readonly string[] = [];

  abstract resolve(
    inputField: string,
    resolverKey: string,
    body: Record<string, unknown>,
    context: ProjectContext,
    warnings: string[],
  ): Promise<void>;

  abstract resolveAndReturn(...args: unknown[]): Promise<unknown>;

  abstract clearCache(projectKey?: string): void;
}
