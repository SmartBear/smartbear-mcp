import type {
  CallToolResult,
  ServerContext,
} from "@modelcontextprotocol/server";
import z from "zod";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { QMetryApiError } from "./client/api/error-handler";
import {
  autoResolveViewIdAndFolderPath,
  findAutoResolveConfig,
} from "./client/auto-resolve";
import {
  extractDatetimePickerFieldNames,
  normalizeDateFieldsInArgs,
  resolveProjectDateFormat,
} from "./client/date-utils";
import { QMETRY_HANDLER_MAP } from "./client/handlers";
import {
  getProjectInfo,
  type ResolvedProject,
  resolveProjectFromInfo,
  suggestProjects,
} from "./client/project";
import { TOOLS } from "./client/tools/index";
import { fetchUdfLayout } from "./client/udf";
import { QMETRY_DEFAULTS, QMetryToolsHandlers } from "./config/constants";

/**
 * Builds a single-text-block tool result. `isError: true` marks a failure the
 * model should act on (the common tool wrapper also records it as a failed
 * call); successful results omit the flag.
 */
function textResult(
  text: string,
  isError = false,
  project?: ResolvedProject,
): CallToolResult {
  return {
    content: [
      { type: "text", text },
      // Which project the call actually ran against, so the model (and the
      // user) can see where "default" went. Only present when the call fetched
      // project info anyway; no extra request is made for it.
      ...(project
        ? [{ type: "text" as const, text: JSON.stringify({ project }) }]
        : []),
    ],
    ...(isError ? { isError: true } : {}),
  };
}

const INVALID_PROJECT_CODE = "CO.INVALID_PROJECT_ID";

/**
 * Tools whose request body needs the numeric project ID inside a nested
 * object (`release.projectID`, `cycle.projectID`). If the caller omits it, it
 * is filled from the project the call resolves to.
 */
const PROJECT_ID_BODY_FIELD: Partial<Record<string, "release" | "cycle">> = {
  [QMetryToolsHandlers.CREATE_RELEASE]: "release",
  [QMetryToolsHandlers.CREATE_CYCLE]: "cycle",
};

/** Inputs worth echoing in an error: keys, IDs and folder/view selectors. */
const ERROR_CONTEXT_NAMED_INPUTS = new Set([
  "projectKey",
  "resolvedProjectKey",
  "entityKey",
  "viewId",
  "folderPath",
]);
const ERROR_CONTEXT_ID_INPUT = /(Id|ID|Ids|IDs)$/;
const SECRET_INPUT = /key|token|secret|password|auth/i;
const MAX_LISTED_VALUES = 10;
const MAX_VALUE_LENGTH = 100;

function formatInputValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    if (!value.every((v) => ["string", "number"].includes(typeof v))) {
      return undefined;
    }
    const shown = value.slice(0, MAX_LISTED_VALUES).join(", ");
    return `[${shown}${value.length > MAX_LISTED_VALUES ? ", …" : ""}]`;
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    return text.length > MAX_VALUE_LENGTH
      ? `${text.slice(0, MAX_VALUE_LENGTH)}…`
      : text;
  }
  return undefined;
}

/**
 * Picks the tool inputs that identify what a failed call was about (project
 * key, entity/folder/view IDs) so the model can see which value was wrong.
 * Anything that looks like a credential is never included.
 */
export function pickErrorContextInputs(
  args: Record<string, unknown>,
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const [name, value] of Object.entries(args)) {
    const relevant =
      ERROR_CONTEXT_NAMED_INPUTS.has(name) ||
      (ERROR_CONTEXT_ID_INPUT.test(name) && !SECRET_INPUT.test(name));
    if (!relevant) continue;
    const formatted = formatInputValue(value);
    if (formatted !== undefined) picked[name] = formatted;
  }
  return picked;
}

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

  // Only `configure` writes these. Tool calls must not store state here: on the
  // 2026-07-28 HTTP transport every request gets a fresh client instance, so
  // per-call context (such as the project) always comes from the call's args.
  private token: string | undefined;
  private endpoint: string = QMETRY_DEFAULTS.BASE_URL;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
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

    if (!this.token) throw new ToolError("Client not configured");
    return this.token;
  }

  getBaseUrl() {
    return this.endpoint;
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const resolveContext = (args: Record<string, any>) => ({
      baseUrl: this.endpoint,
      projectKey: args.projectKey ?? QMETRY_DEFAULTS.PROJECT_KEY,
    });

    for (const tool of TOOLS) {
      const handlerFn = QMETRY_HANDLER_MAP[tool.handler];
      if (!handlerFn) {
        console.error(`⚠️ No handler mapped for ${tool.title}`);
        continue;
      }

      const toolName = `${this.capabilityPrefix}_${tool.title.replace(/\s+/g, "_").toLowerCase()}`;

      // Errors are not caught here, except to add the tool name and inputs to
      // a failed QMetry call. The common tool wrapper turns a ToolError
      // (expected failures: bad input, QMetry API errors) into an `isError`
      // result, and reports anything else to BugSnag as a bug.
      register(
        tool,
        async (args, _ctx: ServerContext): Promise<CallToolResult> => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          // Per-call project context. These are locals of this call only and
          // are discarded when it returns: nothing is stored on the client, so
          // the server stays stateless and the next call resolves afresh.
          let projectInfo: Record<string, any> | undefined;
          let resolvedProject: ResolvedProject | undefined;
          // Fetches getinfo at most once per call. The first response also
          // tells us which project "default" resolved to.
          const loadProjectInfo = async (): Promise<Record<string, any>> => {
            if (!projectInfo) {
              projectInfo = (await getProjectInfo(
                this.getToken(),
                baseUrl,
                projectKey,
              )) as Record<string, any>;
              resolvedProject =
                resolveProjectFromInfo(projectInfo, projectKey) ?? undefined;
            }
            return projectInfo;
          };
          // Once getinfo has resolved the project, later requests in this call
          // use its key, so a project switch in the QMetry UI mid-call cannot
          // split one call across two projects.
          const effectiveKey = (): string => resolvedProject?.key || projectKey;

          const withToolContext = async (
            err: QMetryApiError,
            step?: string,
          ): Promise<QMetryApiError> => {
            const key = effectiveKey();
            let suggestion: string | undefined;
            if (err.code === INVALID_PROJECT_CODE) {
              const matches =
                (await suggestProjects(this.getToken(), baseUrl, key)) ?? [];
              if (matches.length > 0) {
                suggestion = matches
                  .map((p) => (p.name ? `${p.key} (${p.name})` : p.key))
                  .join(", ");
              }
            }
            return err.withContext({
              tool: toolName,
              inputs: pickErrorContextInputs({
                ...a,
                projectKey,
                ...(key !== projectKey ? { resolvedProjectKey: key } : {}),
              }),
              ...(step ? { step } : {}),
              ...(suggestion ? { suggestion } : {}),
            });
          };

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
              let autoResolveInfo: any;
              try {
                autoResolveInfo = await loadProjectInfo();
              } catch (err) {
                if (err instanceof QMetryApiError) {
                  throw await withToolContext(
                    err,
                    `auto-resolving viewId/folderPath/folderID for ${autoResolveConfig.moduleName}; pass them explicitly to skip this lookup`,
                  );
                }
                throw new ToolError(
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
                  autoResolveInfo,
                  autoResolveConfig,
                ),
              );
            }
          }

          // UDF preflight for CREATE_TEST_CASE:
          // Auto-apply defaultValues, auto-set testCaseState, surface missing mandatory UDF fields,
          // and normalize DATETIMEPICKER values to the project's configured date format.
          // This removes the requirement for the LLM to pre-call Fetch UDF Layout.
          if (tool.handler === QMetryToolsHandlers.CREATE_TEST_CASE) {
            try {
              const projectInfoForDate = await loadProjectInfo();
              const layout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                effectiveKey(),
                {
                  entityType: "TC",
                  pageName: "ADD",
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
                return textResult(
                  JSON.stringify(
                    {
                      success: false,
                      code: "PREFLIGHT.MANDATORY_UDF_MISSING",
                      message: `Cannot create test case. The following mandatory UDF fields have no value and no configured default: ${missingMandatory.map((f) => `${f.label} (${f.fieldType})`).join(", ")}. Ask the user to provide values for these fields, then retry.`,
                      missingFields: missingMandatory,
                    },
                    null,
                    2,
                  ),
                  true,
                  resolvedProject,
                );
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
              const projectInfoForDate = await loadProjectInfo();
              const layout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                effectiveKey(),
                {
                  entityType: "TS",
                  pageName: "ADD",
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
                return textResult(
                  JSON.stringify(
                    {
                      success: false,
                      code: "PREFLIGHT.MANDATORY_FIELDS_MISSING",
                      message: `Cannot create test suite. The following mandatory fields have no value and no configured default: ${missingMandatory.map((f) => `${f.label} (${f.fieldType})`).join(", ")}. Ask the user to provide values for these fields, then retry.`,
                      missingFields: missingMandatory,
                    },
                    null,
                    2,
                  ),
                  true,
                  resolvedProject,
                );
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
              const dateProjectInfo = await loadProjectInfo();
              const dateLayout = await fetchUdfLayout(
                this.getToken(),
                baseUrl,
                effectiveKey(),
                {
                  entityType: entityTypeForDate,
                  pageName: "ADD",
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

          // Create Release / Create Cycle need the numeric projectID in the
          // request body; the projectKey only travels as the `project` header.
          // When the caller left it out, fill it from the project this call
          // resolves to (getinfo's currentProjectId).
          const projectIdTarget = PROJECT_ID_BODY_FIELD[tool.handler];
          if (projectIdTarget) {
            const entity = a[projectIdTarget];
            if (
              entity &&
              typeof entity === "object" &&
              entity.projectID == null
            ) {
              let info: Record<string, any>;
              try {
                info = await loadProjectInfo();
              } catch (err) {
                if (err instanceof QMetryApiError) {
                  throw await withToolContext(
                    err,
                    `resolving the numeric projectID for ${projectIdTarget}.projectID; pass it explicitly to skip this lookup`,
                  );
                }
                throw err;
              }
              const id = Number(info.currentProjectId);
              if (!Number.isFinite(id)) {
                throw new ToolError(
                  `Could not resolve the numeric projectID for project '${projectKey}'. ` +
                    `Pass ${projectIdTarget}.projectID explicitly (currentProjectId from Fetch QMetry Project Info).`,
                );
              }
              entity.projectID = id;
            }
          }

          // Extract projectKey and baseUrl from arguments to prevent them from being sent in request body
          const { projectKey: _, baseUrl: __, ...cleanArgs } = a;

          let result: unknown;
          try {
            result = await handlerFn(
              this.getToken(),
              baseUrl,
              effectiveKey(),
              cleanArgs,
            );
          } catch (err) {
            if (err instanceof QMetryApiError) throw await withToolContext(err);
            throw err;
          }

          // Use custom formatter if available, otherwise return JSON
          const formatted = tool.formatResponse
            ? tool.formatResponse(result)
            : (result ?? {});

          // A domain client that returns `{ success: false, ... }` (e.g. the
          // mandatory Test Run UDF gate) did not do what was asked: flag it.
          const reportedFailure =
            typeof result === "object" &&
            result !== null &&
            (result as { success?: unknown }).success === false;

          return textResult(
            typeof formatted === "string"
              ? formatted
              : JSON.stringify(formatted, null, 2),
            reportedFailure,
            resolvedProject,
          );
        },
      );
    }
  }
}
