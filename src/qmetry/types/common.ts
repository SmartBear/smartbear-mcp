export interface PaginationPayload {
  start?: number;
  page?: number;
  limit?: number;
}

export interface FilterPayload {
  filter?: string;
}

export interface FolderPayload {
  scope?: string;
  showRootOnly?: boolean;
  getSubEntities?: boolean;
  hideEmptyFolders?: boolean;
  folderSortColumn?: string;
  folderSortOrder?: "ASC" | "DESC";
  restoreDefaultColumns?: boolean;
  folderID?: number | null;
}

export const DEFAULT_PAGINATION: Required<PaginationPayload> = {
  start: 0,
  page: 1,
  limit: 10,
};

export const DEFAULT_FILTER: Required<FilterPayload> = {
  filter: "[]",
};

export const DEFAULT_FOLDER_OPTIONS: Required<
  Omit<FolderPayload, "folderID">
> & { folderID: null } = {
  scope: "project",
  showRootOnly: false,
  getSubEntities: true,
  hideEmptyFolders: false,
  folderSortColumn: "name",
  folderSortOrder: "ASC",
  restoreDefaultColumns: false,
  folderID: null,
};
