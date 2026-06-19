import { UDF_FIELD_TYPES } from "../config/constants";
import { QMETRY_PATHS } from "../config/rest-endpoints";
import type {
  BulkUpdateTestRunUdfsPayload,
  CreateUdfPayload,
  FetchCustomListItemsPayload,
  FetchCustomListsPayload,
  FetchUdfFieldTypesPayload,
} from "../types/udf";
import { qmetryRequest } from "./api/client-api";
import { extractProjectContext } from "./auto-resolve";
import { getProjectInfo } from "./project";
import { resolveDefaults } from "./utils";

const LOOKUP_FIELD_TYPE_IDS = new Set([3, 4, 7]);

/**
 * Creates a User Defined Field (UDF/custom field) in QMetry.
 * Auto-resolves numeric projectID from scopeId context or by fetching project info.
 * @throws If name contains invalid characters, required fields are missing,
 *         or lookuplistId is missing for list-based field types.
 */
export async function createUdf(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateUdfPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const nameRegex = /^[a-zA-Z0-9_]+$/;
  if (!nameRegex.test(payload.name)) {
    throw new Error(
      "[createUdf] Field name can only contain alphanumeric characters and underscore.",
    );
  }

  if (typeof payload.fieldTypeID !== "number") {
    throw new Error(
      "[createUdf] Missing or invalid required parameter: 'fieldTypeID'.",
    );
  }
  if (!payload.label) {
    throw new Error(
      "[createUdf] Missing or invalid required parameter: 'label'.",
    );
  }
  if (!Array.isArray(payload.modules) || payload.modules.length === 0) {
    throw new Error(
      "[createUdf] Missing or invalid required parameter: 'modules' (must be a non-empty array of module IDs).",
    );
  }

  if (LOOKUP_FIELD_TYPE_IDS.has(payload.fieldTypeID) && !payload.lookuplistId) {
    throw new Error(
      `[createUdf] 'lookuplistId' is required for fieldTypeID ${payload.fieldTypeID} ` +
        "(LOOKUPLIST / MULTILOOKUPLIST / CASCADINGLIST). " +
        "Use the 'Fetch Custom Lists' tool to retrieve available list IDs.",
    );
  }

  // Resolve numeric projectID — prefer injected scopeId, else fetch project info
  let projectID = payload.scopeId;
  let orgCode = payload.orgCode;
  let projectName = resolvedProject;

  if (!projectID) {
    const projectInfo = (await getProjectInfo(
      token,
      resolvedBaseUrl,
      resolvedProject,
    )) as any;
    const ctx = extractProjectContext(projectInfo);
    projectID = ctx.scopeId;
    if (!orgCode) orgCode = ctx.orgCode;
    if (projectInfo?.projectName) projectName = projectInfo.projectName;
  }

  if (!projectID) {
    throw new Error(
      "[createUdf] Unable to resolve numeric project ID. " +
        "Use the 'Set Project Info' tool first to establish project context, " +
        "or verify the project key is correct.",
    );
  }

  const modules = payload.modules.map((moduleID) => ({
    moduleID,
    mandatory: payload.mandatory ?? false,
  }));

  const dataEntry: Record<string, any> = {
    projectID,
    projectName,
    modules,
    moduleModel: [],
  };

  if (payload.listValues !== undefined) {
    dataEntry.listValues = payload.listValues;
  }
  if (payload.defaultValue !== undefined) {
    dataEntry.defaultValue = payload.defaultValue;
  }
  if (payload.defaultChildValue !== undefined) {
    dataEntry.defaultChildValue = payload.defaultChildValue;
  }

  const body: Record<string, any> = {
    fieldTypeID: payload.fieldTypeID,
    name: payload.name,
    label: payload.label,
    data: [dataEntry],
  };

  // STRING fields require fieldLength; default to 10 if not provided
  if (payload.fieldTypeID === 6) {
    body.fieldLength = payload.fieldLength ?? 10;
  } else if (payload.fieldLength !== undefined) {
    body.fieldLength = payload.fieldLength;
  }
  if (payload.lookuplistId !== undefined) {
    body.lookuplistId = payload.lookuplistId;
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.UDF.CREATE_UDF,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId: projectID,
    orgCode,
  });
}

/**
 * Fetches custom lists (lookup lists) available in the project.
 * Use this to get lookuplistId values needed when creating LOOKUPLIST,
 * MULTILOOKUPLIST, or CASCADINGLIST UDFs.
 */
export async function fetchCustomLists(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchCustomListsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: Record<string, any> = {
    start: payload.start ?? 0,
    limit: payload.limit ?? 50,
    page: payload.page ?? 1,
  };

  if (payload.listName) {
    body.filter = `[{"type":"string","value":"${payload.listName}","field":"Listname"}]`;
  } else if (payload.filter) {
    body.filter = payload.filter;
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.UDF.LIST_CUSTOM_LISTS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId: payload.scopeId,
    orgCode: payload.orgCode,
  });
}

/**
 * Fetches items within a specific custom list by its ID.
 * Returns item IDs and names needed for defaultValue/listValues when creating UDFs.
 */
export async function fetchCustomListItems(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchCustomListItemsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  // Resolve numeric projectID — prefer injected scopeId, else fetch project info
  let projectID = payload.scopeId;
  let orgCode = payload.orgCode;

  if (!projectID) {
    const projectInfo = (await getProjectInfo(
      token,
      resolvedBaseUrl,
      resolvedProject,
    )) as any;
    const ctx = extractProjectContext(projectInfo);
    projectID = ctx.scopeId;
    if (!orgCode) orgCode = ctx.orgCode;
  }

  const body: Record<string, any> = {
    qmMode: "EDIT",
    qmMasterId: payload.listId,
    params: { showArchive: true },
  };

  if (projectID) {
    body.projectID = projectID;
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.UDF.LIST_CUSTOM_LIST_ITEMS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId: projectID,
    orgCode,
  });
}

/**
 * Bulk updates UDF values for one or more Test Case Runs.
 * Runs asynchronously in QMetry background — check "Scheduled Task" for status.
 */
export async function bulkUpdateTestRunUdfs(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: BulkUpdateTestRunUdfsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (!Array.isArray(payload.tcRunIDs) || payload.tcRunIDs.length === 0) {
    throw new Error(
      "[bulkUpdateTestRunUdfs] Missing or invalid required parameter: 'tcRunIDs'. Must be a non-empty array of numeric Test Case Run IDs.",
    );
  }

  if (
    !payload.UDF ||
    typeof payload.UDF !== "object" ||
    Object.keys(payload.UDF).length === 0
  ) {
    throw new Error(
      "[bulkUpdateTestRunUdfs] Missing or invalid required parameter: 'UDF'. Must be an object with at least one UDF field entry.",
    );
  }

  // Apply default multiSelectAction for all UDF field entries
  const normalizedUDF: Record<string, any> = {};
  for (const [fieldName, fieldEntry] of Object.entries(payload.UDF)) {
    const entry: Record<string, any> = {
      fieldID: fieldEntry.fieldID,
      value: fieldEntry.value,
    };
    if (Array.isArray(fieldEntry.value)) {
      entry.multiSelectAction = fieldEntry.multiSelectAction ?? "append";
    }
    normalizedUDF[fieldName] = entry;
  }

  const body = {
    tcRunIDs: payload.tcRunIDs,
    UDF: normalizedUDF,
  };

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.UDF.BULK_UPDATE_TEST_RUN_UDFS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId: payload.scopeId,
    orgCode: payload.orgCode,
  });
}

/**
 * Returns available UDF field types.
 * Uses the built-in constant as the source of truth.
 * If the API returns new field types not present in the constant, merges them in.
 */
export async function fetchUdfFieldTypes(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchUdfFieldTypesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const constantTypes = [...UDF_FIELD_TYPES] as Array<{
    Id: number;
    Fieldtype: string;
    Description: string;
    Preview: string;
  }>;

  try {
    const apiTypes = await qmetryRequest<any[]>({
      method: "POST",
      path: QMETRY_PATHS.UDF.LIST_FIELD_TYPES,
      token,
      project: resolvedProject,
      baseUrl: resolvedBaseUrl,
      body: {},
      scopeId: payload.scopeId,
      orgCode: payload.orgCode,
    });

    if (Array.isArray(apiTypes)) {
      const existingIds = new Set(constantTypes.map((t) => t.Id));
      const newTypes = apiTypes.filter((t) => !existingIds.has(t.Id));
      if (newTypes.length > 0) {
        return [...constantTypes, ...newTypes];
      }
    }
  } catch {
    // Fall back to constant if API call fails
  }

  return constantTypes;
}
