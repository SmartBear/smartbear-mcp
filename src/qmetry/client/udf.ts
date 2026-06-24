import { UDF_FIELD_TYPES, UDF_MODULES } from "../config/constants";
import { QMETRY_PATHS } from "../config/rest-endpoints";
import type {
  BulkUpdateTestRunUdfsPayload,
  FetchCascadeChildValuesPayload,
  FetchTestRunUdfMetadataPayload,
  FetchTestRunUdfValuesPayload,
} from "../types/udf";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

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
 * Fetches the child values of a CASCADINGLIST UDF field for a given parent item ID.
 * Required headers: action: fetch-cascade-children, screenname: EXECUTION RUN.
 * Response is an object keyed by the parent item name, containing an array of child items.
 * Normalizes the response into a flat { parentName, children } shape for easy LLM consumption.
 */
export async function fetchCascadeChildValues(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchCascadeChildValuesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (typeof payload.id !== "number" || payload.id <= 0) {
    throw new Error(
      "[fetchCascadeChildValues] Missing or invalid required parameter: 'id'. " +
        "Must be a positive integer representing the parent cascade item ID.",
    );
  }

  const raw = await qmetryRequest<
    Record<
      string,
      Array<{
        id: number;
        name: string;
        uniqueLabel: string;
        isArchived: boolean;
      }>
    >
  >({
    method: "POST",
    path: QMETRY_PATHS.UDF.FETCH_CASCADE_CHILD_VALUES,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: {
      id: payload.id,
      isArchReq: payload.isArchReq ?? false,
    },
    scopeId: payload.scopeId,
    orgCode: payload.orgCode,
    extraHeaders: {
      action: "fetch-cascade-children",
      screenname: "EXECUTION RUN",
    },
  });

  // Response is keyed by the parent item name — normalize for easier consumption
  const entries = Object.entries(raw);
  if (entries.length === 0) {
    return {
      parentId: payload.id,
      parentName: null,
      children: [],
      _note: "No child values found for this parent cascade item.",
    };
  }

  const [parentName, children] = entries[0];
  return {
    parentId: payload.id,
    parentName,
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      uniqueLabel: c.uniqueLabel,
      isArchived: c.isArchived,
    })),
    _note:
      "Use 'id' from 'children' as the 'child' value in the CASCADINGLIST update: " +
      "{ parent: <parentId>, child: <children[].id> }",
  };
}

/**
 * Returns available UDF field types.
 * Uses the built-in constant as the source of truth.
 * If the API returns new field types not present in the constant, merges them in.
 */
export async function fetchUdfFieldTypes() {
  return [...UDF_FIELD_TYPES];
}

export async function fetchUdfModules() {
  return [...UDF_MODULES];
}

/**
 * Fetches Test Run UDF metadata for the current project.
 * Returns all available Test Run UDF field definitions (name, fieldID, type)
 * and lookup list options (for LOOKUPLIST, MULTILOOKUPLIST, CASCADINGLIST fields).
 * The `projectUserFieldID` in the response is the `fieldID` required by
 * the 'Bulk Update Test Run UDFs' tool.
 * Extra headers `action: fetch-steps` and `screenname: EXECUTION RUN` are
 * required by this endpoint.
 */
export async function fetchTestRunUdfMetadata(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestRunUdfMetadataPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const raw = await qmetryRequest<{
    qmUDF?: { TCR?: Record<string, any> };
    qmUDFList?: Record<string, any[]>;
    qmSDF?: Record<string, any>;
  }>({
    method: "POST",
    path: QMETRY_PATHS.UDF.TEST_RUN_UDF_METADATA,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: { entityType: "TCR" },
    scopeId: payload.scopeId,
    orgCode: payload.orgCode,
    extraHeaders: {
      action: "fetch-steps",
      screenname: "EXECUTION RUN",
    },
  });

  // Normalize qmUDF.TCR into a flat array for easy LLM consumption
  const tcrFields = raw.qmUDF?.TCR ?? {};
  const fields = Object.entries(tcrFields).map(([key, def]) => ({
    fieldKey: key, // e.g. "FLD.planned_execution_date"
    fieldID: def.projectUserFieldID as number, // use as fieldID in bulk update
    name: def.name as string,
    label: def.fieldLabel as string,
    fieldType: def.fieldTypeName as string,
    allowBlank: def.allowBlank as boolean,
    ...(def.qmListName ? { listName: def.qmListName as string } : {}),
    ...(def.listMasterID ? { listMasterID: def.listMasterID as number } : {}),
  }));

  return {
    fields,
    lookupOptions: raw.qmUDFList ?? {},
    _note:
      "Use 'fieldID' (projectUserFieldID) when calling 'Bulk Update Test Run UDFs'. " +
      "For LOOKUPLIST/MULTILOOKUPLIST/CASCADINGLIST fields, use IDs from 'lookupOptions' as the value.",
  };
}

/**
 * Fetches Test Run UDF values for all test case runs in a given test suite run.
 * Steps:
 * 1. Calls `rest/execution/list/viewColumns` to get test case runs and their UDF values.
 * 2. Checks `hasTcRunUdf` — if false, returns immediately with a note.
 * 3. If UDFs exist, calls `rest/admin/udf/metadata` to get field definitions
 *    and enriches each run's UDF values with field label and type information.
 * @throws If tsrunID or viewId are missing.
 */
export async function fetchTestRunUdfValues(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestRunUdfValuesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (typeof payload.tsrunID !== "string" || !payload.tsrunID) {
    throw new Error(
      "[fetchTestRunUdfValues] Missing or invalid required parameter: 'tsrunID'.",
    );
  }
  if (typeof payload.viewId !== "number") {
    throw new Error(
      "[fetchTestRunUdfValues] Missing or invalid required parameter: 'viewId'.",
    );
  }

  // Step 1: fetch test case runs
  const runsResponse = await qmetryRequest<Record<string, any>>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: {
      tsrunID: payload.tsrunID,
      viewId: payload.viewId,
      startIndex: payload.startIndex ?? 0,
      size: payload.size ?? 50,
    },
    scopeId: payload.scopeId,
    orgCode: payload.orgCode,
  });

  // Step 2: check hasTcRunUdf flag
  if (runsResponse.hasTcRunUdf === false) {
    return {
      tsRunID: payload.tsrunID,
      hasTcRunUdf: false,
      total: runsResponse.total ?? 0,
      runs: [],
      _note:
        "No Test Run UDFs are configured for this project. " +
        "A project administrator must define Test Run UDF fields before values can be fetched.",
    };
  }

  // Step 3: fetch UDF metadata to enrich values
  let fieldDefs: Record<string, any> = {};
  let lookupOptions: Record<string, any[]> = {};
  try {
    const meta = await qmetryRequest<{
      qmUDF?: { TCR?: Record<string, any> };
      qmUDFList?: Record<string, any[]>;
    }>({
      method: "POST",
      path: QMETRY_PATHS.UDF.TEST_RUN_UDF_METADATA,
      token,
      project: resolvedProject,
      baseUrl: resolvedBaseUrl,
      body: { entityType: "TCR" },
      scopeId: payload.scopeId,
      orgCode: payload.orgCode,
      extraHeaders: {
        action: "fetch-steps",
        screenname: "EXECUTION RUN",
      },
    });
    fieldDefs = meta.qmUDF?.TCR ?? {};
    lookupOptions = meta.qmUDFList ?? {};
  } catch {
    // metadata call is best-effort — proceed without enrichment
  }

  // Build a lookup from field name → definition (used for fallback when metadata is unavailable)
  const defByName: Record<string, any> = {};
  for (const def of Object.values(fieldDefs)) {
    if (def?.name) defByName[def.name] = def;
  }

  const hasMetadata = Object.keys(fieldDefs).length > 0;

  // Step 4: extract and enrich UDF values from each run
  // When metadata is available, ALL project-defined UDF fields are included (null for unset fields).
  // This ensures every run shows the full set of available UDF fields, not just those with values.
  const rows: any[] = runsResponse.data ?? [];
  const runs = rows.map((row: any) => {
    let rawUdfs: Record<string, unknown> = {};
    if (row.udfjson) {
      try {
        rawUdfs = JSON.parse(row.udfjson);
      } catch {
        rawUdfs = {};
      }
    } else if (row.testRunUdfs && typeof row.testRunUdfs === "object") {
      rawUdfs = row.testRunUdfs;
    }

    let enrichedUdfs: any[];
    if (hasMetadata) {
      // Show ALL project-defined UDF fields; value is null when not set on this execution
      enrichedUdfs = Object.values(fieldDefs).map((def: any) => ({
        name: def.name as string,
        label: def.fieldLabel as string,
        fieldID: def.projectUserFieldID as number,
        fieldType: def.fieldTypeName as string,
        value: Object.hasOwn(rawUdfs, def.name) ? rawUdfs[def.name] : null,
      }));
    } else {
      // Fallback: metadata unavailable — show only fields that have values
      enrichedUdfs = Object.entries(rawUdfs).map(([name, value]) => {
        const def = defByName[name];
        return {
          name,
          label: def?.fieldLabel ?? name,
          fieldID: def?.projectUserFieldID ?? null,
          fieldType: def?.fieldTypeName ?? "UNKNOWN",
          value,
        };
      });
    }

    return {
      tcRunID: row.tcRunID,
      entityKey: row.entityKey,
      summary: row.summary,
      runStatus: row.runStatus,
      testRunUdfs: enrichedUdfs,
    };
  });

  return {
    tsRunID: payload.tsrunID,
    hasTcRunUdf: runsResponse.hasTcRunUdf ?? true,
    total: runsResponse.total ?? rows.length,
    runs,
    availableUdfFields: Object.values(fieldDefs).map((def: any) => ({
      fieldID: def.projectUserFieldID,
      name: def.name,
      label: def.fieldLabel,
      fieldType: def.fieldTypeName,
      ...(def.qmListName
        ? {
            listName: def.qmListName,
            lookupOptions: lookupOptions[def.qmListName] ?? [],
          }
        : {}),
    })),
  };
}
