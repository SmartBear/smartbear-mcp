/**
 * QTM4J Field Resolution — Domain Types
 *
 * Core types shared across the resolver subsystem, tools, and client.
 */

/** Active project context set via set_project_context. */
export interface ProjectContext {
  readonly projectId: number;
  readonly projectKey: string;
  readonly projectName: string;
}

/** A name → ID mapping for a single field (e.g. { "High": "2", "Low": "4" }). */
export type FieldValues = Record<string, string>;

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Field keys returned by the common-attributes API. */
export enum CommonAttributeField {
  TESTCASE_STATUS = "testcase_status",
  TEST_PLAN_STATUS = "testplan_status",
  TEST_CYCLE_STATUS = "testcycle_status",
  PRIORITY = "priority",
}

/** Field keys with dedicated search APIs (fetched on demand). */
export enum SearchableField {
  LABEL = "label",
  COMPONENTS = "components",
}

/** Input field names in tool schemas. */
export enum InputField {
  PRIORITY = "priority",
  STATUS = "status",
  COMPONENTS = "components",
  LABELS = "labels",
}

// ─── Resolver Contract ────────────────────────────────────────────────────────

/**
 * Contract every field resolver must satisfy.
 * Used by FieldResolver to type its internal registry.
 */
export interface Resolver {
  readonly fieldKeys: readonly string[];
  resolve(
    projectKey: string,
    projectId: number,
    fieldKey: string,
    name: string,
  ): Promise<string | undefined>;
  preload(
    projectKey: string,
    projectId: number,
  ): Promise<Record<string, FieldValues>>;
  clearCache(projectKey?: string): void;
}
