import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  type FilterPayload,
  type PaginationPayload,
} from "./common.js";

export interface FetchTestSuitesForTestCasePayload
  extends PaginationPayload,
    FilterPayload {
  tsFolderID: number; // required - Test Suite folder ID
  getColumns?: boolean; // whether to get column information
}

export const DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD: Omit<
  FetchTestSuitesForTestCasePayload,
  "tsFolderID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getColumns: true,
};
