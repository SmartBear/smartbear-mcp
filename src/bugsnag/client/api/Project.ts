import { Configuration } from "../configuration.js";
import { BaseAPI, pickFieldsFromArray, ApiResponse, pickFields } from "./base.js";
import { Project as ProjectApiView } from "./CurrentUser.js";

// --- Response Types ---

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
  | 'android'
  | 'angular'
  | 'asgi'
  | 'aspnet'
  | 'aspnet_core'
  | 'backbone'
  | 'bottle'
  | 'cocos2dx'
  | 'connect'
  | 'django'
  | 'dotnet'
  | 'dotnet_desktop'
  | 'dotnet_mvc'
  | 'electron'
  | 'ember'
  | 'eventmachine'
  | 'expo'
  | 'express'
  | 'flask'
  | 'flutter'
  | 'gin'
  | 'go'
  | 'go_net_http'
  | 'heroku'
  | 'ios'
  | 'java'
  | 'java_desktop'
  | 'js'
  | 'koa'
  | 'laravel'
  | 'lumen'
  | 'magento'
  | 'martini'
  | 'minidump'
  | 'ndk'
  | 'negroni'
  | 'nintendo_switch'
  | 'node'
  | 'osx'
  | 'other_desktop'
  | 'other_mobile'
  | 'other_tv'
  | 'php'
  | 'python'
  | 'rack'
  | 'rails'
  | 'react'
  | 'reactnative'
  | 'restify'
  | 'revel'
  | 'ruby'
  | 'silex'
  | 'sinatra'
  | 'spring'
  | 'symfony'
  | 'tornado'
  | 'tvos'
  | 'unity'
  | 'unrealengine'
  | 'vue'
  | 'watchos'
  | 'webapi'
  | 'wordpress'
  | 'wpf'
  | 'wsgi'
  | 'other';

export interface ProjectCreateRequest {
  name: string;
  type: ProjectType;
  ignore_old_browsers?: boolean;
}

export interface ListBuildsOptions {
  release_stage?: string;
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
  source_control: {
    service: string;
    commit_url: string;
    revision: string;
    diff_url_to_previous: string;
  };
  release_group_id: string;
}

export type BuildResponseAny = BuildResponse | BuildSummaryResponse;

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
  static filterFields: string[] = ["errors_url", "events_url", "url", "html_url"]
  static eventFieldFields: (keyof EventField)[] = ["custom", "display_id", "filter_options", "pivot_options"];
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
  static stabilityFields: (keyof ProjectStabilityTargets)[] = [
    "critical_stability",
    "target_stability",
    "stability_target_type",
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
  async listProjectEventFields(projectId: string): Promise<ApiResponse<EventField[]>> {
    const url = `/projects/${projectId}/event_fields`;

    const data = await this.request<EventField[]>({
      method: 'GET',
      url,
    });

    // Only return allowed fields
    return {
      ...data,
      body: pickFieldsFromArray<EventField>(data.body || [], ProjectAPI.eventFieldFields)
    };
  }

  /**
   * Create a Project in an Organization
   * POST /organizations/{organization_id}/projects
   * @param organizationId The organization ID
   * @param data The project creation request body
   * @returns A promise that resolves to the created project
   */
  async createProject(organizationId: string, data: ProjectCreateRequest): Promise<ApiResponse<ProjectApiView>> {
    const url = `/organizations/${organizationId}/projects`;
    return await this.request<ProjectApiView>({
      method: 'POST',
      url,
      body: data,
    });
  }

  /**
   * Retrieves the stability targets for a specific project.
   * GET /projects/{project_id} (with internal header)
   * @param projectId The ID of the project.
   * @returns A promise that resolves to the project's stability targets.
   */
  async getProjectStabilityTargets(projectId: string) {
    const url = `/projects/${projectId}`;
    const response = await this.request<unknown>({
      method: "GET",
      url,
    });

    return pickFields<ProjectStabilityTargets>(response.body || {}, ProjectAPI.stabilityFields);
  }

  /**
   * Lists builds for a specific project.
   * GET /projects/{project_id}/releases
   * @param projectId The ID of the project.
   * @param data Options for listing releases, including filtering by release stage.
   * @returns A promise that resolves to an array of `ListReleasesResponse` objects.
   */
  async listBuilds(projectId: string, data: ListBuildsOptions) {
    const url = `/projects/${projectId}/releases${data.release_stage ? `?release_stage=${data.release_stage}` : ""}`;
    const response = await this.request<BuildSummaryResponse[]>(
      {
        method: "GET",
        url,
      },
      true
    );

    return {
      ...response,
      body: pickFieldsFromArray<BuildSummaryResponse>(response.body || [], ProjectAPI.buildFields),
    };
  }

  /**
   * Retrieves a specific build from a project.
   * GET /projects/{project_id}/releases/{release_id}
   * @param projectId The ID of the project.
   * @param buildId The ID of the release to retrieve.
   * @returns A promise that resolves to the release data.
   */
  async getBuild(projectId: string, buildId: string) {
    const url = `/projects/${projectId}/releases/${buildId}`;
    return await this.request<BuildResponse>({
      method: "GET",
      url,
    });
  }
}
