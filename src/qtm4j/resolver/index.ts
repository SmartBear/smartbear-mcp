/**
 * QTM4J Resolver Module
 *
 * FieldResolver is the single entry point — it builds a registry of
 * concrete resolvers and routes all resolve/preload/clearCache calls.
 *
 *   ├── CommonAttributeResolver — priority, statuses (pre-loaded at session start)
 *   ├── LabelResolver           — labels (on-demand)
 *   └── ComponentResolver       — components (on-demand)
 *
 * FieldMetadataCache and FieldMetadataFetcher are extensible base classes.
 * Override either to swap in a custom cache or fetch strategy.
 */

import type {
  ProjectContext,
  Resolver,
} from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";
import { CommonAttributeResolver } from "./common-attribute-resolver";
import { ComponentResolver } from "./component-resolver";
import { LabelResolver } from "./label-resolver";

const ERROR_NO_PROJECT_CONTEXT =
  "No active project set. Please call set_project_context before performing this operation.";

export class FieldResolver {
  private readonly resolvers: Resolver[];
  private readonly registry: Map<string, Resolver>;
  private projectContext: ProjectContext | undefined;
  readonly commonAttributes: CommonAttributeResolver;

  constructor(apiClient: ApiClient) {
    this.commonAttributes = new CommonAttributeResolver(apiClient);
    this.resolvers = [
      this.commonAttributes,
      new LabelResolver(apiClient),
      new ComponentResolver(apiClient),
    ];
    this.registry = new Map();
    for (const resolver of this.resolvers) {
      for (const fieldKey of resolver.fieldKeys) {
        this.registry.set(fieldKey, resolver);
      }
    }
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

  async resolve(fieldKey: string, name: string): Promise<string | undefined> {
    const { projectKey, projectId } = this.requireProjectContext();
    return this.registry
      .get(fieldKey)
      ?.resolve(projectKey, projectId, fieldKey, name);
  }

  /** Clears ALL cached data across all resolvers. */
  clearCache(): void {
    for (const resolver of this.resolvers) {
      resolver.clearCache(); // no projectKey arg = wipe everything
    }
  }

  /** Clears cached data for a specific project key across all resolvers. */
  clearProjectCache(projectKey: string): void {
    for (const resolver of this.resolvers) {
      resolver.clearCache(projectKey);
    }
  }
}

export { CommonAttributeResolver } from "./common-attribute-resolver";
export { ComponentResolver } from "./component-resolver";
export { FieldMetadataCache } from "./field-metadata-cache";
export { FieldMetadataFetcher } from "./field-metadata-fetcher";
export { LabelResolver } from "./label-resolver";
