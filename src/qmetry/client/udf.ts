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

type TestRunUdfSourceContext = NonNullable<
  FetchTestRunUdfValuesPayload["sourceContext"]
>;

type UdfFieldDefinition = {
  name?: string;
  fieldLabel?: string;
  projectUserFieldID?: number;
  fieldTypeName?: string;
  qmListName?: string;
};

type DisplayColumn = {
  header: string;
  fields: string[];
};

const TEST_RUN_UDF_DISPLAY_COLUMNS: Record<
  TestRunUdfSourceContext,
  DisplayColumn[]
> = {
  testSuiteRun: [
    { header: "Test Case Key", fields: ["entityKey"] },
    { header: "Test Case Summary", fields: ["summary"] },
    {
      header: "Executed Version",
      fields: ["latestVersion", "executedVersion"],
    },
    {
      header: "Execution Status",
      fields: ["runStatus", "runStatusName", "executionStatus"],
    },
    {
      header: "Tested By",
      fields: ["testedBy", "executedBy", "executionCreatedByLoginAlias"],
    },
  ],
  testCaseExecutions: [
    { header: "Test Suite Key", fields: ["tsEntityKey"] },
    {
      header: "Test Suite Name",
      fields: ["testsuiteName", "testSuiteName", "tsName"],
    },
    { header: "Release", fields: ["releaseName"] },
    { header: "Cycle", fields: ["cycleName"] },
    { header: "Platform", fields: ["platform", "platformName"] },
    { header: "Executed Version", fields: ["executedVersion"] },
    {
      header: "Execution Status",
      fields: ["executionStatus", "runStatusName", "runStatus"],
    },
    {
      header: "Tested By",
      fields: ["testedBy", "executedBy", "executionCreatedByLoginAlias"],
    },
  ],
};

function stripHtml(value: string) {
  if (!/<[^>]+>/.test(value)) return value;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot);/g, (_, entity) => {
      if (entity === "nbsp") return " ";
      if (entity === "amp") return "&";
      if (entity === "lt") return "<";
      if (entity === "gt") return ">";
      if (entity === "quot") return '"';
      return `&${entity};`;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function readFirstAvailable(row: Record<string, any>, fields: string[]) {
  for (const field of fields) {
    if (Object.hasOwn(row, field) && row[field] !== null && row[field] !== "") {
      return row[field];
    }
  }
  return null;
}

function formatTableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if ("parent" in objectValue || "child" in objectValue) {
      return [objectValue.parent, objectValue.child]
        .filter((part) => part !== null && part !== undefined && part !== "")
        .join(" > ");
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function parseRawUdfs(row: Record<string, any>): Record<string, unknown> {
  if (Array.isArray(row.testRunUdfs)) {
    return Object.fromEntries(
      row.testRunUdfs.map((udf: any) => [udf.name, udf.value]),
    );
  }

  if (row.testRunUdfs && typeof row.testRunUdfs === "object") {
    return row.testRunUdfs;
  }

  if (row.udfjson) {
    try {
      return JSON.parse(row.udfjson);
    } catch {
      return {};
    }
  }

  return {};
}

function enrichUdfsForRow(
  row: Record<string, any>,
  fieldDefs: Record<string, UdfFieldDefinition>,
) {
  const rawUdfs = parseRawUdfs(row);
  const hasMetadata = Object.keys(fieldDefs).length > 0;

  if (!hasMetadata && Array.isArray(row.testRunUdfs)) return row.testRunUdfs;

  if (hasMetadata) {
    return Object.values(fieldDefs).map((def) => {
      const fieldName = def.name ?? "";
      const rawValue = Object.hasOwn(rawUdfs, fieldName)
        ? rawUdfs[fieldName]
        : null;
      const value =
        typeof rawValue === "string" ? stripHtml(rawValue) : rawValue;
      return {
        name: fieldName,
        label: def.fieldLabel ?? fieldName,
        fieldID: def.projectUserFieldID ?? null,
        fieldType: def.fieldTypeName ?? "UNKNOWN",
        value,
      };
    });
  }

  return Object.entries(rawUdfs).map(([name, rawValue]) => ({
    name,
    label: name,
    fieldID: null,
    fieldType: "UNKNOWN",
    value: typeof rawValue === "string" ? stripHtml(rawValue) : rawValue,
  }));
}

function buildUnifiedTableRows(
  rows: any[],
  sourceContext: TestRunUdfSourceContext,
) {
  const contextColumns = TEST_RUN_UDF_DISPLAY_COLUMNS[sourceContext];
  return rows.map((row) => {
    const tableRow: Record<string, string> = {};

    for (const column of contextColumns) {
      tableRow[column.header] = formatTableValue(
        readFirstAvailable(row, column.fields),
      );
    }

    for (const udf of row.testRunUdfs ?? []) {
      tableRow[udf.label ?? udf.name] = formatTableValue(udf.value);
    }

    return tableRow;
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

  const sourceContext = payload.sourceContext ?? "testSuiteRun";

  if (
    (!Array.isArray(payload.sourceRows) || payload.sourceRows.length === 0) &&
    (typeof payload.tsrunID !== "string" || !payload.tsrunID)
  ) {
    throw new Error(
      "[fetchTestRunUdfValues] Missing or invalid required parameter: 'tsrunID'. Provide 'tsrunID' or pass parent tool rows in 'sourceRows'.",
    );
  }
  if (
    (!Array.isArray(payload.sourceRows) || payload.sourceRows.length === 0) &&
    typeof payload.viewId !== "number"
  ) {
    throw new Error(
      "[fetchTestRunUdfValues] Missing or invalid required parameter: 'viewId'. Provide 'viewId' or pass parent tool rows in 'sourceRows'.",
    );
  }

  const usingSourceRows =
    Array.isArray(payload.sourceRows) && payload.sourceRows.length > 0;

  const runsResponse = usingSourceRows
    ? {
        data: payload.sourceRows,
        hasTcRunUdf: true,
        total: payload.sourceRows?.length ?? 0,
      }
    : await qmetryRequest<Record<string, any>>({
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
  let fieldDefs: Record<string, UdfFieldDefinition> = {};
  let lookupOptions: Record<string, any[]> = {};
  try {
    const meta = await qmetryRequest<{
      qmUDF?: { TCR?: Record<string, UdfFieldDefinition> };
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

  // Step 4: extract and enrich UDF values from each run
  // When metadata is available, ALL project-defined UDF fields are included (null for unset fields).
  // This ensures every run shows the full set of available UDF fields, not just those with values.
  const rows: any[] = runsResponse.data ?? [];
  const runs = rows.map((row: any) => {
    const { udfjson: _udfjson, ...rowWithoutRawUdfJson } = row;
    const enrichedUdfs = enrichUdfsForRow(row, fieldDefs);

    return {
      ...rowWithoutRawUdfJson,
      testRunUdfs: enrichedUdfs,
    };
  });
  const unifiedTableRows = buildUnifiedTableRows(runs, sourceContext);
  const udfColumns = Object.values(fieldDefs).map(
    (def) => def.fieldLabel ?? def.name ?? "Unnamed UDF",
  );

  return {
    tsRunID: payload.tsrunID,
    sourceContext,
    hasTcRunUdf: runsResponse.hasTcRunUdf ?? true,
    total: runsResponse.total ?? rows.length,
    defaultColumns: TEST_RUN_UDF_DISPLAY_COLUMNS[sourceContext].map(
      (column) => column.header,
    ),
    udfColumns,
    unifiedTableRows,
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
