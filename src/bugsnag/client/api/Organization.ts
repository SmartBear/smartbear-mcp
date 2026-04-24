import { type ApiResponse, BaseAPI } from "./base";
import {
  type Collaborator,
  OrganizationsApiFetchParamCreator,
} from "./index";

export class OrganizationAPI extends BaseAPI {
    static collaboratorFields: (keyof Collaborator)[] = [
    "id",
    "name",
    "email",
    "two_factor_enabled",
    "two_factor_enabled_on",
    "recovery_codes_remaining",
    "password_updated_on",
    "show_time_in_utc",
    "heroku",
    "created_at",
    "is_admin",
    "pending_invitation",
    "last_request_at",
    "project_ids",
    "paid_for",
    "project_roles",
    "managed_by_smartbear_id",
  ];

    /**
     * List the collaborators in a Project
     * GET /projects/{project_id}/collaborators
     * @param projectId The project ID
     * @returns A promise that resolves to the list of collaborators
     */
    async listProjectCollaborators(
      projectId: string,
    ): Promise<ApiResponse<Collaborator[]>> {
      const localVarFetchArgs = OrganizationsApiFetchParamCreator(
        this.configuration,
      ).listProjectCollaborators(projectId);
      return await this.requestArray<Collaborator>(
        localVarFetchArgs.url,
        localVarFetchArgs.options,
        true,
        OrganizationAPI.collaboratorFields,
      );
    }
}