import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  type FilterPayload,
  type PaginationPayload,
  type SortPayload,
} from "./common.js";

/**
 * Payload for fetching issues linked to a test case.
 *
 * IMPORTANT: This payload type intentionally excludes projectKey and baseUrl.
 * These parameters are handled at the tool/client level and sent as HTTP headers,
 * NOT in the request body. This prevents API errors like "Body is unusable"
 * that occur when tool-level parameters are incorrectly included in request bodies.
 *
 * The projectKey is sent as an HTTP header for authentication/routing,
 * while this payload contains only the business logic parameters for the API.
 */
export interface FetchIssuesLinkedToTestCasePayload
  extends PaginationPayload,
    FilterPayload {
  tcID: number; // required - Test Case numeric ID
  getLinked?: boolean; // optional - True to get linked issues, false for unlinked (default: true)
}

export const DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD: Omit<
  FetchIssuesLinkedToTestCasePayload,
  "tcID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
};

export interface CreateIssuePayload {
  issueType: number; // required - Numeric ID of issue type
  issuePriority: number; // required - Numeric ID of issue priority
  summary: string; // required - Summary/title of the issue
  issueOwner?: number; // optional - Numeric ID of the issue owner
  description?: string; // optional - Detailed description of the issue
  sync_with?: number; // optional - Numeric ID of external system to sync with
  component?: number[]; // optional - Array of component IDs
  affectedRelease?: number[]; // optional - Numeric ID Release Id of Issue
  affectedCycles?: number[]; // optional - Array of Cycle IDs affected by this issue
  environment?: string; // optional - Environment details
  tcRunID?: number; // optional - Test Case Run numeric ID to link the issue to
}

export const DEFAULT_CREATE_ISSUE_PAYLOAD: Omit<
  CreateIssuePayload,
  "issueType" | "issuePriority" | "summary"
> = {};

// Update Issue
export interface UpdateIssuePayload {
  DefectId: number; // required - ID of the issue to be updated
  entityKey?: string; // optional - Entity key of the issue to be updated
  summary?: string;
  issuePriority?: number;
  issueType?: number;
  affectedRelease?: number;
  affectedCycles?: number;
  description?: string;
  issueOwner?: number;
}

export const DEFAULT_UPDATE_ISSUE_PAYLOAD: Omit<
  UpdateIssuePayload,
  "DefectId"
> = {};

// Link Issues to Testcase Run
export interface LinkIssuesToTestcaseRunPayload {
  issueIds: (string | number)[]; // required - IDs of issues to link
  tcrId: number; // required - Testcase Run ID
}

export const DEFAULT_LINK_ISSUES_TO_TESTCASE_RUN_PAYLOAD: Omit<
  LinkIssuesToTestcaseRunPayload,
  "issueIds" | "tcrId"
> = {};

export interface FetchIssuesPayload
  extends PaginationPayload,
    FilterPayload,
    SortPayload {
  viewId: number; // required
  isJiraIntegated?: boolean; // optional - default false
  udfFilter?: string; // only this API uses udfFilter
  /**
   * Prevents filter persistence in the QMetry web application UI.
   * Always set to false to ensure filters are not saved when fetching test cases via API.
   */
  isFilterSaveRequired: boolean;
}

export const DEFAULT_FETCH_ISSUES_PAYLOAD: Omit<FetchIssuesPayload, "viewId"> =
  {
    ...DEFAULT_PAGINATION,
    ...DEFAULT_FILTER,
    ...DEFAULT_SORT,
    udfFilter: "[]",
    isJiraIntegated: false,
    /**
     * Prevents filter persistence in the QMetry web application UI.
     * Always set to false to ensure filters are not saved when fetching test cases via API.
     */
    isFilterSaveRequired: false,
  };
