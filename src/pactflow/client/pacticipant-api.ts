import type {
  BranchesListResponse,
  BranchResponse,
  BranchVersionsResponse,
  CreatePacticipantInput,
  DeleteBranchInput,
  DeletePacticipantInput,
  GetBranchInput,
  GetBranchVersionsInput,
  GetLabelInput,
  GetLatestVersionInput,
  GetPacticipantInput,
  GetVersionInput,
  LabelByNameInput,
  LabelResponse,
  LabelsListResponse,
  ListBranchesInput,
  ListVersionsInput,
  ManageLabelInput,
  PacticipantResponse,
  PacticipantsByLabelResponse,
  PacticipantsListResponse,
  UpdatePacticipantInput,
  UpdateVersionInput,
  VersionResponse,
  VersionsListResponse,
} from "./base";
import type { HttpClient } from "./http-client";

export class PacticipantApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all pacticipants, with optional pagination.
   */
  async listPacticipants(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PacticipantsListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.set("page", String(params.pageNumber));
    if (params?.pageSize) queryParams.set("size", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<PacticipantsListResponse>(
      `${this.http.baseUrl}/pacticipants${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Pacticipants" },
    );
  }

  /**
   * Retrieves metadata for a specific pacticipant by name.
   */
  async getPacticipant({
    pacticipantName,
  }: GetPacticipantInput): Promise<PacticipantResponse> {
    return await this.http.fetch<PacticipantResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "GET", errorContext: "Get Pacticipant" },
    );
  }

  /**
   * Retrieves all branches for a given pacticipant, with optional name filtering
   * and pagination.
   */
  async listBranches({
    pacticipantName,
    q,
    pageNumber,
    pageSize,
  }: ListBranchesInput): Promise<BranchesListResponse> {
    const queryParams = new URLSearchParams();
    if (q) queryParams.set("q", q);
    if (pageNumber) queryParams.set("pageNumber", String(pageNumber));
    if (pageSize) queryParams.set("pageSize", String(pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<BranchesListResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Branches" },
    );
  }

  /**
   * Retrieves all published versions for a given pacticipant, with optional pagination.
   */
  async listVersions({
    pacticipantName,
    pageNumber,
    pageSize,
  }: ListVersionsInput): Promise<VersionsListResponse> {
    const queryParams = new URLSearchParams();
    if (pageNumber) queryParams.set("page", String(pageNumber));
    if (pageSize) queryParams.set("size", String(pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<VersionsListResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Versions" },
    );
  }

  /**
   * Retrieves metadata for a specific version of a pacticipant.
   */
  async getVersion({
    pacticipantName,
    versionNumber,
  }: GetVersionInput): Promise<VersionResponse> {
    return await this.http.fetch<VersionResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "GET", errorContext: "Get Version" },
    );
  }

  /**
   * Retrieves the latest version of a pacticipant, optionally filtered by tag.
   */
  async getLatestVersion({
    pacticipantName,
    tag,
  }: GetLatestVersionInput): Promise<VersionResponse> {
    const path = tag
      ? `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version/${encodeURIComponent(tag)}`
      : `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version`;
    return await this.http.fetch<VersionResponse>(
      `${this.http.baseUrl}${path}`,
      {
        method: "GET",
        errorContext: "Get Latest Version",
      },
    );
  }

  /**
   * Fully replaces a pacticipant's metadata.
   */
  async updatePacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<PacticipantResponse> {
    return await this.http.fetch<PacticipantResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PUT", body, errorContext: "Update Pacticipant" },
    );
  }

  /**
   * Partially updates a pacticipant's metadata.
   */
  async patchPacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<PacticipantResponse> {
    return await this.http.fetch<PacticipantResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PATCH", body, errorContext: "Patch Pacticipant" },
    );
  }

  /**
   * Updates metadata for a specific pacticipant version.
   */
  async updateVersion({
    pacticipantName,
    versionNumber,
    ...body
  }: UpdateVersionInput): Promise<VersionResponse> {
    return await this.http.fetch<VersionResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "PUT", body, errorContext: "Update Version" },
    );
  }

  /**
   * Retrieves all versions published from a specific branch of a pacticipant.
   */
  async getBranchVersions({
    pacticipantName,
    branchName,
    pageNumber,
    pageSize,
  }: GetBranchVersionsInput): Promise<BranchVersionsResponse> {
    const queryParams = new URLSearchParams();
    if (pageNumber) queryParams.set("page", String(pageNumber));
    if (pageSize) queryParams.set("size", String(pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<BranchVersionsResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}/versions${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "Get Branch Versions" },
    );
  }

  /**
   * Registers a new pacticipant in the workspace.
   */
  async createPacticipant({
    ...body
  }: CreatePacticipantInput): Promise<PacticipantResponse> {
    return await this.http.fetch<PacticipantResponse>(
      `${this.http.baseUrl}/pacticipants`,
      {
        method: "POST",
        body,
        errorContext: "Create Pacticipant",
      },
    );
  }

  /**
   * Permanently removes a pacticipant and all its associated data.
   */
  async deletePacticipant({
    pacticipantName,
  }: DeletePacticipantInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      {
        method: "DELETE",
        errorContext: "Delete Pacticipant",
      },
    );
  }

  /**
   * Retrieves metadata for a specific branch of a pacticipant.
   */
  async getBranch({
    pacticipantName,
    branchName,
  }: GetBranchInput): Promise<BranchResponse> {
    return await this.http.fetch<BranchResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "GET", errorContext: "Get Branch" },
    );
  }

  /**
   * Deletes a branch and its version associations from a pacticipant.
   */
  async deleteBranch({
    pacticipantName,
    branchName,
  }: DeleteBranchInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "DELETE", errorContext: "Delete Branch" },
    );
  }

  /**
   * Applies a label to a pacticipant.
   */
  async addLabel({
    pacticipantName,
    labelName,
  }: ManageLabelInput): Promise<LabelResponse> {
    return await this.http.fetch<LabelResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "PUT", body: {}, errorContext: "Add Label" },
    );
  }

  /**
   * Removes a label from a pacticipant.
   */
  async removeLabel({
    pacticipantName,
    labelName,
  }: ManageLabelInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "DELETE", errorContext: "Remove Label" },
    );
  }

  /**
   * Retrieves all labels across all pacticipants.
   */
  async listLabels(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<LabelsListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.set("page", String(params.pageNumber));
    if (params?.pageSize) queryParams.set("size", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<LabelsListResponse>(
      `${this.http.baseUrl}/labels${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Labels" },
    );
  }

  /**
   * Checks whether a specific label is applied to a pacticipant.
   */
  async getPacticipantLabel({
    pacticipantName,
    labelName,
  }: GetLabelInput): Promise<LabelResponse> {
    return await this.http.fetch<LabelResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "Get Pacticipant Label" },
    );
  }

  /**
   * Retrieves all pacticipants that have a specific label applied.
   */
  async listPacticipantsByLabel({
    labelName,
  }: LabelByNameInput): Promise<PacticipantsByLabelResponse> {
    return await this.http.fetch<PacticipantsByLabelResponse>(
      `${this.http.baseUrl}/pacticipants/label/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "List Pacticipants by Label" },
    );
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      listPacticipants: this.listPacticipants.bind(this),
      getPacticipant: this.getPacticipant.bind(this),
      listBranches: this.listBranches.bind(this),
      listVersions: this.listVersions.bind(this),
      getVersion: this.getVersion.bind(this),
      getLatestVersion: this.getLatestVersion.bind(this),
      updatePacticipant: this.updatePacticipant.bind(this),
      patchPacticipant: this.patchPacticipant.bind(this),
      updateVersion: this.updateVersion.bind(this),
      getBranchVersions: this.getBranchVersions.bind(this),
      createPacticipant: this.createPacticipant.bind(this),
      deletePacticipant: this.deletePacticipant.bind(this),
      getBranch: this.getBranch.bind(this),
      deleteBranch: this.deleteBranch.bind(this),
      addLabel: this.addLabel.bind(this),
      removeLabel: this.removeLabel.bind(this),
      listLabels: this.listLabels.bind(this),
      getPacticipantLabel: this.getPacticipantLabel.bind(this),
      listPacticipantsByLabel: this.listPacticipantsByLabel.bind(this),
    };
  }
}
