import type {
  CreateEnvironmentInput,
  DeployedVersion,
  DeployedVersionsResponse,
  Environment,
  EnvironmentsResponse,
  GetCurrentlyDeployedInput,
  GetCurrentlySupportedInput,
  GetEnvironmentInput,
  GetVersionDeployedInput,
  MetricsResponse,
  RecordDeploymentInput,
  RecordReleaseInput,
  ReleasedVersion,
  ReleasedVersionsResponse,
  TeamMetricsResponse,
  UpdateEnvironmentInput,
} from "./base";
import { PactflowBaseClient } from "./base-client";

export abstract class PactflowEnvironmentMethods extends PactflowBaseClient {
  /**
   * Retrieves all environments configured in the workspace.
   *
   * @returns List of environments with their UUIDs, names, and production flags.
   * @throws ToolError if the request fails.
   */
  async listEnvironments(): Promise<EnvironmentsResponse> {
    return await this.fetchJson<EnvironmentsResponse>(
      `${this.baseUrl}/environments`,
      { method: "GET", errorContext: "List Environments" },
    );
  }

  /**
   * Retrieves metadata for a specific environment by UUID.
   *
   * @param params - `environmentId`: The UUID of the environment.
   * @returns Environment metadata including name, display name, and production flag.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async getEnvironment({
    environmentId,
  }: GetEnvironmentInput): Promise<Environment> {
    return await this.fetchJson<Environment>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Environment" },
    );
  }

  /**
   * Creates a new deployment environment in the workspace.
   *
   * @param body - Environment name, display name, and whether it is a production environment.
   * @returns The created environment resource.
   * @throws ToolError if the request fails.
   */
  async createEnvironment(body: CreateEnvironmentInput): Promise<Environment> {
    return await this.fetchJson<Environment>(`${this.baseUrl}/environments`, {
      method: "POST",
      body,
      errorContext: "Create Environment",
    });
  }

  /**
   * Fully replaces an environment's configuration.
   *
   * @param params - `environmentId` (UUID) plus updated name, display name, and production flag.
   * @returns The updated environment resource.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async updateEnvironment({
    environmentId,
    ...body
  }: UpdateEnvironmentInput): Promise<Environment> {
    return await this.fetchJson<Environment>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "PUT", body, errorContext: "Update Environment" },
    );
  }

  /**
   * Deletes a deployment environment from the workspace.
   *
   * @param params - `environmentId`: UUID of the environment to delete.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async deleteEnvironment({
    environmentId,
  }: GetEnvironmentInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "DELETE", errorContext: "Delete Environment" },
    );
  }

  /**
   * Records that a specific version of a pacticipant has been deployed to an environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, `environmentId`, and optional
   *   `applicationInstance` (for blue/green or multi-instance deployments).
   * @returns The created deployment record.
   * @throws ToolError if the request fails.
   */
  async recordDeployment({
    pacticipantName,
    versionNumber,
    environmentId,
    applicationInstance,
  }: RecordDeploymentInput): Promise<DeployedVersion> {
    return await this.fetchJson<DeployedVersion>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      {
        method: "POST",
        body: applicationInstance ? { applicationInstance } : {},
        errorContext: "Record Deployment",
      },
    );
  }

  /**
   * Retrieves all versions currently deployed to a given environment.
   *
   * @param params - `environmentId`: The UUID of the environment to query.
   * @returns List of currently deployed versions across all pacticipants.
   * @throws ToolError if the request fails.
   */
  async getCurrentlyDeployed({
    environmentId,
  }: GetCurrentlyDeployedInput): Promise<DeployedVersionsResponse> {
    return await this.fetchJson<DeployedVersionsResponse>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}/deployed-versions/currently-deployed`,
      { method: "GET", errorContext: "Get Currently Deployed" },
    );
  }

  /**
   * Records that a version of a pacticipant has been released to an environment.
   * Used for mobile/library workflows where multiple versions coexist simultaneously.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns The created release record.
   * @throws ToolError if the request fails.
   */
  async recordRelease({
    pacticipantName,
    versionNumber,
    environmentId,
  }: RecordReleaseInput): Promise<ReleasedVersion> {
    return await this.fetchJson<ReleasedVersion>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "POST", body: {}, errorContext: "Record Release" },
    );
  }

  /**
   * Retrieves all versions currently released and supported in a given environment.
   *
   * @param params - `environmentId`: The UUID of the environment to query.
   * @returns List of currently supported released versions.
   * @throws ToolError if the request fails.
   */
  async getCurrentlySupported({
    environmentId,
  }: GetCurrentlySupportedInput): Promise<ReleasedVersionsResponse> {
    return await this.fetchJson<ReleasedVersionsResponse>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}/released-versions/currently-supported`,
      { method: "GET", errorContext: "Get Currently Supported" },
    );
  }

  /**
   * Retrieves deployment records for a specific pacticipant version in a given environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns All deployment records for the version, including whether each is currently active.
   * @throws ToolError if the request fails.
   */
  async getDeployedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<DeployedVersionsResponse> {
    return await this.fetchJson<DeployedVersionsResponse>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Deployed Versions" },
    );
  }

  /**
   * Retrieves release records for a specific pacticipant version in a given environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns All release records for the version in the environment.
   * @throws ToolError if the request fails.
   */
  async getReleasedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<ReleasedVersionsResponse> {
    return await this.fetchJson<ReleasedVersionsResponse>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Released Versions" },
    );
  }

  /**
   * Retrieves metrics across the workspace.
   *
   * @returns MetricsResponse containing workspace-wide metrics.
   * @throws ToolError if the request fails.
   */
  async getMetrics(): Promise<MetricsResponse> {
    return await this.fetchJson<MetricsResponse>(`${this.baseUrl}/metrics`, {
      method: "GET",
      errorContext: "Metrics Request",
    });
  }

  /**
   * Retrieves metrics for all teams.
   *
   * @returns TeamMetricsResponse containing metrics for all teams.
   * @throws ToolError if the request fails.
   */
  async getTeamMetrics(): Promise<TeamMetricsResponse> {
    return await this.fetchJson<TeamMetricsResponse>(
      `${this.baseUrl}/metrics/teams`,
      {
        method: "GET",
        errorContext: "Team Metrics Request",
      },
    );
  }
}
