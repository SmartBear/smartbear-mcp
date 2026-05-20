import type { CacheService } from "../../common/cache";
import type { ProjectContext } from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";
import { CommonAttributeResolver } from "./resolvers/common-attribute-resolver";
import { ComponentResolver } from "./resolvers/component-resolver";
import { LabelResolver } from "./resolvers/label-resolver";
import type { Resolver } from "./resolvers/resolver.ts";
import { TestCaseUidResolver } from "./resolvers/test-case-uid-resolver.ts";

const ERROR_NO_PROJECT_CONTEXT =
  "No active project set. Please call set_project_context before performing this operation.";

export class ResolverRegistry {
  private readonly resolverByKey: Map<string, Resolver>;
  private readonly commonAttributes: CommonAttributeResolver;
  private readonly testCaseUidResolver: TestCaseUidResolver;
  private projectContext: ProjectContext | undefined;

  constructor(apiClient: ApiClient, cacheService: CacheService) {
    this.commonAttributes = new CommonAttributeResolver(
      apiClient,
      cacheService,
    );
    this.testCaseUidResolver = new TestCaseUidResolver(apiClient);
    const labelResolver = new LabelResolver(apiClient, cacheService);
    const componentResolver = new ComponentResolver(apiClient, cacheService);

    this.resolverByKey = new Map();
    for (const resolver of [
      this.commonAttributes,
      labelResolver,
      componentResolver,
      this.testCaseUidResolver,
    ]) {
      for (const key of resolver.fieldKeys) {
        this.resolverByKey.set(key, resolver);
      }
    }
  }

  /**
   * Returns the resolver responsible for the given resolver key.
   * Tools use this with their FIELD_CONFIG map to dispatch field resolution.
   */
  getResolver(resolverKey: string): Resolver {
    const resolver = this.resolverByKey.get(resolverKey);
    if (!resolver)
      throw new Error(`No resolver registered for key '${resolverKey}'`);
    return resolver;
  }

  /**
   * Direct typed access to the CommonAttributeResolver, used by set_project_context to
   * eagerly load all common attribute fields (priority, statuses) for LLM NLP mapping.
   */
  getCommonAttributeResolver(): CommonAttributeResolver {
    return this.commonAttributes;
  }

  setProjectContext(context: ProjectContext): void {
    this.projectContext = context;
  }

  requireProjectContext(): ProjectContext {
    if (!this.projectContext) {
      throw new Error(ERROR_NO_PROJECT_CONTEXT);
    }
    return this.projectContext;
  }

  clearCache(): void {
    for (const resolver of new Set(this.resolverByKey.values())) {
      resolver.clearCache();
    }
  }

  clearProjectCache(projectKey: string): void {
    for (const resolver of new Set(this.resolverByKey.values())) {
      resolver.clearCache(projectKey);
    }
  }
}
