import { type EventField, ProjectsApiFetchParamCreator } from "./api.js";
import { type ApiResponse, BaseAPI, getQueryParams } from "./base.js";
import type { Build, Project, Release } from "./index.js";

export class ProjectAPI extends BaseAPI {
  static projectFields: (keyof Project)[] = [
    "id",
    "name",
    "slug",
    "apiKey",
    "stabilityTargetType",
    "targetStability",
    "criticalStability",
  ];
  static eventFieldFields: (keyof EventField)[] = [
    "custom",
    "displayId",
    "filterOptions",
    "pivotOptions",
  ];
  static buildFields: (keyof Build)[] = [
    "id",
    "releaseTime",
    "appVersion",
    "releaseStage",
    "errorsIntroducedCount",
    "errorsSeenCount",
    "totalSessionsCount",
    "unhandledSessionsCount",
    "accumulativeDailyUsersSeen",
    "accumulativeDailyUsersWithUnhandled",
  ];
  static releaseFields: (keyof Release)[] = [
    "id",
    "releaseStageName",
    "appVersion",
    "firstReleasedAt",
    "firstReleaseId",
    "releasesCount",
    "visible",
    "totalSessionsCount",
    "unhandledSessionsCount",
    "sessionsCountInLast24h",
    "accumulativeDailyUsersSeen",
    "accumulativeDailyUsersWithUnhandled",
  ];

  /**
   * List the Event Fields for a Project
   * GET /projects/{project_id}/event_fields
   * @param projectId The project ID
   * @returns A promise that resolves to the list of event fields
   */
  async listProjectEventFields(
    projectId: string,
  ): Promise<ApiResponse<EventField[]>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectEventFields(projectId);
    return await this.requestArray<EventField>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true,
      ProjectAPI.eventFieldFields,
    );
  }

  /**
   * Retrieves a specific build from a project.
   * GET /projects/{project_id}/releases/{release_id}
   * @param projectId The ID of the project.
   * @param releaseId The ID of the release to retrieve.
   * @returns A promise that resolves to the release data.
   */
  async getProjectReleaseById(
    projectId: string,
    releaseId: string,
  ): Promise<ApiResponse<Build>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectReleaseById(projectId, releaseId);
    return await this.requestObject<Build>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      ProjectAPI.buildFields,
    );
  }

  /**
   * Lists releases for a specific project.
   * GET /projects/{project_id}/release_groups
   * @param projectId The ID of the project.
   * @param opts Options for listing releases, including filtering by release stage and visibility.
   * @returns A promise that resolves to an array of `ReleaseSummaryResponse` objects.
   */
  async listProjectReleaseGroups(
    projectId: string,
    releaseStageName: string,
    topOnly?: boolean,
    visibleOnly?: boolean,
    perPage?: number,
    nextUrl?: string,
  ): Promise<ApiResponse<Release[]>> {
    const options = getQueryParams(nextUrl);
    // Next links need to be used as-is to ensure results are consistent, so only the page size can be modified
    // the others will get overridden
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
      topOnly = undefined;
      visibleOnly = undefined;
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectReleaseGroups(
      projectId,
      releaseStageName,
      topOnly,
      visibleOnly,
      perPage,
      undefined, // pageToken passed in through options
      options,
    );
    return await this.requestArray<Release>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
      ProjectAPI.releaseFields,
    );
  }

  /**
   * Retrieves a specific release by its ID.
   * GET /release_groups/{release_id}
   * @param releaseId The ID of the release to retrieve.
   * @returns A promise that resolves to the release data.
   */
  async getReleaseGroup(releaseId: string): Promise<ApiResponse<Release>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getReleaseGroup(releaseId);
    return await this.requestObject<Release>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      ProjectAPI.releaseFields,
    );
  }

  /**
   * Lists builds associated with a specific release group.
   * GET /release_groups/{release_id}/releases
   * @param releaseId The ID of the release group.
   * @return A promise that resolves to an array of `BuildResponse` objects.
   */
  async listBuildsInRelease(releaseId: string): Promise<ApiResponse<Build[]>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getReleaseGroup(releaseId);
    return await this.requestArray<Build>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true,
      ProjectAPI.buildFields,
    );
  }
}
