import { BaseAPI } from './base.js';
import { Configuration } from '../configuration.js';
import { FilterObject, toQueryString } from './filters.js';

// --- Response Types ---

export interface Error {
  id: string;
}

export interface Event {
  id: string;
}

export interface ErrorApiView {
  id: string;
  project_id: string;
  error_class: string;
  message: string;
  context: string;
  events: number;
  users: number;
  first_seen: string;
  last_seen: string;
  status: string;
  // Add other properties as needed based on the API spec
}

export type ViewErrorOnProjectResponse = Error;
export type ViewLatestEventOnErrorResponse = Event;
export type ViewEventByIdResponse = Event;
export type ListProjectErrorsResponse = ErrorApiView[];

export interface ViewErrorOnProjectOptions {
  [key: string]: any;
}

export interface ViewLatestEventOnErrorOptions {
  [key: string]: any;
}

export interface ViewEventByIdOptions {
  [key: string]: any;
}

export interface ListProjectErrorsOptions {
  base?: string; // date-time format
  sort?: 'last_seen' | 'first_seen' | 'users' | 'events' | 'unsorted';
  direction?: 'asc' | 'desc';
  per_page?: number;
  filters?: FilterObject; // Filters object as defined in the API spec
  [key: string]: any;
}

export const ErrorOperations = [
  'override_severity',
  'assign',
  'create_issue',
  'link_issue',
  'unlink_issue',
  'open',
  'snooze',
  'fix',
  'ignore',
  'delete',
  'discard',
  'undiscard'
] as const;

export interface ErrorUpdateRequest {
  operation: typeof ErrorOperations[number];
  assigned_collaborator_id?: string;
  assigned_team_id?: string;
  issue_url?: string;
  verify_issue_url?: boolean;
  issue_title?: string;
  notification_id?: string;
  reopen_rules?: ErrorUpdateReopenRules;
  severity?: string; // Should match SeverityOptions from the spec
}

export interface ErrorUpdateReopenRules {
  reopen_if: 'occurs_after' | 'n_occurrences_in_m_hours' | 'n_additional_occurrences' | 'n_additional_users';
  additional_users?: number;
  seconds?: number;
  occurrences?: number;
  hours?: number;
  additional_occurrences?: number;
}

// --- API Class ---

export class ErrorAPI extends BaseAPI {
  constructor(configuration: Configuration) {
    super(configuration);
  }

  /**
   * View an Error on a Project
   * GET /projects/{project_id}/errors/{error_id}
   */
  async viewErrorOnProject(projectId: string, errorId: string, options: ViewErrorOnProjectOptions = {}): Promise<ViewErrorOnProjectResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/projects/${projectId}/errors/${errorId}?${params}`
      : `/projects/${projectId}/errors/${errorId}`;
    return (await this.request<ViewErrorOnProjectResponse>({
      method: 'GET',
      url,
    })) as ViewErrorOnProjectResponse;
  }

  /**
   * View the latest Event on an Error
   * GET /errors/{error_id}/latest_event
   */
  async viewLatestEventOnError(errorId: string, options: ViewLatestEventOnErrorOptions = {}): Promise<ViewLatestEventOnErrorResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/errors/${errorId}/latest_event?${params}`
      : `/errors/${errorId}/latest_event`;
    return (await this.request<ViewLatestEventOnErrorResponse>({
      method: 'GET',
      url,
    })) as ViewLatestEventOnErrorResponse;
  }

  /**
   * View an Event by ID
   * GET /projects/{project_id}/events/{event_id}
   */
  async viewEventById(projectId: string, eventId: string, options: ViewEventByIdOptions = {}): Promise<ViewEventByIdResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/projects/${projectId}/events/${eventId}?${params}`
      : `/projects/${projectId}/events/${eventId}`;
    return (await this.request<ViewEventByIdResponse>({
      method: 'GET',
      url,
    })) as ViewEventByIdResponse;
  }

  /**
   * List the Errors on a Project
   * GET /projects/{project_id}/errors
   */
  async listProjectErrors(projectId: string, options: ListProjectErrorsOptions = {}): Promise<ListProjectErrorsResponse> {
    const url = options.filters
      ? `/projects/${projectId}/errors?${toQueryString(options.filters)}`
      : `/projects/${projectId}/errors`;
    return (await this.request<ListProjectErrorsResponse>({
      method: 'GET',
      url,
    })) as ListProjectErrorsResponse;
  }

  /**
   * Update an Error on a Project
   * PATCH /projects/{project_id}/errors/{error_id}
   */
  async updateErrorOnProject(
    projectId: string,
    errorId: string,
    data: ErrorUpdateRequest,
    options: { [key: string]: any } = {}
  ): Promise<ErrorApiView> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/projects/${projectId}/errors/${errorId}?${params}`
      : `/projects/${projectId}/errors/${errorId}`;
    return (await this.request<ErrorApiView>({
      method: 'PATCH',
      url,
      body: data,
    })) as ErrorApiView;
  }
}
