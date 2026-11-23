import { ToolError } from "../../common/tools";
import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type CreateRequirementPayload,
  DEFAULT_CREATE_REQUIREMENT_PAYLOAD,
  DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD,
  DEFAULT_FETCH_REQUIREMENTS_LINKED_TO_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_REQUIREMENTS_PAYLOAD,
  DEFAULT_UPDATE_REQUIREMENT_PAYLOAD,
  type FetchRequirementDetailsPayload,
  type FetchRequirementsLinkedToTestCasePayload,
  type FetchRequirementsPayload,
  type LinkReleaseCycleWithRequirementPayload,
  type UpdateRequirementPayload,
} from "../types/requirements";
import { qmetryRequest } from "./api/client-api";
import { getProjectInfo } from "./project";
import { resolveDefaults } from "./utils";

// extTrackerType values used by QMetry's `integrationsystems` list.
const EXT_TRACKER_TYPE_JIRA = 1;
const EXT_TRACKER_TYPE_AZURE = 3;

/**
 * Hard gate shared by create/update: if the project has an external tracker
 * configured (isExtTrackerConfigured) that is either Jira (extTrackerType=1)
 * or Azure (extTrackerType=3), and the Requirement module is configured to
 * sync with it (isRQConfigured), requirements must be managed in that external
 * system, not QMetry.
 * @throws If the gate blocks the operation.
 */
async function assertRequirementNotExternallySynced(
  token: string,
  baseUrl: string,
  project: string | undefined,
  functionName: string,
  action: "created" | "updated",
) {
  const projectInfo = (await getProjectInfo(token, baseUrl, project)) as {
    isExtTrackerConfigured?: boolean;
    extTrackerType?: number;
    isRQConfigured?: boolean;
  };

  if (
    projectInfo.isExtTrackerConfigured === true &&
    projectInfo.isRQConfigured === true
  ) {
    const trackerType = projectInfo.extTrackerType;
    if (trackerType === EXT_TRACKER_TYPE_JIRA) {
      throw new ToolError(
        `[${functionName}] Blocked: This project is Jira-integrated and the Requirement module is ` +
          `configured to sync with Jira issue types. Requirements must be ${action} in Jira, not QMetry, ` +
          "for this project.",
      );
    }
    if (trackerType === EXT_TRACKER_TYPE_AZURE) {
      throw new ToolError(
        `[${functionName}] Blocked: This project is Azure-integrated and the Requirement module is ` +
          `configured to sync with Azure. Requirements must be ${action} in Azure, not QMetry, ` +
          "for this project.",
      );
    }
  }
}

/**
 * Create a requirement.
 * @throws If `name` is missing/invalid, or if the Jira-integration gate blocks creation.
 */
export async function createRequirement(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateRequirementPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { udfFields, ...restPayload } = payload as any;
  const body: CreateRequirementPayload = {
    ...DEFAULT_CREATE_REQUIREMENT_PAYLOAD,
    ...restPayload,
    ...(udfFields ?? {}),
  };

  if (typeof body.name !== "string" || body.name.trim() === "") {
    throw new ToolError(
      "[createRequirement] Missing or invalid required parameter: 'name'.",
    );
  }

  await assertRequirementNotExternallySynced(
    token,
    resolvedBaseUrl,
    resolvedProject,
    "createRequirement",
    "created",
  );

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.CREATE_UPDATE_RQ,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update a requirement.
 * @throws If `rqId` or `rqVersionId` are missing/invalid, or if the Jira-integration gate blocks the update.
 */
export async function updateRequirement(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateRequirementPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { udfFields, ...restPayload } = payload as any;
  const body: UpdateRequirementPayload = {
    ...DEFAULT_UPDATE_REQUIREMENT_PAYLOAD,
    ...restPayload,
    ...(udfFields ?? {}),
  };

  if (typeof body.rqId !== "number") {
    throw new ToolError(
      "[updateRequirement] Missing or invalid required parameter: 'rqId'.",
    );
  }
  if (typeof body.rqVersionId !== "number") {
    throw new ToolError(
      "[updateRequirement] Missing or invalid required parameter: 'rqVersionId'.",
    );
  }

  await assertRequirementNotExternallySynced(
    token,
    resolvedBaseUrl,
    resolvedProject,
    "updateRequirement",
    "updated",
  );

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.REQUIREMENT.CREATE_UPDATE_RQ,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a list of requirements.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchRequirements(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementsPayload = {
    ...DEFAULT_FETCH_REQUIREMENTS_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new ToolError(
      "[fetchRequirements] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new ToolError(
      "[fetchRequirements] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  const result = await qmetryRequest<Record<string, unknown>>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });

  const {
    filterTemplate: _filterTemplate,
    columns: _columns,
    ...rest
  } = result;
  return rest;
}

/**
 * Fetches requirement details by numeric ID.
 * @throws If `id` or `version` are missing/invalid.
 */
export async function fetchRequirementDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementDetailsPayload = {
    ...DEFAULT_FETCH_REQUIREMENT_DETAILS_PAYLOAD,
    ...payload,
  };

  if (typeof body.id !== "number") {
    throw new ToolError(
      "[fetchRequirementDetails] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.version !== "number") {
    throw new ToolError(
      "[fetchRequirementDetails] Missing or invalid required parameter: 'version'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_DETAILS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches requirements linked to a specific test case.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchRequirementsLinkedToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchRequirementsLinkedToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchRequirementsLinkedToTestCasePayload = {
    ...DEFAULT_FETCH_REQUIREMENTS_LINKED_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new ToolError(
      "[fetchRequirementsLinkedToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.GET_RQ_LINKED_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Links one release and one or more of its cycles to one existing requirement
 * version. QMetry treats a cycle as a build, so cycle errors come back as
 * CO.INVALID_BUILD_ID.
 * @throws If any required ID is missing/invalid or `cycleIds` is empty.
 */
export async function linkReleaseCycleWithRequirement(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkReleaseCycleWithRequirementPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const numericFields = [
    "sourceProjectId",
    "sourceReleaseId",
    "sourceBuildId",
    "releaseId",
    "rqId",
    "rqVersionId",
  ] as const;
  for (const field of numericFields) {
    const value = payload?.[field];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ToolError(
        `[linkReleaseCycleWithRequirement] Missing or invalid required parameter: '${field}'.`,
      );
    }
  }

  const cycleIds = payload.cycleIds;
  if (
    !Array.isArray(cycleIds) ||
    cycleIds.length === 0 ||
    cycleIds.some((id) => typeof id !== "number" || Number.isNaN(id))
  ) {
    throw new ToolError(
      "[linkReleaseCycleWithRequirement] Missing or invalid required parameter: 'cycleIds' (must be a non-empty array of numeric cycle IDs).",
    );
  }

  const body = {
    sourceBuildId: payload.sourceBuildId,
    sourceProjectId: payload.sourceProjectId,
    sourceReleaseId: payload.sourceReleaseId,
    sourceScope: "project",
    entityType: "RQ",
    releaseCycleMapping: [
      {
        release: payload.releaseId,
        cycle: cycleIds,
        version: 1,
      },
    ],
    opType: "otherScope",
    withVersion: true,
    updateFlag: false,
    destinationProjectId: payload.sourceProjectId,
    entityData: [
      {
        entityId: payload.rqId,
        version: payload.rqVersionId,
      },
    ],
  };

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.REQUIREMENT.LINK_RELEASE_CYCLE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
