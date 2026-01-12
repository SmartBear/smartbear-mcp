import { type ApiResponse, BaseAPI } from "./base";
import {
  CurrentUserApiFetchParamCreator,
  type Organization,
  type OrganizationApiView,
  type Project,
} from "./index";
import { ProjectAPI } from "./Project";

export class CurrentUserAPI extends BaseAPI {
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
    options: any = {},
  ): Promise<ApiResponse<Organization[]>> {
    const localVarFetchArgs = CurrentUserApiFetchParamCreator(
      this.configuration,
    ).listUserOrganizations(admin, perPage, options);
    return await this.requestArray<Organization>(
      localVarFetchArgs.url,
      localVarFetchArgs.options,
      true,
      CurrentUserAPI.organizationFields,
    );
  }

  /**
   * List projects for a given organization
   * GET /organizations/{organization_id}/projects
   * @param organizationId The organization ID
   * @param options Optional parameters for filtering, pagination, etc.
   * @returns A promise that resolves to the list of projects in the organization
   */
  async getOrganizationProjects(
    organizationId: string,
    q?: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    options?: any,
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
      ProjectAPI.projectFields,
    );
  }
}
