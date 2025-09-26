import { TOOLS } from "./client/tools.js";
import { QMETRY_HANDLER_MAP } from "./client/handlers.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { getProjectInfo } from "./client/project.js";
import { QMETRY_DEFAULTS, QMetryToolsHandlers } from "./config/constants.js";

export class QmetryClient implements Client {
  name = "QMetry";
  prefix = "qmetry";
  private token: string;
  private projectApiKey: string;
  private endpoint: string;
  constructor(token: string, endpoint?: string) {
    this.token = token;
    this.projectApiKey =  QMETRY_DEFAULTS.PROJECT_KEY;
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
    _getInput: GetInputFunction
  ): void {
    const resolveContext = (args: Record<string, any>) => ({
      baseUrl: args.baseUrl ?? this.endpoint,
      projectKey: args.projectKey ?? this.projectApiKey,
    });

    const handleAsync = async (toolTitle: string, fn: () => Promise<any>) => {
      try {
        return await fn();
      } catch (err) {
        console.error(`[QMetry MCP] Tool "${toolTitle}" error:`, err);
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
        handleAsync(tool.title, async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          // handling for FETCH_TEST_CASES to auto-resolve viewId and folderPath
          if (tool.handler === QMetryToolsHandlers.FETCH_TEST_CASES) {
            let viewId = a.viewId;
            let folderPath = a.folderPath;

            if (!viewId || folderPath === undefined) {
              let projectInfo: any;
              try {
                projectInfo = await getProjectInfo(this.token, baseUrl, projectKey) as any;
              } catch (err) {
                throw new Error(
                    `Failed to auto-resolve viewId/folderPath for project ${projectKey}. 
                    Please provide them manually or check project access. 
                    Error: ${err instanceof Error ? err.message : String(err)}`
                  );
              } 
              if (!viewId && projectInfo?.latestViews?.TC?.viewId) {
                viewId = projectInfo.latestViews.TC.viewId;
              }
              if (folderPath === undefined) {
                folderPath = "";
              }
            }

            a.viewId = viewId;
            a.folderPath = folderPath;
          }

          const result = await handlerFn(this.token, baseUrl, projectKey, a);

          // Use custom formatter if available, otherwise return JSON
          const formatted = tool.formatResponse
              ? tool.formatResponse(result)
              : result ?? {};

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
        })
      );
    }
  }
}
