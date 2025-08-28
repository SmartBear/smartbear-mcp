import { ApiResponse, BaseAPI } from './base.js';
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

export interface ViewErrorOnProjectOptions {
  [key: string]: any;
}

export interface ViewLatestEventOnErrorOptions {
  base?: string; // date-time format
  filters?: FilterObject; // Additional filters to apply along with the error.id filter
  full_reports?: boolean;
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

// Pivot-related interfaces based on the Data Access API
export interface PivotApiView {
  event_field_display_id: string;
  name: string;
  cardinality?: number;
  values?: PivotValueApiView[];
}

export interface PivotValueApiView {
  name: string;
  events_count: number;
  users_count?: number;
  percentage?: number;
}

export interface ListPivotsOptions {
  filters?: FilterObject;
  summary_size?: number;
  pivots?: string[]; // Array of field names to pivot by
  per_page?: number;
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

export const ReopenConditions = [
  'occurs_after',
  'n_occurrences_in_m_hours',
  'n_additional_occurrences',
  'n_additional_users'
] as const;

export interface ErrorUpdateReopenRules {
  reopen_if: typeof ReopenConditions[number];
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
  async viewErrorOnProject(projectId: string, errorId: string, options: ViewErrorOnProjectOptions = {}): Promise<ApiResponse<ViewErrorOnProjectResponse>> {
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
    })) as ApiResponse<ViewErrorOnProjectResponse>;
  }

  /**
   * View the latest Event on an Error
   * GET /errors/{error_id}/latest_event
   */
  async viewLatestEventOnError(errorId: string, options: ViewLatestEventOnErrorOptions = {}): Promise<ApiResponse<ViewLatestEventOnErrorResponse>> {
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
    })) as ApiResponse<ViewLatestEventOnErrorResponse>;
  }

  /**
   * List the Events on a Project
   * GET /projects/{project_id}/events
   */
  async listEventsOnProject(projectId: string, queryString = ''): Promise<ApiResponse<Event[]>> {
    const url = `/projects/${projectId}/events${queryString}`;
      
    return await this.request<Event[]>({
      method: 'GET',
      url,
    });
  }

  /**
   * View an Event by ID
   * GET /projects/{project_id}/events/{event_id}
   */
  async viewEventById(projectId: string, eventId: string, options: ViewEventByIdOptions = {}): Promise<ApiResponse<ViewEventByIdResponse>> {
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
    })) as ApiResponse<ViewEventByIdResponse>;
  }

  /**
   * List the Errors on a Project
   * GET /projects/{project_id}/errors
   */
  async listProjectErrors(projectId: string, options: ListProjectErrorsOptions = {}): Promise<ApiResponse<ErrorApiView[]>> {
    const url = options.filters
      ? `/projects/${projectId}/errors?${toQueryString(options.filters)}`
      : `/projects/${projectId}/errors`;
    return (await this.request<ErrorApiView[]>({
      method: 'GET',
      url,
    })) as ApiResponse<ErrorApiView[]>;
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
  ): Promise<ApiResponse<ErrorApiView>> {
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
    })) as ApiResponse<ErrorApiView>;
  }

  /**
   * List Pivots on an Error
   * GET /projects/{project_id}/errors/{error_id}/pivots
   */
  async listErrorPivots(projectId: string, errorId: string, options: ListPivotsOptions = {}): Promise<ApiResponse<PivotApiView[]>> {
    const params = new URLSearchParams();
    
    if (options.filters) {
      const filterParams = new URLSearchParams(toQueryString(options.filters));
      filterParams.forEach((value, key) => {
        params.append(key, value);
      });
    }
    
    if (options.summary_size !== undefined) {
      params.append('summary_size', options.summary_size.toString());
    }
    
    if (options.pivots && options.pivots.length > 0) {
      options.pivots.forEach(pivot => {
        params.append('pivots[]', pivot);
      });
    }
    
    if (options.per_page !== undefined) {
      params.append('per_page', options.per_page.toString());
    }

    const url = params.toString()
      ? `/projects/${projectId}/errors/${errorId}/pivots?${params}`
      : `/projects/${projectId}/errors/${errorId}/pivots`;
      
    return await this.request<PivotApiView[]>({
      method: 'GET',
      url,
    });
  }
}
