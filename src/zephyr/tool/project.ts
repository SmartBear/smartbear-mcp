import type { ApiClient } from "../common/api-client.js";
import type { ZephyrProjectList } from "../common/types.js";

export class ProjectTools {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async getProjects(maxResults?: number, startAt?: number): Promise<ZephyrProjectList> {
    return await this.apiClient.get('/projects', { maxResults, startAt });
  }

}
