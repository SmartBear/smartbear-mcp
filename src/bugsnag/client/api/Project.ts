import { type FilterObject, toUrlSearchParams } from "../filters.js";
import type {
  EventField,
  ProjectNetworkGroupingRuleset,
  Span,
  SpanGroup,
  TraceField,
} from "./api.js";
import { ProjectsApiFetchParamCreator } from "./api.js";
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
   * @param releaseStageName The name of the release stage to filter by.
   * @param topOnly Whether to only include top-level releases.
   * @param visibleOnly Whether to only include visible releases.
   * @param perPage The number of results per page.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
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
    if (nextUrl) {
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
      undefined,
      undefined,
    );

    const url = new URL(
      nextUrl ?? localVarFetchArgs.url,
      this.configuration.basePath,
    );
    if (perPage) {
      // Allow override of per page, even with nextUrl
      url.searchParams.set("per_page", perPage.toString());
    }
    return await this.requestArray<Release>(
      url.toString(),
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

  // ============================================================================
  // Performance API Methods
  // ============================================================================

  /**
   * List span groups for a project with optional filtering and pagination.
   * GET /projects/{project_id}/span_groups
   * @param projectId The ID of the project to which the Span Groups belong.
   * @param sort The field to sort the span groups by.
   * @param direction The direction to sort the span groups by.
   * @param perPage The number of results per page.
   * @param offset The offset for the next page of results.
   * @param filters The current filters that are being applied.
   * @param starredOnly Whether to only return Span Groups the requesting user has starred.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of span groups.
   */
  async listProjectSpanGroups(
    projectId: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    offset?: number,
    filters?: FilterObject,
    starredOnly?: boolean,
    nextUrl?: string,
  ): Promise<ApiResponse<SpanGroup[]>> {
    if (nextUrl) {
      sort = undefined;
      direction = undefined;
      offset = undefined;
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectSpanGroups(
      projectId,
      sort,
      direction,
      perPage,
      offset,
      undefined, // Filters are encoded separately below
      starredOnly,
      undefined,
    );
    const url = new URL(
      nextUrl ?? localVarFetchArgs.url,
      this.configuration.basePath,
    );
    if (perPage) {
      // Allow override of per page, even with nextUrl
      url.searchParams.set("per_page", perPage.toString());
    }
    if (!nextUrl && filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestArray<SpanGroup>(
      url.toString(),
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * Get detailed information about a specific span group.
   * GET /projects/{project_id}/span_groups/{id}
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the span group.
   */
  async getProjectSpanGroup(
    projectId: string,
    id: string,
    filters?: FilterObject,
  ): Promise<ApiResponse<SpanGroup>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroup(projectId, id, undefined, undefined);

    const url = new URL(localVarFetchArgs.url, this.configuration.basePath);
    if (filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestObject<SpanGroup>(
      url.toString(),
      localVarFetchArgs.options,
    );
  }

  /**
   * Get time-series performance metrics for a span group.
   * GET /projects/{project_id}/span_groups/{id}/timeline
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the timeline data.
   */
  async getProjectSpanGroupTimeline(
    projectId: string,
    id: string,
    filters?: FilterObject,
  ): Promise<ApiResponse<any>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroupTimeline(projectId, id, undefined, undefined);

    const url = new URL(localVarFetchArgs.url, this.configuration.basePath);
    if (filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestObject<any>(
      url.toString(),
      localVarFetchArgs.options,
    );
  }

  /**
   * Get distribution histogram of span durations for a span group.
   * GET /projects/{project_id}/span_groups/{id}/distribution
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the distribution data.
   */
  async getProjectSpanGroupDistribution(
    projectId: string,
    id: string,
    filters?: FilterObject,
  ): Promise<ApiResponse<any>> {
    const options: any = {};
    if (filters) {
      options.query = toUrlSearchParams(filters);
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroupDistribution(projectId, id, undefined, undefined);

    const url = new URL(localVarFetchArgs.url, this.configuration.basePath);
    if (filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestObject<any>(
      url.toString(),
      localVarFetchArgs.options,
    );
  }

  /**
   * List individual spans for a specific span group with filtering and sorting.
   * GET /projects/{project_id}/span_groups/{id}/spans
   * @param projectId The ID of the project to which the spans belong.
   * @param id The ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @param sort The field to sort the spans by.
   * @param direction The direction to sort the spans by.
   * @param perPage The number of results per page.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of spans.
   */
  async listSpansBySpanGroupId(
    projectId: string,
    id: string,
    filters?: FilterObject,
    sort?: string,
    direction?: string,
    perPage?: number,
    nextUrl?: string,
  ): Promise<ApiResponse<Span[]>> {
    if (nextUrl) {
      sort = undefined;
      direction = undefined;
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listSpansBySpanGroupId(
      projectId,
      id,
      undefined,
      sort,
      direction,
      perPage,
      undefined,
    );

    const url = new URL(
      nextUrl ?? localVarFetchArgs.url,
      this.configuration.basePath,
    );
    if (perPage) {
      // Allow override of per page, even with nextUrl
      url.searchParams.set("per_page", perPage.toString());
    }
    if (!nextUrl && filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestArray<Span>(
      url.toString(),
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * List all spans that belong to a specific trace.
   * GET /projects/{project_id}/traces/{trace_id}/spans
   * @param projectId The ID of the project to which the spans belong.
   * @param traceId The ID of the Trace to which the spans belong.
   * @param from Beginning of window to return spans from (ISO 8601 timestamp).
   * @param to End of window to return spans from (ISO 8601 timestamp).
   * @param targetSpanId The ID of a Span within the Trace to focus on.
   * @param perPage The number of results to return per page.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of spans.
   */
  async listSpansByTraceId(
    projectId: string,
    traceId: string,
    from: string,
    to: string,
    targetSpanId?: string,
    perPage?: number,
    nextUrl?: string,
  ): Promise<ApiResponse<Span[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listSpansByTraceId(
      projectId,
      traceId,
      from,
      to,
      targetSpanId,
      perPage,
      options,
    );
    return await this.requestArray<Span>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * List all trace fields available for filtering spans on a project.
   * GET /projects/{project_id}/trace_fields
   * @param projectId The ID of the project to which the Trace Field belongs.
   * @returns A promise that resolves to an array of trace field definitions.
   */
  async listProjectTraceFields(
    projectId: string,
  ): Promise<ApiResponse<TraceField[]>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectTraceFields(projectId);
    return await this.requestArray<TraceField>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true, // No pagination
    );
  }

  /**
   * Get the network endpoint grouping rules for a project.
   * GET /projects/{project_id}/network_endpoint_grouping
   * @param projectId The ID of the project to retrieve the endpoints for.
   * @returns A promise that resolves to the network grouping ruleset.
   */
  async getProjectNetworkGroupingRuleset(
    projectId: string,
  ): Promise<ApiResponse<ProjectNetworkGroupingRuleset>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectNetworkGroupingRuleset(projectId);
    return await this.requestObject<ProjectNetworkGroupingRuleset>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * Update the network endpoint grouping rules for a project.
   * PUT /projects/{project_id}/network_endpoint_grouping
   * @param projectId The ID of the project to update the endpoints for.
   * @param endpoints Array of URL patterns by which network spans are grouped.
   * @returns A promise that resolves to the updated network grouping ruleset.
   */
  async updateProjectNetworkGroupingRuleset(
    projectId: string,
    endpoints: string[],
  ): Promise<ApiResponse<ProjectNetworkGroupingRuleset>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).updateProjectNetworkGroupingRuleset(projectId, { endpoints });
    return await this.requestObject<ProjectNetworkGroupingRuleset>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }
}
