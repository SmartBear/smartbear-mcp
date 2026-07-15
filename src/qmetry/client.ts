import z from "zod";
import type { CacheService } from "../common/cache.ts";
import { getRequestHeader } from "../common/request-context.ts";
import type { SmartBearMcpServer } from "../common/server.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import {
  autoResolveViewIdAndFolderPath,
  extractProjectContext,
  findAutoResolveConfig,
} from "./client/auto-resolve.ts";
import { QMETRY_HANDLER_MAP } from "./client/handlers.ts";
import { getProjectInfo } from "./client/project.ts";
import { TOOLS } from "./client/tools/index.ts";
import { QMETRY_DEFAULTS, QmetryToolsHandlers } from "./config/constants.ts";

interface QmetryToolResult {
  [key: string]: unknown;
  content: Array<{ success: boolean; type: "text"; text: string }>;
}

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
  capabilityPrefix = "qmetry";
  configPrefix = "Qmetry";
  config = ConfigurationSchema;

  private token: string | undefined;
  private projectApiKey: string = QMETRY_DEFAULTS.PROJECT_KEY;
  private endpoint: string = QMETRY_DEFAULTS.BASE_URL;
  private projectNumericId: number | undefined;
  private orgCode: string | undefined;

  // biome-ignore lint/suspicious/useAwait: must satisfy the Client interface's Promise<void>-returning configure signature
  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: CacheService,
  ): Promise<void> {
    this.token = config.api_key;
    if (config.base_url) {
      this.endpoint = config.base_url;
    }
  }

  isConfigured(): boolean {
    return true;
  }

  getToken() {
    let contextToken =
      getRequestHeader("Qmetry-Token") || getRequestHeader("apikey");

    if (Array.isArray(contextToken)) {
      [contextToken] = contextToken;
    }

    if (contextToken) {
      return contextToken;
    }

    if (!this.token) {
      throw new Error("Client not configured");
    }
    return this.token;
  }

  getBaseUrl() {
    return this.endpoint;
  }

  private persistProjectContext(projectInfo: unknown) {
    const { scopeId, orgCode } = extractProjectContext(projectInfo);
    if (scopeId !== undefined) {
      this.projectNumericId = scopeId;
    }
    if (orgCode !== undefined) {
      this.orgCode = orgCode;
    }
  }

  // biome-ignore lint/suspicious/useAwait: must satisfy the Client interface's Promise<void>-returning registerTools signature
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: iterates every tool definition to wire auto-resolution, scope-aware headers, and response formatting; splitting per-tool logic out would spread one registration flow across multiple files
  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const resolveContext = (args: Record<string, unknown>) => ({
      baseUrl: (args.baseUrl as string | undefined) ?? this.endpoint,
      projectKey: (args.projectKey as string | undefined) ?? this.projectApiKey,
    });

    const handleAsync = async (
      fn: () => Promise<QmetryToolResult>,
    ): Promise<QmetryToolResult> => {
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
        // biome-ignore lint/suspicious/noConsole: surfaces a misconfigured tool/handler mapping during registration; there is no other diagnostic channel at startup
        console.error(`⚠️ No handler mapped for ${tool.title}`);
        // biome-ignore lint/style/noContinue: skips registering this single misconfigured tool; wrapping the large registration body below in an else would hurt readability more than the continue does
        continue;
      }

      // biome-ignore lint/complexity/noExcessiveLinesPerFunction: see the inner handler's suppression below — one cohesive per-tool registration callback
      register(tool, (args) =>
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this handler wires together auto-resolution, scope-aware header injection, and response formatting that are all tool-registration concerns which must run together per tool
        // biome-ignore lint/complexity/noExcessiveLinesPerFunction: this handler wires together auto-resolution, scope-aware header injection, and response formatting that are all tool-registration concerns which must run together per tool
        handleAsync(async () => {
          const a = args as Record<string, unknown>;
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
              let projectInfo: unknown;
              try {
                projectInfo = await getProjectInfo(
                  this.getToken(),
                  baseUrl,
                  projectKey,
                );
              } catch (err) {
                throw new Error(
                  `Failed to auto-resolve viewId/folderPath/folderID for ${autoResolveConfig.moduleName} in project ${projectKey}. ` +
                    "Please provide them manually or check project access. " +
                    `Error: ${err instanceof Error ? err.message : String(err)}`,
                  { cause: err },
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

              // Also persist numeric project context from this project info response
              this.persistProjectContext(projectInfo);
            }
          }

          // Extract projectKey and baseUrl from arguments to prevent them from being sent in request body
          const { projectKey: _, baseUrl: __, ...cleanArgs } = a;

          // Inject persisted numeric project context only for handlers that explicitly support
          // scope/orgcode headers and strip them from the request body before forwarding.
          // Injecting into all handlers would silently add these fields to API request bodies.
          const ScopeAwareHandlers = new Set([
            QmetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN,
            QmetryToolsHandlers.BULK_UPDATE_TEST_RUN_UDFS,
            QmetryToolsHandlers.FETCH_TEST_RUN_UDF_METADATA,
            QmetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES,
            QmetryToolsHandlers.FETCH_CASCADE_CHILD_VALUES,
          ]);
          const isScopeAware = ScopeAwareHandlers.has(tool.handler);
          const enrichedArgs = {
            ...cleanArgs,
            ...(isScopeAware &&
              this.projectNumericId !== undefined && {
                scopeId: this.projectNumericId,
              }),
            ...(isScopeAware &&
              this.orgCode !== undefined && { orgCode: this.orgCode }),
          };

          const result = await handlerFn(
            this.getToken(),
            baseUrl,
            projectKey,
            enrichedArgs,
          );

          // Persist project context only after successful API call
          if (tool.handler === QmetryToolsHandlers.SET_PROJECT_INFO) {
            this.projectApiKey = projectKey;
            this.persistProjectContext(result);
          }

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
