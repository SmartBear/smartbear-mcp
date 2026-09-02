import z from "zod";
import { getRequestHeader } from "../common/request-context";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import {
  autoResolveViewIdAndFolderPath,
  extractProjectContext,
  findAutoResolveConfig,
} from "./client/auto-resolve";
import {
  extractDatetimePickerFieldNames,
  normalizeDateFieldsInArgs,
  resolveProjectDateFormat,
} from "./client/date-utils";
import { QMETRY_HANDLER_MAP } from "./client/handlers";
import { getProjectInfo } from "./client/project";
import { TOOLS } from "./client/tools/index";
import { fetchUdfLayout } from "./client/udf";
import { QMETRY_DEFAULTS, QMetryToolsHandlers } from "./config/constants";

const ConfigurationSchema = z.object({
  api_key: z
    .string()
    .describe(
      "QMetry API key for authentication (not required when using OAuth)",
    ),
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

  async configure(
    _server: any,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.token = config.api_key;
    if (config.base_url) {
      this.endpoint = config.base_url;
    }
  }

  isConfigured(): boolean {
    return true;
  }

  getAuthToken(): string | null {
    try {
      return this.getToken();
    } catch {
      return null;
    }
  }

  getToken() {
    // 1. OAuth Bearer token (from authorization server)
    const contextToken = getRequestHeader("Authorization");
    if (contextToken) {
      const token = Array.isArray(contextToken)
        ? contextToken[0]
        : contextToken;
      if (token.startsWith("Bearer ")) {
        return token.substring(7);
      }
      return token;
    }

    if (!this.token) throw new Error("Client not configured");
    return this.token;
  }

  getBaseUrl() {
    return this.endpoint;
  }

  private persistProjectContext(projectInfo: any) {
    const { scopeId, orgCode } = extractProjectContext(projectInfo);
    if (scopeId !== undefined) this.projectNumericId = scopeId;
    if (orgCode !== undefined) this.orgCode = orgCode;
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const resolveContext = (args: Record<string, any>) => ({
      baseUrl: this.endpoint,
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

              // Also persist numeric project context from this project info response
              this.persistProjectContext(projectInfo);
            }
          }

          // UDF preflight for CREATE_TEST_CASE:
          // Auto-apply defaultValues, auto-set testCaseState, surface missing mandatory UDF fields,
          // and normalize DATETIMEPICKER values to the project's configured date format.
          // This removes the requirement for the LLM to pre-call Fetch UDF Layout.
          if (tool.handler === QMetryToolsHandlers.CREATE_TEST_CASE) {
            try {
              const projectInfoForDate = await getProjectInfo(
                this.getToken(),
                baseUrl,
                projectKey,
              );
              const { scopeId: freshScopeId, orgCode: freshOrgCode } =
                extractProjectContext(projectInfoForDate);
              const layout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                projectKey,
                {
                  entityType: "TC",
                  pageName: "ADD",
                  ...(freshScopeId !== undefined
                    ? { scopeId: freshScopeId }
                    : {}),
                  ...(freshOrgCode !== undefined
                    ? { orgCode: freshOrgCode }
                    : {}),
                },
              );

              const defaults = layout.defaultValues ?? {};
              if (!a.udfFields) a.udfFields = {};

              // Build a set of system field names so defaults for them go to top-level args,
              // not udfFields — avoids type mismatches (e.g. component expects number[], not number)
              const systemFieldMap = new Map(
                (layout.systemFields ?? []).map((f: any) => [
                  f.name,
                  f.fieldTypeName,
                ]),
              );

              // Apply defaults for fields the LLM did not provide
              for (const [fieldName, defVal] of Object.entries(defaults)) {
                const isSystemField = systemFieldMap.has(fieldName);
                if (isSystemField) {
                  // Apply to top-level args with correct type
                  if (!(fieldName in a)) {
                    const fieldType = systemFieldMap.get(fieldName);
                    // MULTILOOKUPLIST system fields (e.g. component) require array
                    a[fieldName] =
                      fieldType === "MULTILOOKUPLIST" && !Array.isArray(defVal)
                        ? [defVal]
                        : defVal;
                  }
                } else {
                  // UDF field — apply to udfFields
                  if (!(fieldName in a.udfFields) && !(fieldName in a)) {
                    a.udfFields[fieldName] = defVal;
                  }
                }
              }

              // Normalize DATETIMEPICKER fields to project's configured date format
              const targetDateFormat =
                resolveProjectDateFormat(projectInfoForDate);
              const datetimePickers = extractDatetimePickerFieldNames(layout);
              normalizeDateFieldsInArgs(a, datetimePickers, targetDateFormat);

              // Auto-apply testCaseState default (first non-archived state)
              if (!a.testCaseState) {
                const stateOptions =
                  (layout.listOptions as Record<string, any[]>)
                    ?.testCaseState ?? [];
                const firstActive = stateOptions.find(
                  (s: any) => !s.isArchived,
                );
                if (firstActive) a.testCaseState = firstActive.id;
              }

              // Identify mandatory UDF fields still missing (no value, no default)
              const missingMandatory: Array<{
                name: string;
                label: string;
                fieldType: string;
              }> = [];
              for (const field of layout.fields ?? []) {
                if (field.isMandatory) {
                  const inUdfFields = field.name in a.udfFields;
                  const inArgs = field.name in a;
                  const hasDefault = field.name in defaults;
                  if (!inUdfFields && !inArgs && !hasDefault) {
                    missingMandatory.push({
                      name: field.name,
                      label: field.label,
                      fieldType: field.fieldTypeName,
                    });
                  }
                }
              }

              if (missingMandatory.length > 0) {
                return {
                  content: [
                    {
                      success: false,
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: false,
                          code: "PREFLIGHT.MANDATORY_UDF_MISSING",
                          message: `Cannot create test case. The following mandatory UDF fields have no value and no configured default: ${missingMandatory.map((f) => `${f.label} (${f.fieldType})`).join(", ")}. Ask the user to provide values for these fields, then retry.`,
                          missingFields: missingMandatory,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                };
              }

              // Auto-apply stepDefaultValues to each step's UDF for fields not explicitly set
              const stepDefaults = layout.stepDefaultValues ?? {};
              if (
                Array.isArray(a.steps) &&
                Object.keys(stepDefaults).length > 0
              ) {
                for (const step of a.steps) {
                  if (!step.UDF) step.UDF = {};
                  for (const [fieldName, defVal] of Object.entries(
                    stepDefaults,
                  )) {
                    if (!(fieldName in step.UDF)) {
                      step.UDF[fieldName] = defVal;
                    }
                  }
                }
              }
            } catch {
              // Preflight is best-effort — proceed without it if layout fetch fails
            }
          }

          // UDF preflight for CREATE_TEST_SUITE: mirrors TC logic — auto-apply defaultValues,
          // auto-set testSuiteState, surface missing mandatory UDF fields, normalize dates.
          if (tool.handler === QMetryToolsHandlers.CREATE_TEST_SUITE) {
            try {
              const projectInfoForDate = await getProjectInfo(
                this.getToken(),
                baseUrl,
                projectKey,
              );
              const { scopeId: freshScopeId, orgCode: freshOrgCode } =
                extractProjectContext(projectInfoForDate);
              const layout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                projectKey,
                {
                  entityType: "TS",
                  pageName: "ADD",
                  ...(freshScopeId !== undefined
                    ? { scopeId: freshScopeId }
                    : {}),
                  ...(freshOrgCode !== undefined
                    ? { orgCode: freshOrgCode }
                    : {}),
                },
              );

              const defaults = layout.defaultValues ?? {};
              if (!a.udfFields) a.udfFields = {};

              const systemFieldMapTS = new Map(
                (layout.systemFields ?? []).map((f: any) => [
                  f.name,
                  f.fieldTypeName,
                ]),
              );

              for (const [fieldName, defVal] of Object.entries(defaults)) {
                const isSystemField = systemFieldMapTS.has(fieldName);
                if (isSystemField) {
                  if (!(fieldName in a)) {
                    const fieldType = systemFieldMapTS.get(fieldName);
                    a[fieldName] =
                      fieldType === "MULTILOOKUPLIST" && !Array.isArray(defVal)
                        ? [defVal]
                        : defVal;
                  }
                } else {
                  if (!(fieldName in a.udfFields) && !(fieldName in a)) {
                    a.udfFields[fieldName] = defVal;
                  }
                }
              }

              // Normalize DATETIMEPICKER fields to project's configured date format
              const targetDateFormat =
                resolveProjectDateFormat(projectInfoForDate);
              const datetimePickers = extractDatetimePickerFieldNames(layout);
              normalizeDateFieldsInArgs(a, datetimePickers, targetDateFormat);

              // Auto-apply testSuiteState default (first non-archived state)
              if (!a.testSuiteState) {
                const stateOptions =
                  (layout.listOptions as Record<string, any[]>)
                    ?.testSuiteState ?? [];
                const firstActive = stateOptions.find(
                  (s: any) => !s.isArchived,
                );
                if (firstActive) a.testSuiteState = firstActive.id;
              }

              // Surface mandatory UDF fields that have no value and no configured default
              const missingMandatory: Array<{
                name: string;
                label: string;
                fieldType: string;
              }> = [];
              for (const field of layout.fields ?? []) {
                if (field.isMandatory) {
                  const inUdfFields = field.name in a.udfFields;
                  const inArgs = field.name in a;
                  const hasDefault = field.name in defaults;
                  if (!inUdfFields && !inArgs && !hasDefault) {
                    missingMandatory.push({
                      name: field.name,
                      label: field.label,
                      fieldType: field.fieldTypeName,
                    });
                  }
                }
              }

              // Surface mandatory system fields that have no value
              const TS_SYSTEM_FIELD_TO_ARG: Record<string, string> = {
                name: "name",
                associatedReleasesCycles: "releaseCycleMapping",
                testsuiteOwner: "testsuiteOwner",
                testSuiteState: "testSuiteState",
                description: "description",
              };
              for (const sysField of layout.systemFields ?? []) {
                if (!sysField.isMandatory) continue;
                // 'name' is required by the tool schema — always present
                if (sysField.name === "name") continue;
                // 'testSuiteState' is auto-applied from stateOptions above
                if (sysField.name === "testSuiteState" && a.testSuiteState)
                  continue;
                const argKey =
                  TS_SYSTEM_FIELD_TO_ARG[sysField.name] ?? sysField.name;
                const val = (a as any)[argKey];
                const hasVal = Array.isArray(val)
                  ? val.length > 0
                  : val != null && val !== "";
                if (!hasVal) {
                  missingMandatory.push({
                    name: sysField.name,
                    label: sysField.label,
                    fieldType: sysField.fieldTypeName,
                  });
                }
              }

              if (missingMandatory.length > 0) {
                return {
                  content: [
                    {
                      success: false,
                      type: "text",
                      text: JSON.stringify(
                        {
                          success: false,
                          code: "PREFLIGHT.MANDATORY_FIELDS_MISSING",
                          message: `Cannot create test suite. The following mandatory fields have no value and no configured default: ${missingMandatory.map((f) => `${f.label} (${f.fieldType})`).join(", ")}. Ask the user to provide values for these fields, then retry.`,
                          missingFields: missingMandatory,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                };
              }
            } catch {
              // Preflight is best-effort — proceed without it if layout fetch fails
            }
          }

          // Date normalization preflight for all other UDF-enabled create/update handlers.
          // Fetches project date format config + UDF layout to normalize DATETIMEPICKER fields
          // regardless of what format the user or LLM supplied.
          // Note: CREATE_TEST_SUITE is excluded — its full preflight above already handles dates.
          const UDF_DATE_PREFLIGHT_ENTITY_MAP: Partial<
            Record<string, "TC" | "TS" | "IS" | "RQ">
          > = {
            [QMetryToolsHandlers.UPDATE_TEST_CASE]: "TC",
            [QMetryToolsHandlers.UPDATE_TEST_SUITE]: "TS",
            [QMetryToolsHandlers.CREATE_ISSUE]: "IS",
            [QMetryToolsHandlers.UPDATE_ISSUE]: "IS",
            [QMetryToolsHandlers.CREATE_REQUIREMENT]: "RQ",
            [QMetryToolsHandlers.UPDATE_REQUIREMENT]: "RQ",
          };
          const entityTypeForDate = UDF_DATE_PREFLIGHT_ENTITY_MAP[tool.handler];
          if (entityTypeForDate) {
            try {
              const dateProjectInfo = await getProjectInfo(
                this.getToken(),
                baseUrl,
                projectKey,
              );
              const { scopeId: freshScopeId, orgCode: freshOrgCode } =
                extractProjectContext(dateProjectInfo);
              const dateLayout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                projectKey,
                {
                  entityType: entityTypeForDate,
                  pageName: "ADD",
                  ...(freshScopeId !== undefined
                    ? { scopeId: freshScopeId }
                    : {}),
                  ...(freshOrgCode !== undefined
                    ? { orgCode: freshOrgCode }
                    : {}),
                },
              );
              const targetDateFormat =
                resolveProjectDateFormat(dateProjectInfo);
              const datetimePickers =
                extractDatetimePickerFieldNames(dateLayout);
              normalizeDateFieldsInArgs(a, datetimePickers, targetDateFormat);
            } catch {
              // Best-effort — proceed without normalization if preflight fails
            }
          }

          // Extract projectKey and baseUrl from arguments to prevent them from being sent in request body
          const { projectKey: _, baseUrl: __, ...cleanArgs } = a;

          // Inject persisted numeric project context only for handlers that explicitly support
          // scope/orgcode headers and strip them from the request body before forwarding.
          // Injecting into all handlers would silently add these fields to API request bodies.
          const SCOPE_AWARE_HANDLERS = new Set([
            QMetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN,
            QMetryToolsHandlers.BULK_UPDATE_TEST_RUN_UDFS,
            QMetryToolsHandlers.FETCH_TEST_RUN_UDF_METADATA,
            QMetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES,
            QMetryToolsHandlers.FETCH_CASCADE_CHILD_VALUES,
            QMetryToolsHandlers.FETCH_ISSUE_DETAILS,
            QMetryToolsHandlers.FETCH_UDF_LAYOUT,
          ]);
          const isScopeAware = SCOPE_AWARE_HANDLERS.has(tool.handler);
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
          if (tool.handler === QMetryToolsHandlers.SET_PROJECT_INFO) {
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
