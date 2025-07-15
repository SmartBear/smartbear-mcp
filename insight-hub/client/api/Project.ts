import { Configuration } from "../configuration.js";
import { BaseAPI, pickFieldsFromArray } from "./base.js";
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

export type ListProjectEventFieldsResponse = EventField[];

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

// --- API Class ---

export class ProjectAPI extends BaseAPI {
  static eventFieldFields: (keyof EventField)[] = [
    'custom',
    'display_id',
    'filter_options',
    'pivot_options'
  ];

  constructor(configuration: Configuration) {
    super(configuration);
  }

  /**
   * List the Event Fields for a Project
   * GET /projects/{project_id}/event_fields
   * @param projectId The project ID
   * @returns A promise that resolves to the list of event fields
   */
  async listProjectEventFields(projectId: string): Promise<ListProjectEventFieldsResponse> {
    const url = `/projects/${projectId}/event_fields`;

    const data = await this.request<ListProjectEventFieldsResponse>({
      method: 'GET',
      url,
    });

    // Only return allowed fields
    return pickFieldsFromArray<EventField>(data as ListProjectEventFieldsResponse[], ProjectAPI.eventFieldFields);
  }

  /**
   * Create a Project in an Organization
   * POST /organizations/{organization_id}/projects
   * @param organizationId The organization ID
   * @param data The project creation request body
   * @returns A promise that resolves to the created project
   */
  async createProject(organizationId: string, data: ProjectCreateRequest): Promise<ProjectApiView> {
    const url = `/organizations/${organizationId}/projects`;
    return (await this.request<ProjectApiView>({
      method: 'POST',
      url,
      body: data,
    })) as ProjectApiView;
  }
}
