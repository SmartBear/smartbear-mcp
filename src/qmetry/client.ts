import z from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import {
  autoResolveViewIdAndFolderPath,
  findAutoResolveConfig,
} from "./client/auto-resolve.js";
import { QMETRY_HANDLER_MAP } from "./client/handlers.js";
import { getProjectInfo } from "./client/project.js";
import { TOOLS } from "./client/tools.js";
import { QMETRY_DEFAULTS } from "./config/constants.js";

const ConfigurationSchema = z.object({
  api_key: z.string().describe("QMetry API key for authentication"),
  base_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional QMetry base URL for custom or region-specific endpoints",
    ),
});

export class QmetryClient implements Client {
  name = "QMetry";
  prefix = "qmetry";
  config = ConfigurationSchema;

  private token: string | undefined;
  private projectApiKey: string = QMETRY_DEFAULTS.PROJECT_KEY;
  private endpoint: string = QMETRY_DEFAULTS.BASE_URL;

  async configure(
    _server: any,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<boolean> {
    this.token = config.api_key;
    if (config.base_url) {
      this.endpoint = config.base_url;
    }
    return true;
  }

  getToken() {
    if (!this.token) throw new Error("Client not configured");
    return this.token;
  }

  getBaseUrl() {
    return this.endpoint;
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    const resolveContext = (args: Record<string, any>) => ({
      baseUrl: args.baseUrl ?? this.endpoint,
      projectKey: args.projectKey ?? this.projectApiKey,
    });

    const handleAsync = async (fn: () => Promise<any>) => {
      try {
        return await fn();
      } catch (err) {
        return {
          content: [
            {
              success: false,
              type: "text",
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    };

    for (const tool of TOOLS) {
      const handlerFn = QMETRY_HANDLER_MAP[tool.handler];
      if (!handlerFn) {
        console.error(`⚠️ No handler mapped for ${tool.title}`);
        continue;
      }

      register(tool, (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          // Dynamic auto-resolve for modules that support viewId, folderPath, and folderID
          const autoResolveConfig = findAutoResolveConfig(tool.handler);
          if (autoResolveConfig) {
            // Check if we need to auto-resolve viewId, folderPath, or folderID
            const needsViewIdResolve =
              !a.viewId && autoResolveConfig.viewIdPath;
            const needsFolderPathResolve = a.folderPath === undefined;
            const needsFolderIdResolve =
              autoResolveConfig.folderIdField &&
              !a[autoResolveConfig.folderIdField];

            if (
              needsViewIdResolve ||
              needsFolderPathResolve ||
              needsFolderIdResolve
            ) {
              let projectInfo: any;
              try {
                projectInfo = (await getProjectInfo(
                  this.getToken(),
                  baseUrl,
                  projectKey,
                )) as any;
              } catch (err) {
                throw new Error(
                  `Failed to auto-resolve viewId/folderPath/folderID for ${autoResolveConfig.moduleName} in project ${projectKey}. ` +
                  `Please provide them manually or check project access. ` +
                  `Error: ${err instanceof Error ? err.message : String(err)}`,
                );
              }

              // Apply auto-resolution using the dynamic configuration
              Object.assign(
                a,
                autoResolveViewIdAndFolderPath(
                  a,
                  projectInfo,
                  autoResolveConfig,
                ),
              );
            }
          }

          // Extract projectKey and baseUrl from arguments to prevent them from being sent in request body
          const { projectKey: _, baseUrl: __, ...cleanArgs } = a;

          const result = await handlerFn(
            this.getToken(),
            baseUrl,
            projectKey,
            cleanArgs,
          );

          // Use custom formatter if available, otherwise return JSON
          const formatted = tool.formatResponse
            ? tool.formatResponse(result)
            : (result ?? {});

          return {
            content: [
              {
                success: true,
                type: "text",
                text:
                  typeof formatted === "string"
                    ? formatted
                    : JSON.stringify(formatted, null, 2),
              },
            ],
          };
        }),
      );
    }
  }
}
