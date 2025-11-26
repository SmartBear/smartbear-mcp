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

export interface CreateReleasePayload {
  release: {
    name: string;
    description?: string;
    startDate?: string;
    targetDate?: string;
    projectID?: number;
  };
  cycle?: {
    name: string;
    isLocked?: boolean;
    isArchived?: boolean;
  };
}

export const DEFAULT_CREATE_RELEASE_PAYLOAD: Omit<
  CreateReleasePayload,
  "release" | "cycle"
> = {
  release: {
    name: "Default Release",
  },
  cycle: {
    name: "Default Cycle",
  },
};

export interface CreateCyclePayload {
  cycle: {
    name: string;
    startDate?: string;
    targetDate?: string;
    projectID?: number;
    releaseID: number;
  };
}

export const DEFAULT_CREATE_CYCLE_PAYLOAD: Omit<
  CreateCyclePayload,
  "cycle" | "releaseID"
> = {
  cycle: {
    name: "Default Cycle",
  },
};

export interface UpdateCyclePayload {
  cycle: {
    name?: string;
    startDate?: string;
    targetDate?: string;
    buildID: number;
    releaseID: number;
  };
}