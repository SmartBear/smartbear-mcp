import type { FilterObject } from "../filters.js";
import { type ApiResponse, BaseAPI, getQueryParams } from "./base.js";
import {
  type ErrorApiView,
  ErrorsApiFetchParamCreator,
  type ErrorUpdateRequest,
  type EventApiView,
  type PivotApiView,
} from "./index.js";

export class ErrorAPI extends BaseAPI {
  static filterFields: string[] = ["url", "project_url", "events_url"];

  /**
   * View an Error on a Project
   * GET /projects/{project_id}/errors/{error_id}
   */
  async viewErrorOnProject(
    projectId: string,
    errorId: string,
  ): Promise<ApiResponse<ErrorApiView>> {
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).viewErrorOnProject(projectId, errorId);
    return await this.requestObject<ErrorApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * Get the latest Event in a Project, with optional filters
   * GET /projects/{project_id}/events
   */
  async listEventsOnProject(
    projectId: string,
    base?: Date | null,
    sort?: string,
    direction?: string,
    perPage?: number,
    filters?: FilterObject,
    fullReports?: boolean,
  ): Promise<ApiResponse<ErrorApiView[]>> {
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).listEventsOnProject(
      projectId,
      base ?? undefined,
      sort,
      direction,
      perPage,
      undefined,
      fullReports,
      { query: filters },
    );
    return await this.requestArray<ErrorApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * View an Event by ID
   * GET /projects/{project_id}/events/{event_id}
   */
  async viewEventById(
    projectId: string,
    eventId: string,
  ): Promise<ApiResponse<EventApiView>> {
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).viewEventById(projectId, eventId);
    return await this.requestObject<EventApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List the Errors on a Project
   * GET /projects/{project_id}/errors
   */
  async listProjectErrors(
    projectId: string,
    base?: Date | null,
    sort?: string,
    direction?: string,
    perPage?: number,
    filters?: FilterObject,
    nextUrl?: string,
  ): Promise<ApiResponse<ErrorApiView[]>> {
    const options = getQueryParams(nextUrl, nextUrl ? undefined : filters);
    if (nextUrl) {
      if (perPage) {
        // Next links need to be used as-is to ensure results are consistent, so only the page size can be modified
        // the others will get overridden
        options.query.per_page = perPage.toString();
      }
      direction = undefined;
      sort = undefined;
      base = undefined;
    }
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).listProjectErrors(
      projectId,
      base ?? undefined,
      sort,
      direction,
      perPage,
      undefined,
      undefined,
      options,
    );
    return await this.requestArray<ErrorApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }

  /**
   * Update an Error on a Project
   * PATCH /projects/{project_id}/errors/{error_id}
   */
  async updateErrorOnProject(
    projectId: string,
    errorId: string,
    body: ErrorUpdateRequest,
  ): Promise<ApiResponse<ErrorApiView>> {
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).updateErrorOnProject(body, projectId, errorId);
    return await this.requestObject<ErrorApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
    );
  }

  /**
   * List Pivots on an Error
   * GET /projects/{project_id}/errors/{error_id}/pivots
   */
  async getPivotValuesOnAnError(
    projectId: string,
    errorId: string,
    filters?: FilterObject,
    summarySize?: number,
    pivots?: Array<string>,
    perPage?: number,
  ): Promise<ApiResponse<PivotApiView[]>> {
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).listPivotsOnAnError(
      projectId,
      errorId,
      undefined,
      summarySize,
      pivots,
      perPage,
      { query: filters },
    );
    return await this.requestArray<PivotApiView>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }
}
