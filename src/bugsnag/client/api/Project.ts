import type { Configuration } from "../configuration.js";
import { type ApiResponse, BaseAPI, pickFieldsFromArray } from "./base.js";

// --- Response Types ---
export interface Project {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  stability_target_type: StabilityTargetType;
  target_stability: StabilityTargetData;
  critical_stability: StabilityTargetData;
}

export interface EventFieldFilterOptions {
  name: string;
  type?: string[];
}

export interface EventFieldPivotOptions {
  name: string;
  summary?: boolean;
  values?: boolean;
  cardinality?: boolean;
  average?: boolean;
}

export interface EventField {
  custom: boolean;
  display_id: string;
  filter_options: EventFieldFilterOptions;
  pivot_options: EventFieldPivotOptions;
}

export interface ListProjectEventFieldsOptions {
  [key: string]: any;
}

export type ProjectType =
  | "android"
  | "angular"
  | "asgi"
  | "aspnet"
  | "aspnet_core"
  | "backbone"
  | "bottle"
  | "cocos2dx"
  | "connect"
  | "django"
  | "dotnet"
  | "dotnet_desktop"
  | "dotnet_mvc"
  | "electron"
  | "ember"
  | "eventmachine"
  | "expo"
  | "express"
  | "flask"
  | "flutter"
  | "gin"
  | "go"
  | "go_net_http"
  | "heroku"
  | "ios"
  | "java"
  | "java_desktop"
  | "js"
  | "koa"
  | "laravel"
  | "lumen"
  | "magento"
  | "martini"
  | "minidump"
  | "ndk"
  | "negroni"
  | "nintendo_switch"
  | "node"
  | "osx"
  | "other_desktop"
  | "other_mobile"
  | "other_tv"
  | "php"
  | "python"
  | "rack"
  | "rails"
  | "react"
  | "reactnative"
  | "restify"
  | "revel"
  | "ruby"
  | "silex"
  | "sinatra"
  | "spring"
  | "symfony"
  | "tornado"
  | "tvos"
  | "unity"
  | "unrealengine"
  | "vue"
  | "watchos"
  | "webapi"
  | "wordpress"
  | "wpf"
  | "wsgi"
  | "other";

// Project create
export interface ProjectCreateRequest {
  name: string;
  type: ProjectType;
  ignore_old_browsers?: boolean;
}

// Builds
export interface ListBuildsOptions {
  release_stage?: string;
  next_url?: string;
}

export interface SourceControl {
  service: string;
  commit_url: string;
  revision: string;
  diff_url_to_previous: string;
  previous_app_version?: string;
}

export interface BuildSummaryResponse {
  id: string;
  release_time: string;
  app_version: string;
  release_stage: { name: string };
  errors_introduced_count: number;
  errors_seen_count: number;
  total_sessions_count: number;
  unhandled_sessions_count: number;
  accumulative_daily_users_seen: number;
  accumulative_daily_users_with_unhandled: number;
}

export interface BuildResponse {
  id: string;
  project_id: string;
  release_time: string;
  release_source: string;
  app_version: string;
  app_version_code: string;
  app_bundle_version: string;
  build_label: string;
  builder_name: string;
  build_tool: string;
  errors_introduced_count: number;
  errors_seen_count: number;
  sessions_count_in_last_24h: number;
  total_sessions_count: number;
  unhandled_sessions_count: number;
  accumulative_daily_users_seen: number;
  accumulative_daily_users_with_unhandled: number;
  metadata: {
    [key: string]: string;
  };
  release_stage: { name: string };
  source_control: SourceControl;
  release_group_id: string;
}

export type BuildResponseAny = BuildResponse | BuildSummaryResponse;

// Releases
export interface ListReleasesOptions {
  release_stage_name?: string;
  visible_only?: boolean;
  top_only?: boolean;
  next_url?: string;
}

export interface ReleaseSummaryResponse {
  id: string;
  release_stage_name: string;
  app_version: string;
  first_released_at: string;
  first_release_id: string;
  releases_count: number;
  visible: boolean;
  total_sessions_count: number;
  unhandled_sessions_count: number;
  sessions_count_in_last_24h: number;
  accumulative_daily_users_seen: number;
  accumulative_daily_users_with_unhandled: number;
}

export interface ReleaseResponse {
  id: string;
  project_id: string;
  release_stage_name: string;
  app_version: string;
  first_released_at: string;
  first_release_id: string;
  releases_count: number;
  has_secondary_versions: boolean;
  build_tool: string;
  builder_name: string;
  source_control: SourceControl;
  top_release_group: boolean;
  visible: boolean;
  total_sessions_count: number;
  unhandled_sessions_count: number;
  sessions_count_in_last_24h: number;
  accumulative_daily_users_seen: number;
  accumulative_daily_users_with_unhandled: number;
}

export type ReleaseResponseAny = ReleaseResponse | ReleaseSummaryResponse;

// Stability
export type StabilityTargetType = "user" | "session";
export interface StabilityData {
  user_stability: number;
  session_stability: number;
  stability_target_type: StabilityTargetType;
  target_stability: number;
  critical_stability: number;
  meets_target_stability: boolean;
  meets_critical_stability: boolean;
}

export interface ProjectStabilityTargets {
  target_stability: StabilityTargetData;
  critical_stability: StabilityTargetData;
  stability_target_type: StabilityTargetType;
}

export interface StabilityTargetData {
  value: number;
  updated_at: string;
  updated_by_id: string;
}

// --- API Class ---

export class ProjectAPI extends BaseAPI {
  static projectFields: (keyof Project)[] = [
    "id",
    "name",
    "slug",
    "api_key",
    "stability_target_type",
    "target_stability",
    "critical_stability",
  ];
  static filterFields: string[] = [
    "errors_url",
    "events_url",
    "url",
    "html_url",
  ];
  static eventFieldFields: (keyof EventField)[] = [
    "custom",
    "display_id",
    "filter_options",
    "pivot_options",
  ];
  static buildFields: (keyof BuildSummaryResponse)[] = [
    "id",
    "release_time",
    "app_version",
    "release_stage",
    "errors_introduced_count",
    "errors_seen_count",
    "total_sessions_count",
    "unhandled_sessions_count",
    "accumulative_daily_users_seen",
    "accumulative_daily_users_with_unhandled",
  ];
  static releaseFields: (keyof ReleaseSummaryResponse)[] = [
    "id",
    "release_stage_name",
    "app_version",
    "first_released_at",
    "first_release_id",
    "releases_count",
    "visible",
    "total_sessions_count",
    "unhandled_sessions_count",
    "sessions_count_in_last_24h",
    "accumulative_daily_users_seen",
    "accumulative_daily_users_with_unhandled",
  ];

  constructor(configuration: Configuration) {
    super(configuration, ProjectAPI.filterFields);
  }

  /**
   * List the Event Fields for a Project
   * GET /projects/{project_id}/event_fields
   * @param projectId The project ID
   * @returns A promise that resolves to the list of event fields
   */
  async listProjectEventFields(
    projectId: string,
  ): Promise<ApiResponse<EventField[]>> {
    const url = `/projects/${projectId}/event_fields`;

    const data = await this.request<EventField[]>({
      method: "GET",
      url,
    });

    // Only return allowed fields
    return {
      ...data,
      body: pickFieldsFromArray<EventField>(
        data.body || [],
        ProjectAPI.eventFieldFields,
      ),
    };
  }

  /**
   * Create a Project in an Organization
   * POST /organizations/{organization_id}/projects
   * @param organizationId The organization ID
   * @param data The project creation request body
   * @returns A promise that resolves to the created project
   */
  async createProject(
    organizationId: string,
    data: ProjectCreateRequest,
  ): Promise<ApiResponse<Project>> {
    const url = `/organizations/${organizationId}/projects`;
    return await this.request<Project>({
      method: "POST",
      url,
      body: data,
    });
  }

  /**
   * Lists builds for a specific project.
   * GET /projects/{project_id}/releases
   * @param projectId The ID of the project.
   * @param opts Options for listing releases, including filtering by release stage.
   * @returns A promise that resolves to an array of `ListReleasesResponse` objects.
   */
  async listBuilds(
    projectId: string,
    opts: ListBuildsOptions,
  ): Promise<ApiResponse<BuildSummaryResponse[]>> {
    const url =
      opts.next_url ??
      `/projects/${projectId}/releases${opts.release_stage ? `?release_stage=${opts.release_stage}` : ""}`;
    const response = await this.request<BuildSummaryResponse[]>(
      {
        method: "GET",
        url,
      },
      false, // Paginate results
    );
    return {
      ...response,
      body: pickFieldsFromArray<BuildSummaryResponse>(
        response.body || [],
        ProjectAPI.buildFields,
      ),
    };
  }

  /**
   * Retrieves a specific build from a project.
   * GET /projects/{project_id}/releases/{release_id}
   * @param projectId The ID of the project.
   * @param buildId The ID of the release to retrieve.
   * @returns A promise that resolves to the release data.
   */
  async getBuild(
    projectId: string,
    buildId: string,
  ): Promise<ApiResponse<BuildResponse>> {
    const url = `/projects/${projectId}/releases/${buildId}`;
    return await this.request<BuildResponse>({
      method: "GET",
      url,
    });
  }

  /**
   * Lists releases for a specific project.
   * GET /projects/{project_id}/release_groups
   * @param projectId The ID of the project.
   * @param opts Options for listing releases, including filtering by release stage and visibility.
   * @returns A promise that resolves to an array of `ReleaseSummaryResponse` objects.
   */
  async listReleases(
    projectId: string,
    opts: ListReleasesOptions,
  ): Promise<ApiResponse<ReleaseSummaryResponse[]>> {
    const url =
      opts.next_url ??
      `/projects/${projectId}/release_groups?` +
        `release_stage_name=${opts.release_stage_name ?? "production"}&` +
        `visible_only=${opts.visible_only ?? false}&` +
        `top_only=${opts.top_only ?? false}`;
    const response = await this.request<ReleaseSummaryResponse[]>(
      {
        method: "GET",
        url,
      },
      false, // Paginate results
    );

    return {
      ...response,
      body: pickFieldsFromArray<ReleaseSummaryResponse>(
        response.body || [],
        ProjectAPI.releaseFields,
      ),
    };
  }

  /**
   * Retrieves a specific release by its ID.
   * GET /release_groups/{release_id}
   * @param releaseId The ID of the release to retrieve.
   * @returns A promise that resolves to the release data.
   */
  async getRelease(releaseId: string): Promise<ApiResponse<ReleaseResponse>> {
    const url = `/release_groups/${releaseId}`;
    return await this.request<ReleaseResponse>({
      method: "GET",
      url,
    });
  }

  /**
   * Lists builds associated with a specific release group.
   * GET /release_groups/{release_id}/releases
   * @param releaseId The ID of the release group.
   * @return A promise that resolves to an array of `BuildResponse` objects.
   */
  async listBuildsInRelease(
    releaseId: string,
  ): Promise<ApiResponse<BuildResponse[]>> {
    const url = `/release_groups/${releaseId}/releases`;
    return await this.request<BuildResponse[]>(
      {
        method: "GET",
        url,
      },
      true,
    );
  }
}
