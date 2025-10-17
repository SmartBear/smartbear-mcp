import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  type FilterPayload,
  type PaginationPayload,
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
