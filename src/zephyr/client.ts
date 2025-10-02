import type { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { ApiClient } from "./common/api-client.js";
import z from "zod";
import { ProjectTools } from "./tool/project.js";

export class ZephyrClient implements Client {
  private readonly projectTools: ProjectTools;
  name = "Zephyr Test Management for Jira";
  prefix = "zephyr";

  constructor(bearerToken: string,
              baseUrl: string = 'https://api.zephyrscale.smartbear.com/v2') {
    const apiClient = new ApiClient(bearerToken, baseUrl);
    this.projectTools = new ProjectTools(apiClient);
  }

  registerTools(register: RegisterToolsFunction, _getInput: GetInputFunction): void {
    console.log('[ZephyrClient] Starting tool registration...');

    register(
      {
        title: "Get Projects",
        summary: "Get details of projects in Zephyr",
        parameters: [
          {
            name: "maxResults",
            type: z.number()
              .min(1)
              .max(1000)
              .describe(`
                Specifies the maximum number of results to return in a single call. The default value is 10, and the maximum value that can be requested is 1000.

                Note that the server may enforce a lower limit than requested, depending on resource availability or other internal constraints.
                If this happens, the result set may be truncated. Always check the maxResults value in the response to confirm how many results were actually returned.
              `),
            required: false,
          },
          {
            name: "startAt",
            type: z.number()
              .min(0)
              .max(1000000)
              .describe(`
                Zero-indexed starting position used to paginate through results. Defaults to 0.
              `),
            required: false,
          },
        ],
      },
      async (args, _extra) => {
        const response = await this.projectTools.getProjects(args.maxResults, args.startAt);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );

    console.log('[ZephyrClient] Finished tool registration...');
  }

}
