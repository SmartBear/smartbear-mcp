import type {
  EventField,
  PageLoadSpanGroup,
  PerformanceFilter,
  PerformanceTarget,
  ProjectNetworkGroupingRuleset,
  Span,
  SpanGroup,
  SpanGroupDescription,
} from "./api.js";
import { ProjectsApiFetchParamCreator } from "./api.js";
import { type ApiResponse, BaseAPI, getQueryParams } from "./base.js";
import type { Build, Project, Release } from "./index.js";

/**
 * Helper function to serialize performance filters into query parameters
 * Converts filters array into the format expected by BugSnag API:
 * filters[<key>][][type]=<type>&filters[<key>][][value]=<value>
 */
function serializePerformanceFilters(
  filters: Array<PerformanceFilter>,
): Record<string, string[]> {
  const serialized: Record<string, string[]> = {};

  for (const filter of filters) {
    const key = filter.key;
    if (!filter.filterValues || filter.filterValues.length === 0) {
      continue;
    }

    for (const filterValue of filter.filterValues) {
      const typeKey = `filters[${key}][][type]`;
      const valueKey = `filters[${key}][][value]`;

      if (!serialized[typeKey]) {
        serialized[typeKey] = [];
      }
      if (!serialized[valueKey]) {
        serialized[valueKey] = [];
      }

      serialized[typeKey].push(String(filterValue.matchType));
      serialized[valueKey].push(String(filterValue.value));
    }
  }

  return serialized;
}

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
    filters?: Array<PerformanceFilter>,
    starredOnly?: boolean,
    nextUrl?: string,
  ): Promise<ApiResponse<SpanGroup[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    // Serialize filters if provided
    if (filters && filters.length > 0) {
      Object.assign(options.query, serializePerformanceFilters(filters));
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectSpanGroups(
      projectId,
      sort,
      direction,
      perPage,
      offset,
      undefined, // Don't pass filters to API - already serialized in options
      starredOnly,
      options,
    );
    return await this.requestArray<SpanGroup>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * Get detailed information about a specific span group.
   * GET /projects/{project_id}/span_groups/{id}
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The URL-encoded ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the span group.
   */
  async getProjectSpanGroup(
    projectId: string,
    id: string,
    filters?: Array<PerformanceFilter>,
  ): Promise<ApiResponse<SpanGroup>> {
    const options: any = {};
    if (filters && filters.length > 0) {
      options.query = serializePerformanceFilters(filters);
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroup(projectId, id, undefined, options);
    return await this.requestObject<SpanGroup>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List span group summaries for a project.
   * GET /projects/{project_id}/span_group_summaries
   * @param projectId The ID of the project to which the Span Groups belong.
   * @param perPage The number of results per page.
   * @param offset The offset for the next page of results.
   * @param filters The current filters that are being applied.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of span group summaries.
   */
  async listProjectSpanGroupSummaries(
    projectId: string,
    perPage?: number,
    offset?: number,
    filters?: Array<PerformanceFilter>,
    nextUrl?: string,
  ): Promise<ApiResponse<SpanGroupDescription[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    if (filters && filters.length > 0) {
      Object.assign(options.query, serializePerformanceFilters(filters));
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectSpanGroupSummaries(
      projectId,
      perPage,
      offset,
      undefined,
      options,
    );
    return await this.requestArray<SpanGroupDescription>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * Get time-series performance metrics for a span group.
   * GET /projects/{project_id}/span_groups/{id}/timeline
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The URL-encoded ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the timeline data.
   */
  async getProjectSpanGroupTimeline(
    projectId: string,
    id: string,
    filters?: Array<PerformanceFilter>,
  ): Promise<ApiResponse<any>> {
    const options: any = {};
    if (filters && filters.length > 0) {
      options.query = serializePerformanceFilters(filters);
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroupTimeline(projectId, id, undefined, options);
    return await this.requestObject<any>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * Get distribution histogram of span durations for a span group.
   * GET /projects/{project_id}/span_groups/{id}/distribution
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The URL-encoded ID of the Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the distribution data.
   */
  async getProjectSpanGroupDistribution(
    projectId: string,
    id: string,
    filters?: Array<PerformanceFilter>,
  ): Promise<ApiResponse<any>> {
    const options: any = {};
    if (filters && filters.length > 0) {
      options.query = serializePerformanceFilters(filters);
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectSpanGroupDistribution(projectId, id, undefined, options);
    return await this.requestObject<any>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List span groups that have been starred by the user.
   * GET /projects/{project_id}/starred_span_groups
   * @param projectId The ID of the project to which the Span Groups belong.
   * @param categories The Span Group categories to return.
   * @param perPage The number of results per page.
   * @param offset The offset for the next page of results.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of starred span groups.
   */
  async listProjectStarredSpanGroups(
    projectId: string,
    categories?: Array<string>,
    perPage?: number,
    offset?: number,
    nextUrl?: string,
  ): Promise<ApiResponse<SpanGroupDescription[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectStarredSpanGroups(
      projectId,
      categories,
      perPage,
      offset,
      options,
    );
    return await this.requestArray<SpanGroupDescription>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * List configured performance targets for a specific span group.
   * GET /projects/{project_id}/span_groups/{id}/performance_targets
   * @param projectId The ID of the project to which the Span Group belongs.
   * @param id The URL-encoded ID of the Span Group.
   * @returns A promise that resolves to an array of performance targets.
   */
  async listProjectSpanGroupPerformanceTargets(
    projectId: string,
    id: string,
  ): Promise<ApiResponse<PerformanceTarget[]>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectSpanGroupPerformanceTargets(projectId, id);
    return await this.requestArray<PerformanceTarget>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true, // No pagination
    );
  }

  /**
   * Get individual spans for a span group by category and name.
   * GET /projects/{project_id}/span_group_categories/{category}/span_groups/{name}/spans
   * @param projectId The ID of the project to which the spans belong.
   * @param category The category of the Span Group.
   * @param name The name of the Span Group.
   * @returns A promise that resolves to the span data.
   */
  async getSpansByCategoryAndName(
    projectId: string,
    category: string,
    name: string,
  ): Promise<ApiResponse<any>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getSpansByCategoryAndName(projectId, category, name);
    return await this.requestObject<any>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List individual spans for a specific span group with filtering and sorting.
   * GET /projects/{project_id}/span_groups/{id}/spans
   * @param projectId The ID of the project to which the spans belong.
   * @param id The URL-encoded ID of the Span Group.
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
    filters?: Array<PerformanceFilter>,
    sort?: string,
    direction?: string,
    perPage?: number,
    nextUrl?: string,
  ): Promise<ApiResponse<Span[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    if (filters && filters.length > 0) {
      Object.assign(options.query, serializePerformanceFilters(filters));
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
      options,
    );
    return await this.requestArray<Span>(
      localVarFetchArgs.url,
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
   * List page load specific span groups with filtering and pagination.
   * GET /projects/{project_id}/page_load_span_groups
   * @param projectId The ID of the project to which the Page Load Span Groups belong.
   * @param sort The field to sort the span groups by.
   * @param direction The direction to sort the span groups by.
   * @param perPage The number of results per page.
   * @param offset The offset for the next page of results.
   * @param filters The current filters that are being applied.
   * @param starredOnly Whether to only return Span Groups the requesting user has starred.
   * @param nextUrl Optional URL for next page (overrides other pagination params).
   * @returns A promise that resolves to an array of page load span groups.
   */
  async listProjectPageLoadSpanGroups(
    projectId: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    offset?: number,
    filters?: Array<PerformanceFilter>,
    starredOnly?: boolean,
    nextUrl?: string,
  ): Promise<ApiResponse<PageLoadSpanGroup[]>> {
    const options = getQueryParams(nextUrl);
    if (nextUrl) {
      options.query.per_page = perPage ? perPage.toString() : undefined;
    }
    if (filters && filters.length > 0) {
      Object.assign(options.query, serializePerformanceFilters(filters));
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectPageLoadSpanGroups(
      projectId,
      sort,
      direction,
      perPage,
      offset,
      undefined,
      starredOnly,
      options,
    );
    return await this.requestArray<PageLoadSpanGroup>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * Get detailed information about a specific page load span group.
   * GET /projects/{project_id}/page_load_span_groups/{id}
   * @param projectId The ID of the project to which the Page Load Span Group belongs.
   * @param id The URL-encoded ID of the Page Load Span Group.
   * @param filters The current filters that are being applied.
   * @returns A promise that resolves to the page load span group details.
   */
  async getProjectPageLoadSpanGroupById(
    projectId: string,
    id: string,
    filters?: Array<PerformanceFilter>,
  ): Promise<ApiResponse<PageLoadSpanGroup>> {
    const options: any = {};
    if (filters && filters.length > 0) {
      options.query = serializePerformanceFilters(filters);
    }
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).getProjectPageLoadSpanGroupById(projectId, id, undefined, options);
    return await this.requestObject<PageLoadSpanGroup>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List all trace fields available for filtering spans on a project.
   * GET /projects/{project_id}/trace_fields
   * @param projectId The ID of the project to which the Trace Field belongs.
   * @returns A promise that resolves to an array of trace field definitions.
   */
  async listProjectTraceFields(projectId: string): Promise<ApiResponse<any[]>> {
    const localVarFetchArgs = ProjectsApiFetchParamCreator(
      this.configuration,
    ).listProjectTraceFields(projectId);
    return await this.requestArray<any>(
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
}
