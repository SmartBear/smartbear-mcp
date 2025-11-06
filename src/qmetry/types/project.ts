import {
  DEFAULT_FILTER,
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  type FilterPayload,
  type PaginationPayload,
  type SortPayload,
} from "./common.js";

export interface FetchProjectsPayload extends PaginationPayload, FilterPayload {
  params: {
    showArchive: boolean;
  };
}

export const DEFAULT_FETCH_PROJECTS_PAYLOAD = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  params: {
    showArchive: false,
  },
};

export interface FetchBuildsPayload extends PaginationPayload, FilterPayload {}

export const DEFAULT_FETCH_BUILD_PAYLOAD = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
};

export interface FetchPlatformsPayload
  extends PaginationPayload,
    SortPayload,
    FilterPayload {}

export const DEFAULT_FETCH_PLATFORMS_PAYLOAD = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  ...DEFAULT_SORT,
};
