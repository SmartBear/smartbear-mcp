import {
  DEFAULT_FILTER,
  DEFAULT_FOLDER_OPTIONS,
  DEFAULT_PAGINATION,
  type FilterPayload,
  type FolderPayload,
  type PaginationPayload,
} from "./common.js";

export interface CreateTestCaseStep {
  orderId: number;
  description: string;
  inputData?: string;
  expectedOutcome?: string;
  UDF?: Record<string, string>;
  tcStepID?: number; // Required for updating existing steps, omit for new steps
}
export interface removeTestCaseStep {
  tcID: number;
  projectID: number;
  tcStepID: number;
  tcVersionID: number;
  tcVersion: number;
  tcsAttCount: number;
  orderId: number;
  description: string;
  inputData?: string;
  expectedOutcome?: string;
  UDF?: Record<string, string>;
  tcsIsShared: boolean;
  tcsIsParameterized: boolean;
}
export interface ReleaseCycleMapping {
  release: number;
  cycle: number[];
  version?: number;
}

export interface FetchTestCasesPayload
  extends PaginationPayload,
    FilterPayload,
    FolderPayload {
  viewId: number; // required
  folderPath: string; // required
  udfFilter?: string; // only this API uses udfFilter
}

export interface CreateTestCasesPayload {
  tcFolderID: string; // required - Test Case folder ID
  name: string; // required - Test Case name
  scope?: string; // optional - usually "project"
  steps?: CreateTestCaseStep[]; // optional - array of test steps
  priority?: number; // optional - PriorityID of Testcase
  component?: number[]; // optional - Component(Label) Ids
  testcaseOwner?: number; // optional - OwnerId of Testcase
  testCaseState?: number; // optional - StatusId of Testcase
  testCaseType?: number; // optional - Id of Test Category
  estimatedTime?: number; // optional - Estimated Time (minutes)
  description?: string; // optional - Description of Testcase
  testingType?: number; // optional - Id of TestingType
  associateRelCyc?: boolean; // optional - associate release cycle
  releaseCycleMapping?: ReleaseCycleMapping[]; // optional - release cycle mapping
}

export interface UpdateTestCasesPayload {
  tcID: number; // required - Test Case numeric ID
  tcVersionID: number; // required - Test Case version ID
  withVersion?: boolean; // optional - whether to create a new version
  notrunall?: boolean; // optional - whether to not run all steps
  isStepUpdated?: boolean; // optional - whether steps are updated
  steps?: CreateTestCaseStep[]; // optional - array of test steps
  removeSteps?: removeTestCaseStep[]; // optional - array of steps to remove
  name?: string; // optional - Test Case name
  priority?: number; // optional - PriorityID of Testcase
  component?: number[]; // optional - Component(Label) Ids
  owner?: number; // optional - OwnerId of Testcase
  testCaseState?: number; // optional - StatusId of Testcase
  testCaseType?: number; // optional - Id of Test Category
  executionMinutes?: number; // optional - Execution Time (minutes)
  description?: string; // optional - Description of Testcase
  testingType?: number; // optional - Id of TestingType
  updateOnlyMetadata?: boolean; // optional - whether to update only metadata
}

export interface FetchTestCaseDetailsPayload
  extends PaginationPayload,
    FilterPayload {
  tcID: number; // required
}
export interface FetchTestCaseVersionDetailsPayload
  extends FilterPayload,
    Pick<FolderPayload, "scope"> {
  id: number; // required
  version: number; // required default 1
}
export interface FetchTestCaseStepsPayload extends PaginationPayload {
  id: number; // required
  version?: number; // optional, defaults to 1
}

export interface FetchTestCasesLinkedToRequirementPayload
  extends PaginationPayload,
    FilterPayload {
  rqID: number; // required - numeric ID of requirement
  getLinked?: boolean; // true to get linked TCs, false to get unlinked TCs
  showEntityWithReleaseCycle?: boolean; // true to show only TCs with given release/cycle
  tcFolderPath?: string; // folder path for test cases
  releaseID?: string; // filter by release ID
  cycleID?: string; // filter by cycle ID
  getSubEntities?: boolean; // allow filter of sub-entities
  getColumns?: boolean; // true to get column information
}

export interface linkRequirementToTestCasePayload {
  tcID: string; // required - EntityKey of Testcase (e.g. 'COD-TC-29')
  tcVersionId: number; // required - VersionId of Testcase
  rqVersionIds: string; // required - Comma-separated values of versionId of the Requirement (e.g. '236124,236125')
}

export interface FetchTestCaseExecutionsPayload
  extends PaginationPayload,
    FilterPayload,
    Pick<FolderPayload, "scope"> {
  tcid: number; // required - numeric ID of test case
  tcversion?: number; // optional - version number of test case
}

export const DEFAULT_FETCH_TESTCASES_PAYLOAD: Omit<
  FetchTestCasesPayload,
  "viewId" | "folderPath"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  ...DEFAULT_FOLDER_OPTIONS,
  udfFilter: "[]",
};

export const DEFAULT_CREATE_TESTCASES_PAYLOAD: Omit<
  CreateTestCasesPayload,
  "tcFolderID" | "name"
> = {
  scope: "project",
  steps: [],
};

export const DEFAULT_UPDATE_TESTCASES_PAYLOAD: Omit<
  UpdateTestCasesPayload,
  "tcID" | "tcVersionID"
> = {};

export const DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD: Omit<
  FetchTestCaseDetailsPayload,
  "tcID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
};

export const DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD: Omit<
  FetchTestCaseVersionDetailsPayload,
  "id" | "version"
> = {
  ...DEFAULT_FILTER,
  scope: DEFAULT_FOLDER_OPTIONS.scope,
};

export const DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD: Omit<
  FetchTestCaseStepsPayload,
  "id"
> = {
  ...DEFAULT_PAGINATION,
  version: 1,
};

export const DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD: Omit<
  FetchTestCasesLinkedToRequirementPayload,
  "rqID"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  getLinked: true,
  showEntityWithReleaseCycle: false,
  tcFolderPath: "",
  getSubEntities: true,
  getColumns: true,
};

export const DEFAULT_FETCH_TESTCASE_EXECUTIONS_PAYLOAD: Omit<
  FetchTestCaseExecutionsPayload,
  "tcid"
> = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_FILTER,
  scope: DEFAULT_FOLDER_OPTIONS.scope,
};

export const DEFAULT_LINKED_REQUIREMENT_TO_TESTCASE_PAYLOAD: Omit<
  linkRequirementToTestCasePayload,
  "tcID" | "tcVersionId" | "rqVersionIds"
> = {};
