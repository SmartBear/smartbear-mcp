import {
  DEFAULT_FILTER,
  DEFAULT_FOLDER_OPTIONS,
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  type FilterPayload,
  type FolderPayload,
  type PaginationPayload,
  type SortPayload,
} from "./common.js";

export interface FetchRequirementsPayload
  extends PaginationPayload,
    FilterPayload,
    FolderPayload,
    SortPayload {
  viewId: number; // required
  folderPath: string; // required
  udfFilter?: string; // user-defined field filter
  isJiraFilter?: boolean; // false if using qmetry filter
  filterType?: "QMETRY" | "JIRA"; // filter type
}

export interface FetchRequirementDetailsPayload {
  id: number; // required - numeric ID of requirement
  version: number; // required - version number of requirement
}

export const DEFAULT_FETCH_REQUIREMENTS_PAYLOAD: Omit<
  FetchRequirementsPayload,
  "viewId" | "folderPath"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  ...DEFAULT_FOLDER_OPTIONS,
  ...DEFAULT_SORT,
  udfFilter: "[]",
  isJiraFilter: false,
  filterType: "QMETRY",
};

export const DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD: Omit<
  FetchRequirementDetailsPayload,
  "id" | "version"
> = {
  // No defaults needed for this simple payload
};
