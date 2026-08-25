import type {
  CreateEnvironmentInput,
  CurrentlyDeployedResponse,
  CurrentlySupportedResponse,
  DeployedVersionsResponse,
  DeploymentResponse,
  EnvironmentResponse,
  EnvironmentsListResponse,
  GetCurrentlyDeployedInput,
  GetCurrentlySupportedInput,
  GetEnvironmentInput,
  GetVersionDeployedInput,
  RecordDeploymentInput,
  RecordReleaseInput,
  ReleasedVersionsResponse,
  ReleaseResponse,
  UpdateEnvironmentInput,
} from "./base";
import type { HttpClient } from "./http-client";

export class EnvironmentApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all environments configured in the workspace.
   */
  async listEnvironments(): Promise<EnvironmentsListResponse> {
    return await this.http.fetch<EnvironmentsListResponse>(
      `${this.http.baseUrl}/environments`,
      { method: "GET", errorContext: "List Environments" },
    );
  }

  /**
   * Retrieves metadata for a specific environment by UUID.
   */
  async getEnvironment({
    environmentId,
  }: GetEnvironmentInput): Promise<EnvironmentResponse> {
    return await this.http.fetch<EnvironmentResponse>(
      `${this.http.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Environment" },
    );
  }

  /**
   * Records that a specific version of a pacticipant has been deployed to an environment.
   */
  async recordDeployment({
    pacticipantName,
    versionNumber,
    environmentId,
    applicationInstance,
  }: RecordDeploymentInput): Promise<DeploymentResponse> {
    return await this.http.fetch<DeploymentResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      {
        method: "POST",
        body: applicationInstance ? { applicationInstance } : {},
        errorContext: "Record Deployment",
      },
    );
  }

  /**
   * Retrieves all versions currently deployed to a given environment.
   */
  async getCurrentlyDeployed({
    environmentId,
  }: GetCurrentlyDeployedInput): Promise<CurrentlyDeployedResponse> {
    return await this.http.fetch<CurrentlyDeployedResponse>(
      `${this.http.baseUrl}/environments/${encodeURIComponent(environmentId)}/deployed-versions/currently-deployed`,
      { method: "GET", errorContext: "Get Currently Deployed" },
    );
  }

  /**
   * Records that a version of a pacticipant has been released to an environment.
   */
  async recordRelease({
    pacticipantName,
    versionNumber,
    environmentId,
  }: RecordReleaseInput): Promise<ReleaseResponse> {
    return await this.http.fetch<ReleaseResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "POST", body: {}, errorContext: "Record Release" },
    );
  }

  /**
   * Retrieves all versions currently released and supported in a given environment.
   */
  async getCurrentlySupported({
    environmentId,
  }: GetCurrentlySupportedInput): Promise<CurrentlySupportedResponse> {
    return await this.http.fetch<CurrentlySupportedResponse>(
      `${this.http.baseUrl}/environments/${encodeURIComponent(environmentId)}/released-versions/currently-supported`,
      { method: "GET", errorContext: "Get Currently Supported" },
    );
  }

  /**
   * Creates a new deployment environment in the workspace.
   */
  async createEnvironment({
    ...body
  }: CreateEnvironmentInput): Promise<EnvironmentResponse> {
    return await this.http.fetch<EnvironmentResponse>(
      `${this.http.baseUrl}/environments`,
      { method: "POST", body, errorContext: "Create Environment" },
    );
  }

  /**
   * Fully replaces an environment's configuration.
   */
  async updateEnvironment({
    environmentId,
    ...body
  }: UpdateEnvironmentInput): Promise<EnvironmentResponse> {
    return await this.http.fetch<EnvironmentResponse>(
      `${this.http.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "PUT", body, errorContext: "Update Environment" },
    );
  }

  /**
   * Deletes a deployment environment from the workspace.
   */
  async deleteEnvironment({
    environmentId,
  }: GetEnvironmentInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "DELETE", errorContext: "Delete Environment" },
    );
  }

  /**
   * Retrieves deployment records for a specific pacticipant version in a given environment.
   */
  async getDeployedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<DeployedVersionsResponse> {
    return await this.http.fetch<DeployedVersionsResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Deployed Versions" },
    );
  }

  /**
   * Retrieves release records for a specific pacticipant version in a given environment.
   */
  async getReleasedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<ReleasedVersionsResponse> {
    return await this.http.fetch<ReleasedVersionsResponse>(
      `${this.http.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Released Versions" },
    );
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      listEnvironments: this.listEnvironments.bind(this),
      getEnvironment: this.getEnvironment.bind(this),
      recordDeployment: this.recordDeployment.bind(this),
      getCurrentlyDeployed: this.getCurrentlyDeployed.bind(this),
      recordRelease: this.recordRelease.bind(this),
      getCurrentlySupported: this.getCurrentlySupported.bind(this),
      createEnvironment: this.createEnvironment.bind(this),
      updateEnvironment: this.updateEnvironment.bind(this),
      deleteEnvironment: this.deleteEnvironment.bind(this),
      getDeployedVersions: this.getDeployedVersions.bind(this),
      getReleasedVersions: this.getReleasedVersions.bind(this),
    };
  }
}
