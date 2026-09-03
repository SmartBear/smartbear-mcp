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
  "isApprovalWorkflowEnabled",
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

/**
 * Retrieves project information from QMetry
 *
 * This function serves dual purpose:
 * 1. SET_PROJECT_INFO - Sets/switches the current project context
 * 2. FETCH_PROJECT_INFO - Retrieves project details and configuration
 *
 * Both operations use the same API endpoint as QMetry handles project context
 * switching and information retrieval through the same GET request.
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL (defaults to configured URL)
 * @param project - Project key to retrieve info for (defaults to configured project)
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

  return Object.fromEntries(
    Object.entries(result).filter(([key]) => !PROJECT_FIELDS_TO_OMIT.has(key)),
  );
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

export async function getReleasesCycles(
  token: string,
  baseUrl: string,
  project?: string,
  payload: { showArchive?: boolean } = {},
) {
  let showArchiveValue: boolean;

  if (payload.showArchive !== undefined) {
    showArchiveValue = payload.showArchive;
  } else {
    showArchiveValue = false;
  }

  const body: { showArchive: boolean } = {
    showArchive: showArchiveValue,
  };

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_RELEASES_CYCLES,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
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
    throw new Error(
      "[createRelease] Missing or invalid required parameter: 'release.name'.",
    );
  }
  if (body.cycle && typeof body.cycle.name !== "string") {
    throw new Error(
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
    throw new Error(
      "[createCycle] Missing or invalid required parameter: 'cycle.name'.",
    );
  }
  if (typeof body.cycle.releaseID !== "number") {
    throw new Error(
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

  if (typeof payload.cycle.buildID !== "number") {
    throw new Error(
      "[updateCycle] Missing or invalid required parameter: 'cycle.buildID'.",
    );
  }
  if (typeof payload.cycle.releaseID !== "number") {
    throw new Error(
      "[updateCycle] Missing or invalid required parameter: 'cycle.releaseID'.",
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
