import {Client, GetInputFunction, RegisterToolsFunction} from "../common/types.js";
import {ApiClient} from "./common/api-client.js";

export class ZephyrClient implements Client {
  private readonly apiClient: ApiClient;
  name = "Zephyr Test Management for Jira";
  prefix = "zephyr";

  constructor(bearerToken: string,
              baseUrl: string = 'https://api.zephyrscale.smartbear.com/v2') {
    this.apiClient = new ApiClient(bearerToken, baseUrl);
  }

  registerTools(register: RegisterToolsFunction, getInput: GetInputFunction): void {
    // No tools to register for now
  }

}
