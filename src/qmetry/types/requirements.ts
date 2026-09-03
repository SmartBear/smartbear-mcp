import {
  DEFAULT_FILTER,
  DEFAULT_FOLDER_OPTIONS,
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  type FilterPayload,
  type FolderPayload,
  type PaginationPayload,
  type SortPayload,
} from "./common";
import type { UdfFieldValue, UdfValue } from "./udf";

export interface RequirementReleaseCycleMapping {
  release: number;
  cycle: number[];
  version: number;
}

export interface RequirementAttachments {
  ADD: unknown[];
  REMOVE: unknown[];
}

export interface CreateRequirementPayload {
  name: string; // required - Requirement name
  priority?: number; // optional - PriorityID of Requirement
  component?: number[]; // optional - Component(Label) Ids
  requirementOwner?: number; // optional - OwnerId of Requirement
  requirementState?: number; // optional - StatusId of Requirement
  releaseCycleMapping?: RequirementReleaseCycleMapping[]; // optional - release cycle mapping
  description?: string; // optional - Description of Requirement
  associateRelCyc?: boolean; // optional - associate release cycle
  rqFolderId?: string; // optional - Requirement folder ID, auto-resolved if omitted
  scope?: string; // optional - usually "project"
  udfFields?: Record<string, UdfValue>; // UDF values — spread flat onto payload root before sending
  [key: string]: unknown; // allows flat UDF passthrough
}

export interface UpdateRequirementPayload {
  rqId: number; // required - Requirement numeric ID
  rqVersionId: number; // required - Requirement version ID
  updateWithVersion?: boolean; // optional - whether to create a new version
  name?: string; // optional - Requirement name
  description?: string; // optional - Description of Requirement
  component?: number[]; // optional - Component(Label) Ids
  requirementOwner?: number; // optional - OwnerId of Requirement
  requirementState?: number; // optional - StatusId of Requirement
  priority?: number; // optional - PriorityID of Requirement
  attachments?: RequirementAttachments; // optional - attachments to add/remove
  UDF?: Record<string, UdfFieldValue>; // UDF wrapper { fieldName: { fieldID, value } } for update
  udfFields?: Record<string, UdfValue>; // flat UDF key→value pairs (also spread onto root)
  [key: string]: unknown;
}

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
  /**
   * Prevents filter persistence in the QMetry web application UI.
   * Always set to false to ensure filters are not saved when fetching test cases via API.
   */
  isFilterSaveRequired: boolean;
}

export interface FetchRequirementDetailsPayload {
  id: number; // required - numeric ID of requirement
  version: number; // required - version number of requirement
}

export interface FetchRequirementsLinkedToTestCasePayload
  extends PaginationPayload,
    FilterPayload {
  tcID: number; // required - Test Case numeric ID
  getLinked?: boolean; // true to get linked requirements, false to get unlinked
  rqFolderPath?: string; // folder path for requirements
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
  /**
   * Prevents filter persistence in the QMetry web application UI.
   * Always set to false to ensure filters are not saved when fetching test cases via API.
   */
  isFilterSaveRequired: false,
};

export const DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD: Omit<
  FetchRequirementDetailsPayload,
  "id" | "version"
> = {
  // No defaults needed for this simple payload
};

export const DEFAULT_FETCH_REQUIREMENTS_LINKED_TO_TESTCASE_PAYLOAD: Omit<
  FetchRequirementsLinkedToTestCasePayload,
  "tcID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
  rqFolderPath: "",
};

export const DEFAULT_CREATE_REQUIREMENT_PAYLOAD: Omit<
  CreateRequirementPayload,
  "name"
> = {
  scope: "project",
};

export const DEFAULT_UPDATE_REQUIREMENT_PAYLOAD: Omit<
  UpdateRequirementPayload,
  "rqId" | "rqVersionId"
> = {};
