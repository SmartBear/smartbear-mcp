import { ToolError } from "../../common/tools";
import { QMETRY_DEFAULTS } from "../config/constants";
import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type CreateCyclePayload,
  type CreateReleasePayload,
  DEFAULT_CREATE_CYCLE_PAYLOAD,
  DEFAULT_CREATE_RELEASE_PAYLOAD,
  DEFAULT_FETCH_BUILD_PAYLOAD,
  DEFAULT_FETCH_PLATFORMS_PAYLOAD,
  DEFAULT_FETCH_PROJECTS_PAYLOAD,
  type FetchBuildsPayload,
  type FetchPlatformsPayload,
  type FetchProjectsPayload,
  type UpdateCyclePayload,
  type UpdateReleasePayload,
} from "../types/project";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

const PROJECT_LIST_FIELDS_TO_OMIT = new Set([
  "userDefault",
  "isRichText",
  "isAutoAddValue",
  "isSyncTCMailSend",
  "isPartLevelComplianceEnabled",
  "isBuildSelectionMandatory",
  "isDeriveTCRStatusFromTCSRStatus",
  "isDefineTestCaseDependency",
  "isAutoSyncNewTcVersionEnabled",
  "isTCSRPartLevelComplianceDisabled",
]);

// Fields returned by GET_INFO/SEt_INFO that we don't want to expose to LLM.
const PROJECT_FIELDS_TO_OMIT = new Set([
  "clientData",
  "disabledRoleRights",
  "automationFrameworks",
  "currentUserRoleRights",
  "userRoleRights",
  "licenseDetail",
  "bddRepos",
  "atgTCFields",
  "allowEditRecordData",
  "allowEditPublicView",
  "logiServerUrl",
  "dynamicWebhookEnabled",
  "isLocked",
  "isBuildLOcked",
  "isReleaseLocked",
  "isProjectLocked",
  "cicdRequestTimeoutInSeconds",
  "thumbnailCreated",
  "qisearchBearerToken",
  "openAISecretKey",
  "openAISalt",
  "qmetrySamlUrl",
  "qmetrySAMLContext",
  "BDD_MQ_NAME",
  "riskBasedAnalysisEnabled",
  "riskBasedAtRQLevel",
  "riskBasedAtTCLevel",
  "isDropMandatory",
  "isPlatformScopeFeatureEnabled",
  "isSyncAcrossDomainEnabled",
  "isTestDataEnabled",
  "isTestCaseApprover",
  "isTestSuiteApprover",
  "isTestSuiteCloser",
  "isRequirementReviewer",
  "isPartLevelComplianceEnabled",
  "isAutoApproveTestRunEnabled",
  "isDeriveTCRStatusFromTCSRStatus",
  "isDefineTestCaseDependency",
  "isAutoSyncNewTcVersionEnabled",
  "isBddConfigured",
  "isMFAMandatory",
  "part11ComplianceAuthType",
  "userPreferredAutoActivatePrediction",
  "isQIEnabled",
  "isReflectEnabled",
  "isAskMeAnythingEnabledAI",
  "isDocLinkConfigForProjectAI",
  "isNetSearchConfigForProjectAI",
  "isAutoGenerateTcTcStepsAI",
  "isGenerateNewTcInExistingTcAI",
  "isEditTcStepsInExistingTcAI",
  "isGenerateNewTcForStoryAI",
  "isFlakyScoreEnabled",
  "isSuccessRateEnabled",
  "isQueryAssistanceEnabledClient",
  "isQueryAssistanceEnabledUser",
  "isDocSearchEnabled",
  "isTestingTypeVisible",
  "isMatrixViewEnabled",
  "isTCSRPartLevelComplianceDisabled",
  "isProjectLogoCustomization",
  "alEvents",
  "alModules",
  "isScimEnabled",
  "atgJiraFields",
  "nomenclature",
  "nomenclatureInfo",
  "refreshContent",
  "packages",
]);

/** A project in short form: what the model needs to identify it. */
export interface ProjectSummary {
  id: number | string;
  key: string;
  name?: string;
}

/** The project a tool call actually ran against, echoed back to the model. */
export interface ResolvedProject {
  key?: string;
  id?: number | string;
  name?: string;
  /** `explicit`: the caller passed projectKey. `qmetry-selected`: QMetry's selected project. */
  source: "explicit" | "qmetry-selected";
}

// The field names inside getinfo's `projects` entries have not been confirmed
// against a real response, so accept the spellings QMetry uses elsewhere.
function pickField(entry: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    const value = entry[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Normalizes one `projects` entry to `{id, key, name}`, or undefined if it has no id or key. */
function toProjectSummary(entry: unknown): ProjectSummary | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const e = entry as Record<string, unknown>;
  const id = pickField(e, ["projectID", "projectId", "id"]);
  const key = pickField(e, ["projectKey", "key"]);
  const name = pickField(e, ["name", "projectName"]);
  if (
    (typeof id !== "number" && typeof id !== "string") ||
    typeof key !== "string"
  ) {
    return undefined;
  }
  return { id, key, ...(typeof name === "string" ? { name } : {}) };
}

/**
 * Retrieves project information from QMetry (`/rest/admin/project/getinfo`).
 *
 * With project `"default"` QMetry answers for the project currently selected
 * in the QMetry UI by the API key's user; with a key, for that project. The
 * resolved project is reported in `currentProjectId` and `currentProjectName`.
 * The call does not change the selected project.
 *
 * The `projects` array (details of every project the user can access) is
 * trimmed to `{id, key, name}` entries: enough to look up the key of the
 * resolved project or of a project the user named, without the full details.
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL (defaults to configured URL)
 * @param project - Project key, or "default" for the project selected in QMetry
 * @returns Promise resolving to project information including viewIds, folders, and configuration
 */
export async function getProjectInfo(
  token: string,
  baseUrl: string,
  project?: string,
) {
  const result = await qmetryRequest<Record<string, unknown>>({
    method: "GET",
    path: QMETRY_PATHS.PROJECT.GET_INFO,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
  });

  const info: Record<string, unknown> = Object.fromEntries(
    Object.entries(result).filter(([key]) => !PROJECT_FIELDS_TO_OMIT.has(key)),
  );
  if (Array.isArray(info.projects)) {
    info.projects = info.projects
      .map(toProjectSummary)
      .filter((p): p is ProjectSummary => p !== undefined);
  }
  return info;
}

/**
 * Works out which project a getinfo response is for. The key comes from the
 * `projects` entry whose id matches `currentProjectId`; if there is no such
 * entry, an explicitly requested key is used, otherwise the key is left out.
 */
export function resolveProjectFromInfo(
  info: Record<string, unknown>,
  requestedKey: string | undefined,
): ResolvedProject {
  const explicit =
    !!requestedKey && requestedKey !== QMETRY_DEFAULTS.PROJECT_KEY;
  const id = info.currentProjectId as number | string | undefined;
  const name =
    typeof info.currentProjectName === "string"
      ? info.currentProjectName
      : undefined;
  const entry = Array.isArray(info.projects)
    ? (info.projects as unknown[])
        .map(toProjectSummary)
        .find(
          (p) =>
            p !== undefined && id !== undefined && String(p.id) === String(id),
        )
    : undefined;
  const key = entry?.key ?? (explicit ? requestedKey : undefined);
  return {
    ...(key ? { key } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(name ? { name } : {}),
    source: explicit ? "explicit" : "qmetry-selected",
  };
}

/** Edit distance, used to rank "did you mean" project suggestions. */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return row[b.length];
}

const MAX_PROJECT_SUGGESTIONS = 3;
const PROJECT_LIST_PAGE_SIZE = 100;
const PROJECT_LIST_MAX_PAGES = 5;

/**
 * Ranks the projects whose key or name is closest to `wanted`: exact
 * case-insensitive key or name first, then prefix matches, then by edit
 * distance on the key. Projects that are clearly unrelated are dropped.
 */
export function rankProjectSuggestions(
  wanted: string,
  projects: ProjectSummary[],
): ProjectSummary[] {
  const w = wanted.trim().toLowerCase();
  if (!w) return [];
  const scored = projects.map((p) => {
    const key = p.key.toLowerCase();
    const name = (p.name ?? "").toLowerCase();
    let score: number;
    if (key === w || name === w) score = 0;
    else if (key.startsWith(w) || w.startsWith(key) || name.startsWith(w))
      score = 1;
    else score = 2 + editDistance(w, key);
    return { p, score };
  });
  const limit = 2 + Math.max(1, Math.floor(w.length / 2));
  return scored
    .filter((s) => s.score <= limit)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_PROJECT_SUGGESTIONS)
    .map((s) => s.p);
}

/**
 * Best-effort lookup of the projects closest to an invalid project key, for a
 * "did you mean" hint. Reads the active (non-archived) project list; returns
 * an empty list if that lookup fails.
 */
export async function suggestProjects(
  token: string,
  baseUrl: string,
  wanted: string,
): Promise<ProjectSummary[]> {
  try {
    const projects: ProjectSummary[] = [];
    let seen = 0;
    for (let page = 1; page <= PROJECT_LIST_MAX_PAGES; page++) {
      const result = (await getProjects(token, baseUrl, undefined, {
        params: { showArchive: false },
        start: (page - 1) * PROJECT_LIST_PAGE_SIZE,
        page,
        limit: PROJECT_LIST_PAGE_SIZE,
        filter: "[]",
      })) as { data?: unknown[]; total?: number } | undefined;
      const data = Array.isArray(result?.data) ? result.data : [];
      seen += data.length;
      for (const item of data) {
        const summary = toProjectSummary(item);
        if (summary) projects.push(summary);
      }
      const total = result?.total;
      if (
        data.length < PROJECT_LIST_PAGE_SIZE ||
        (typeof total === "number" && seen >= total)
      ) {
        break;
      }
    }
    return rankProjectSuggestions(wanted, projects);
  } catch {
    return [];
  }
}

/**
 * Fetches a List of projects.
 */
export async function getProjects(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchProjectsPayload,
) {
  const body: FetchProjectsPayload = {
    ...DEFAULT_FETCH_PROJECTS_PAYLOAD,
    ...payload,
  };

  const result = await qmetryRequest<{
    data: Record<string, unknown>[];
    total: number;
  }>({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_PROJECTS,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });

  if (result && Array.isArray(result.data)) {
    return {
      ...result,
      data: result.data.map((item) =>
        Object.fromEntries(
          Object.entries(item).filter(
            ([key]) => !PROJECT_LIST_FIELDS_TO_OMIT.has(key),
          ),
        ),
      ),
    };
  }

  return result;
}

/** UI-only fields of the scope tree that carry no information for the caller. */
const SCOPE_TREE_FIELDS_TO_OMIT = new Set(["iconCls", "expanded", "leaf"]);

/** Recursively removes UI-only fields from a scope tree node and its children. */
function stripScopeTreeNode(node: unknown): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (SCOPE_TREE_FIELDS_TO_OMIT.has(key)) continue;
    out[key] =
      key === "children" && Array.isArray(value)
        ? value.map(stripScopeTreeNode)
        : value;
  }
  return out;
}

/**
 * Fetches the release/cycle scope tree (`/rest/admin/scope/tree`).
 *
 * The API returns the tree for every project the user can access. To save
 * tokens, unless `allProjects` is true the result is trimmed to the current
 * project: the one given by `projectID`, or else the `currentProjectId` that
 * getinfo reports for `project`. If that project can't be determined or isn't
 * in the tree, the full tree is returned. UI-only fields (iconCls, expanded,
 * leaf, and the root's `text`) are always dropped.
 */
export async function getReleasesCycles(
  token: string,
  baseUrl: string,
  project?: string,
  payload: {
    showArchive?: boolean;
    projectID?: number;
    allProjects?: boolean;
  } = {},
) {
  const body: { showArchive: boolean } = {
    showArchive: payload.showArchive ?? false,
  };

  const filterToProject = payload.allProjects !== true;
  const explicitId =
    typeof payload.projectID === "number" && Number.isFinite(payload.projectID)
      ? payload.projectID
      : undefined;

  const [tree, resolvedId] = await Promise.all([
    qmetryRequest<{ children?: unknown[] } & Record<string, unknown>>({
      method: "POST",
      path: QMETRY_PATHS.PROJECT.GET_RELEASES_CYCLES,
      token,
      baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
      project: project || QMETRY_DEFAULTS.PROJECT_KEY,
      body,
    }),
    filterToProject && explicitId === undefined
      ? getProjectInfo(token, baseUrl, project)
          .then((info) => info.currentProjectId as number | string | undefined)
          .catch(() => undefined)
      : Promise.resolve(explicitId),
  ]);

  if (!tree || typeof tree !== "object" || !Array.isArray(tree.children)) {
    return tree;
  }

  const { text: _text, ...rest } = tree;
  const projects = tree.children.map(stripScopeTreeNode);

  if (filterToProject && resolvedId !== undefined && resolvedId !== null) {
    const match = projects.filter(
      (p) =>
        !!p &&
        typeof p === "object" &&
        String((p as Record<string, unknown>).projID) === String(resolvedId),
    );
    if (match.length > 0) {
      return { ...rest, children: match };
    }
  }

  return { ...rest, children: projects };
}

/**
 * Fetches a List of Builds of the current project.
 */
export async function getBuilds(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchBuildsPayload,
) {
  const body: FetchBuildsPayload = {
    ...DEFAULT_FETCH_BUILD_PAYLOAD,
    ...payload,
  };

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_BUILD,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}

/**
 * Fetches platforms from the current QMetry project
 *
 */
export async function getPlatforms(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchPlatformsPayload,
) {
  const body: FetchPlatformsPayload = {
    ...DEFAULT_FETCH_PLATFORMS_PAYLOAD,
    ...payload,
  };

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_PLATFORMS,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}

/**
 * Fetches the hourly and daily Open API call quota status for the account.
 * Calls to this endpoint do not count toward the quota.
 */
export async function getApiQuotaStatus(
  token: string,
  baseUrl: string,
  project: string | undefined,
  _payload: Record<string, unknown> = {},
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  return qmetryRequest({
    method: "GET",
    path: QMETRY_PATHS.PROJECT.GET_API_QUOTA_STATUS,
    token,
    baseUrl: resolvedBaseUrl,
    project: resolvedProject,
    // The quota endpoint expects the literal "default" scope, not a numeric project scope.
    extraHeaders: {
      scope: "default",
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a new release in QMetry with optional cycle
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL
 * @param project - Project key
 * @param payload - Release and cycle data
 * @returns Promise resolving to the created release information
 */
export async function createRelease(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateReleasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateReleasePayload = {
    ...DEFAULT_CREATE_RELEASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.release.name !== "string") {
    throw new ToolError(
      "[createRelease] Missing or invalid required parameter: 'release.name'.",
    );
  }
  if (body.cycle && typeof body.cycle.name !== "string") {
    throw new ToolError(
      "[createRelease] Missing or invalid required parameter: 'cycle.name'.",
    );
  }

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.CREATE_RELEASE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Creates a new cycle within an existing release in QMetry
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL
 * @param project - Project key
 * @param payload - Cycle data including releaseID
 * @returns Promise resolving to the created cycle information
 */
export async function createCycle(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateCyclePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateCyclePayload = {
    ...DEFAULT_CREATE_CYCLE_PAYLOAD.cycle,
    ...payload,
  };

  if (typeof body.cycle.name !== "string") {
    throw new ToolError(
      "[createCycle] Missing or invalid required parameter: 'cycle.name'.",
    );
  }
  if (typeof body.cycle.releaseID !== "number") {
    throw new ToolError(
      "[createCycle] Missing or invalid required parameter: 'cycle.releaseID'.",
    );
  }

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.CREATE_CYCLE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

const UPDATE_CYCLE_FIELDS = ["name", "startDate", "targetDate"] as const;

/**
 * Updates an existing cycle in QMetry
 * @param token - QMetry API token
 * @param baseUrl - QMetry base URL
 * @param project - Project key
 * @param payload - Cycle data including buildID and releaseID for identification
 * @returns Promise resolving to the updated cycle information
 */
export async function updateCycle(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateCyclePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const cycle = payload?.cycle;
  if (!cycle || typeof cycle !== "object") {
    throw new ToolError(
      "[updateCycle] Missing or invalid required parameter: 'cycle'.",
    );
  }
  if (typeof cycle.buildID !== "number") {
    throw new ToolError(
      "[updateCycle] Missing or invalid required parameter: 'cycle.buildID'.",
    );
  }
  if (typeof cycle.releaseID !== "number") {
    throw new ToolError(
      "[updateCycle] Missing or invalid required parameter: 'cycle.releaseID'.",
    );
  }
  if (!UPDATE_CYCLE_FIELDS.some((f) => cycle[f] !== undefined)) {
    throw new ToolError(
      "[updateCycle] At least one of 'cycle.name', 'cycle.startDate' or 'cycle.targetDate' must be provided.",
    );
  }
  if (cycle.name !== undefined && cycle.name.trim() === "") {
    throw new ToolError(
      "[updateCycle] Invalid parameter: 'cycle.name' must not be empty.",
    );
  }

  return qmetryRequest({
    method: "PUT",
    path: QMETRY_PATHS.PROJECT.UPDATE_CYCLE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: payload,
  });
}

const UPDATE_RELEASE_FIELDS = [
  "name",
  "description",
  "startDate",
  "targetDate",
] as const;

/**
 * Updates an existing release in QMetry
 * @param token - QMetry API token
 * @param baseUrl - QMetry base URL
 * @param project - Project key
 * @param payload - Release data including projectID and releaseID for identification
 * @returns Promise resolving to the updated release information
 */
export async function updateRelease(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateReleasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const release = payload?.release;
  if (!release || typeof release !== "object") {
    throw new ToolError(
      "[updateRelease] Missing or invalid required parameter: 'release'.",
    );
  }
  if (typeof release.projectID !== "number") {
    throw new ToolError(
      "[updateRelease] Missing or invalid required parameter: 'release.projectID'.",
    );
  }
  if (typeof release.releaseID !== "number") {
    throw new ToolError(
      "[updateRelease] Missing or invalid required parameter: 'release.releaseID'.",
    );
  }
  if (!UPDATE_RELEASE_FIELDS.some((f) => release[f] !== undefined)) {
    throw new ToolError(
      "[updateRelease] At least one of 'release.name', 'release.description', 'release.startDate' or 'release.targetDate' must be provided.",
    );
  }
  if (release.name !== undefined && release.name.trim() === "") {
    throw new ToolError(
      "[updateRelease] Invalid parameter: 'release.name' must not be empty.",
    );
  }

  return qmetryRequest({
    method: "PUT",
    path: QMETRY_PATHS.PROJECT.UPDATE_RELEASE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: payload,
  });
}
