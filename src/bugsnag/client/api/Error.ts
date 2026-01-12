import { type FilterObject, toUrlSearchParams } from "../filters";
import { type ApiResponse, BaseAPI } from "./base";
import {
  type ErrorApiView,
  ErrorsApiFetchParamCreator,
  type ErrorUpdateRequest,
  type EventApiView,
  type PivotApiView,
} from "./index";

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
    nextUrl?: string,
  ): Promise<ApiResponse<EventApiView[]>> {
    if (nextUrl) {
      // Don't allow override of these params when using nextUrl
      direction = undefined;
      sort = undefined;
      base = undefined;
    }
    const localVarFetchArgs = ErrorsApiFetchParamCreator(
      this.configuration,
    ).listEventsOnProject(
      projectId,
      base ?? undefined,
      sort,
      direction,
      perPage,
      undefined, // Filters are encoded separately below
      fullReports,
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
    return await this.requestArray<EventApiView>(
      url.toString(),
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
    if (nextUrl) {
      // Don't allow override of these params when using nextUrl
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
      undefined,
      undefined, // Filters are encoded separately below
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
    if (!nextUrl && filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return await this.requestArray<ErrorApiView>(
      url.toString(),
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
      undefined, // filters are encoded separately below
      summarySize,
      pivots,
      undefined, // perPage handled in url search params below
    );

    const url = new URL(localVarFetchArgs.url, this.configuration.basePath);
    if (perPage) {
      // Allow override of per page, even with nextUrl
      url.searchParams.set("per_page", perPage.toString());
    }
    if (filters) {
      // Apply our own encoding of filters
      toUrlSearchParams(filters).forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }

    return await this.requestArray<PivotApiView>(
      url.toString(),
      localVarFetchArgs.options,
      false, // Paginate results
    );
  }
}
