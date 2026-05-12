/**
 * QTM4J Field Resolution — Domain Types
 *
 * Core types for resolving human-readable field names (e.g. "High", "To Do")
 * to internal Jira custom field IDs used by the QTM4J API for test cases.
 */

/** Active project context set via set_project_context. */
export interface ProjectContext {
  readonly projectId: number;
  readonly projectKey: string;
  readonly projectName: string;
}

/** A name → ID mapping for a single field (e.g. { "High": "2", "Low": "4" }). */
export type FieldValues = Record<string, string>;

// ─── Resolver Keys ───────────────────────────────────────────────────────────

/**
 * All field types that require resolution from name to ID.
 * Groups backend API field sources by loading strategy.
 */
export const ResolverKeys = {
  /**
   * Fields fetched from the common-attributes API (batch-loaded on project context set).
   * Values are cached per project and eagerly available for tools.
   */
  CommonAttribute: {
    TESTCASE_STATUS: "testcase_status",
    TEST_PLAN_STATUS: "testplan_status",
    TEST_CYCLE_STATUS: "testcycle_status",
    PRIORITY: "priority",
    TESTCASE_FOLDER: "testcase_folder",
  } as const,

  /**
   * Fields with dedicated search APIs (fetched on-demand, not batch-loaded).
   * Resolved lazily when tools reference them — no eager preloading.
   */
  SearchableField: {
    LABEL: "label",
    COMPONENTS: "components",
    TEST_CASE_KEY_TO_UID: "testCaseKeyToUid",
    TEST_CYCLE_KEY_TO_UID: "testCycleKeyToUid",
    REQUIREMENT_KEY_TO_ID: "requirementKeyToId",
  } as const,
} as const;

/**
 * Individual field keys from common-attributes API (for type safety in resolvers).
 */
export type CommonAttributeFieldKey =
  (typeof ResolverKeys.CommonAttribute)[keyof typeof ResolverKeys.CommonAttribute];

/**
 * Individual field keys with dedicated search endpoints (for type safety in resolvers).
 */
export type SearchableFieldKey =
  (typeof ResolverKeys.SearchableField)[keyof typeof ResolverKeys.SearchableField];

// ─── Input Fields ────────────────────────────────────────────────────────────

/**
 * Input field names as they appear in tool schemas.
 * Maps user-facing parameter names to resolver field keys.
 */
export enum InputField {
  PRIORITY = "priority",
  STATUS = "status",
  COMPONENTS = "components",
  LABELS = "labels",
  FOLDER = "folderId",
}
