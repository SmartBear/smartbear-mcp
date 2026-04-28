import { type ApiResponse, BaseAPI } from "./base";
import { type Collaborator, OrganizationsApiFetchParamCreator } from "./index";

export class OrganizationAPI extends BaseAPI {
  static collaboratorFields: (keyof Collaborator)[] = ["id", "name", "email"];

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
