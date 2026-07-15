import {
  CurrentUserApiFetchParamCreator,
  type OrganizationApiView,
} from "./api.ts";
import { type ApiResponse, BaseApi } from "./base.ts";
import type { Organization, Project } from "./models.ts";
import { ProjectApi } from "./project.ts";

export class CurrentUserApi extends BaseApi {
  static organizationFields: (keyof OrganizationApiView)[] = [
    "id",
    "name",
    "slug",
  ];

  /**
   * List the current user's organizations
   * GET /user/organizations
   */
  async listUserOrganizations(
    admin?: boolean,
    perPage?: number,
    options: Record<string, unknown> = {},
  ): Promise<ApiResponse<Organization[]>> {
    const localVarFetchArgs = CurrentUserApiFetchParamCreator(
      this.configuration,
    ).listUserOrganizations(admin, perPage, options);
    return await this.requestArray<Organization>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true,
      CurrentUserApi.organizationFields,
    );
  }

  /**
   * List projects for a given organization
   * GET /organizations/{organization_id}/projects
   * @param organizationId The organization ID
   * @param options Optional parameters for filtering, pagination, etc.
   * @returns A promise that resolves to the list of projects in the organization
   */
  // biome-ignore lint/complexity/useMaxParams: mirrors the positional params of the generated CurrentUserApiFetchParamCreator.getOrganizationProjects
  async getOrganizationProjects(
    organizationId: string,
    q?: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    options?: Record<string, unknown>,
  ): Promise<ApiResponse<Project[]>> {
    const localVarFetchArgs = CurrentUserApiFetchParamCreator(
      this.configuration,
    ).getOrganizationProjects(
      organizationId,
      q,
      sort,
      direction,
      perPage,
      options,
    );
    return await this.requestArray<Project>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true,
      ProjectApi.projectFields,
    );
  }
}
