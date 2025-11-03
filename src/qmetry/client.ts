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
import { TOOLS } from "./client/tools/index.js";
import { QMETRY_DEFAULTS } from "./config/constants.js";

export class QmetryClient implements Client {
  name = "QMetry";
  prefix = "qmetry";
  private token: string;
  private projectApiKey: string;
  private endpoint: string;
  constructor(token: string, endpoint?: string) {
    this.token = token;
    this.projectApiKey = QMETRY_DEFAULTS.PROJECT_KEY;
    this.endpoint = endpoint || QMETRY_DEFAULTS.BASE_URL;
  }

  getToken() {
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

            // Explicit condition for auto-resolving tcFolderID for Create Test Case
            const needsTcFolderIdAutoResolve =
              autoResolveConfig.folderIdField === "tcFolderID" && !a.tcFolderID;

            // Explicit condition for auto-resolving parentFolderId for Create Test Suite
            const needsParentFolderIdAutoResolve =
              autoResolveConfig.folderIdField === "parentFolderId" &&
              !a.parentFolderId;

            if (
              needsViewIdResolve ||
              needsFolderPathResolve ||
              needsFolderIdResolve ||
              needsTcFolderIdAutoResolve ||
              needsParentFolderIdAutoResolve
            ) {
              let projectInfo: any;
              try {
                projectInfo = (await getProjectInfo(
                  this.token,
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
            this.token,
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
