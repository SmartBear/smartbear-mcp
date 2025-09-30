import type { Configuration } from "../configuration.ts";
import { type ApiResponse, BaseAPI, pickFieldsFromArray } from "./base.ts";

// --- Response Types ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export type ListUserOrganizationsResponse = Organization[];

export interface Project {
  id: string;
  name: string;
  slug: string;
  api_key: string;
}

// --- API Class ---

export class CurrentUserAPI extends BaseAPI {
  static filterFields: string[] = [
    "collaborators_url",
    "projects_url",
    "upgrade_url",
  ];
  static organizationFields: (keyof Organization)[] = ["id", "name", "slug"];
  static projectFields: (keyof Project)[] = ["id", "name", "slug", "api_key"];

  constructor(configuration: Configuration) {
    super(configuration, CurrentUserAPI.filterFields);
  }

  /**
   * List the current user's organizations
   * GET /user/organizations
   */
  async listUserOrganizations(
    options: ListUserOrganizationsOptions = {},
  ): Promise<ApiResponse<ListUserOrganizationsResponse>> {
    const { admin, paginate = false, ...queryOptions } = options;
    const params = new URLSearchParams();
    if (admin !== undefined) params.append("admin", String(admin));
    for (const [key, value] of Object.entries(queryOptions)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/user/organizations?${params}`
      : "/user/organizations";
    const data = await this.request<ListUserOrganizationsResponse>(
      {
        method: "GET",
        url,
      },
      paginate,
    );
    // Only return allowed fields
    return {
      ...data,
      body: pickFieldsFromArray<Organization>(
        data.body || [],
        CurrentUserAPI.organizationFields,
      ),
    };
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
    options: GetOrganizationProjectsOptions = {},
  ): Promise<ApiResponse<Project[]>> {
    const { ...queryOptions } = options;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryOptions)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const url = params.toString()
      ? `/organizations/${organizationId}/projects?${params}`
      : `/organizations/${organizationId}/projects`;
    const data = await this.request<Project[]>(
      {
        method: "GET",
        url,
      },
      true,
    ); // Always paginate for projects
    return {
      ...data,
      body: pickFieldsFromArray<Project>(
        data.body || [],
        CurrentUserAPI.projectFields,
      ),
    };
  }
}

export interface ListUserOrganizationsOptions {
  admin?: boolean;
  paginate?: boolean;
  [key: string]: any;
}

export interface GetOrganizationProjectsOptions {
  [key: string]: any;
}
