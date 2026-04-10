import type {
  Branch,
  BranchesResponse,
  CreatePacticipantInput,
  DeleteBranchInput,
  DeletePacticipantInput,
  GetBranchInput,
  GetBranchVersionsInput,
  GetLatestVersionInput,
  GetPacticipantInput,
  GetVersionInput,
  ListBranchesInput,
  ListVersionsInput,
  Pacticipant,
  PacticipantsResponse,
  PacticipantVersion,
  UpdatePacticipantInput,
  UpdateVersionInput,
  VersionsResponse,
} from "./base";
import { PactflowBaseClient } from "./base-client";
import { toQueryString } from "./utils";

export abstract class PactflowPacticipantMethods extends PactflowBaseClient {
  /**
   * Retrieves all pacticipants (applications/services) registered in the workspace,
   * with optional pagination.
   *
   * @param params - Optional pagination parameters (`pageNumber`, `pageSize`).
   * @returns List of pacticipants with their metadata.
   * @throws ToolError if the request fails.
   */
  async listPacticipants(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PacticipantsResponse> {
    return await this.fetchJson<PacticipantsResponse>(
      `${this.baseUrl}/pacticipants${toQueryString({ page: params?.pageNumber, size: params?.pageSize })}`,
      { method: "GET", errorContext: "List Pacticipants" },
    );
  }

  /**
   * Retrieves metadata for a specific pacticipant by name.
   *
   * @param params - `pacticipantName`: The name of the pacticipant to fetch.
   * @returns Pacticipant metadata including display name, main branch, and repository URL.
   * @throws ToolError if the pacticipant is not found or the request fails.
   */
  async getPacticipant({
    pacticipantName,
  }: GetPacticipantInput): Promise<Pacticipant> {
    return await this.fetchJson<Pacticipant>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "GET", errorContext: "Get Pacticipant" },
    );
  }

  /**
   * Fully replaces a pacticipant's metadata. All fields not provided are cleared.
   *
   * @param params - `pacticipantName` plus optional metadata fields.
   * @returns The updated pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async updatePacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<Pacticipant> {
    return await this.fetchJson<Pacticipant>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PUT", body, errorContext: "Update Pacticipant" },
    );
  }

  /**
   * Partially updates a pacticipant's metadata — only the fields provided are changed.
   *
   * @param params - `pacticipantName` plus the specific fields to update.
   * @returns The updated pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async patchPacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<Pacticipant> {
    return await this.fetchJson<Pacticipant>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PATCH", body, errorContext: "Patch Pacticipant" },
    );
  }

  /**
   * Registers a new pacticipant (application/service) in the workspace.
   *
   * @param body - Name, optional display name, main branch, and repository URL.
   * @returns The created pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async createPacticipant(body: CreatePacticipantInput): Promise<Pacticipant> {
    return await this.fetchJson<Pacticipant>(`${this.baseUrl}/pacticipants`, {
      method: "POST",
      body,
      errorContext: "Create Pacticipant",
    });
  }

  /**
   * Permanently removes a pacticipant and all its associated data from the workspace.
   *
   * @param params - `pacticipantName`: The name of the pacticipant to delete.
   * @throws ToolError if the request fails.
   */
  async deletePacticipant({
    pacticipantName,
  }: DeletePacticipantInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "DELETE", errorContext: "Delete Pacticipant" },
    );
  }

  /**
   * Retrieves all branches for a given pacticipant, with optional name filtering
   * and pagination.
   *
   * @param params - `pacticipantName`, optional `q` (name filter), `pageNumber`, `pageSize`.
   * @returns List of branches for the pacticipant.
   * @throws ToolError if the request fails.
   */
  async listBranches({
    pacticipantName,
    q,
    pageNumber,
    pageSize,
  }: ListBranchesInput): Promise<BranchesResponse> {
    return await this.fetchJson<BranchesResponse>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches${toQueryString({ q, pageNumber, pageSize })}`,
      { method: "GET", errorContext: "List Branches" },
    );
  }

  /**
   * Retrieves all published versions for a given pacticipant, with optional pagination.
   *
   * @param params - `pacticipantName`, optional `pageNumber` and `pageSize`.
   * @returns List of versions with their branch and tag associations.
   * @throws ToolError if the request fails.
   */
  async listVersions({
    pacticipantName,
    pageNumber,
    pageSize,
  }: ListVersionsInput): Promise<VersionsResponse> {
    return await this.fetchJson<VersionsResponse>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions${toQueryString({ page: pageNumber, size: pageSize })}`,
      { method: "GET", errorContext: "List Versions" },
    );
  }

  /**
   * Retrieves metadata for a specific version of a pacticipant.
   *
   * @param params - `pacticipantName` and `versionNumber` to retrieve.
   * @returns Version metadata including branches, tags, and build URL.
   * @throws ToolError if the version is not found or the request fails.
   */
  async getVersion({
    pacticipantName,
    versionNumber,
  }: GetVersionInput): Promise<PacticipantVersion> {
    return await this.fetchJson<PacticipantVersion>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "GET", errorContext: "Get Version" },
    );
  }

  /**
   * Retrieves the latest version of a pacticipant, optionally filtered by tag.
   *
   * @param params - `pacticipantName` and optional `tag` to filter by.
   * @returns The latest matching version.
   * @throws ToolError if the request fails.
   */
  async getLatestVersion({
    pacticipantName,
    tag,
  }: GetLatestVersionInput): Promise<PacticipantVersion> {
    const path = tag
      ? `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version/${encodeURIComponent(tag)}`
      : `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version`;
    return await this.fetchJson<PacticipantVersion>(`${this.baseUrl}${path}`, {
      method: "GET",
      errorContext: "Get Latest Version",
    });
  }

  /**
   * Retrieves all versions published from a specific branch of a pacticipant.
   *
   * @param params - `pacticipantName`, `branchName`, optional `pageNumber` and `pageSize`.
   * @returns List of versions created on the given branch.
   * @throws ToolError if the request fails.
   */
  async getBranchVersions({
    pacticipantName,
    branchName,
    pageNumber,
    pageSize,
  }: GetBranchVersionsInput): Promise<VersionsResponse> {
    return await this.fetchJson<VersionsResponse>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}/versions${toQueryString({ page: pageNumber, size: pageSize })}`,
      { method: "GET", errorContext: "Get Branch Versions" },
    );
  }

  /**
   * Retrieves metadata for a specific branch of a pacticipant.
   *
   * @param params - `pacticipantName` and `branchName`.
   * @returns Branch metadata including its versions.
   * @throws ToolError if the branch is not found or the request fails.
   */
  async getBranch({
    pacticipantName,
    branchName,
  }: GetBranchInput): Promise<Branch> {
    return await this.fetchJson<Branch>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "GET", errorContext: "Get Branch" },
    );
  }

  /**
   * Deletes a branch and its version associations from a pacticipant.
   *
   * @param params - `pacticipantName` and `branchName`.
   * @throws ToolError if the branch is not found or the request fails.
   */
  async deleteBranch({
    pacticipantName,
    branchName,
  }: DeleteBranchInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "DELETE", errorContext: "Delete Branch" },
    );
  }

  /**
   * Updates metadata for a specific pacticipant version (e.g. sets the build URL).
   *
   * @param params - `pacticipantName`, `versionNumber`, and optional `buildUrl`.
   * @returns The updated version resource.
   * @throws ToolError if the request fails.
   */
  async updateVersion({
    pacticipantName,
    versionNumber,
    ...body
  }: UpdateVersionInput): Promise<PacticipantVersion> {
    return await this.fetchJson<PacticipantVersion>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "PUT", body, errorContext: "Update Version" },
    );
  }
}
