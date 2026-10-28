import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type BulkUpdateExecutionStatusPayload,
  type CreateTestSuitePayload,
  DEFAULT_BULK_UPDATE_EXECUTION_STATUS_PAYLOAD,
  DEFAULT_CREATE_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD,
  DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_TESTSUITES_PAYLOAD,
  DEFAULT_LINKED_PLATFORMS_TO_TESTSUITE_PAYLOAD,
  DEFAULT_LINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
  DEFAULT_REQLINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
  DEFAULT_UPDATE_TESTSUITE_PAYLOAD,
  type FetchExecutionsByTestSuitePayload,
  type FetchLinkedIssuesByTestCaseRunPayload,
  type FetchTestCaseRunsByTestSuiteRunPayload,
  type FetchTestCasesByTestSuitePayload,
  type FetchTestSuitesForTestCasePayload,
  type FetchTestSuitesPayload,
  type LinkedPlatformsToTestSuitePayload,
  type LinkedTestCasesToTestSuitePayload,
  type ReqLinkedTestCasesToTestSuitePayload,
  type TestRunUdfInputValue,
  type UpdateTestSuitePayload,
} from "../types/testsuite";
import type { UdfFieldValue } from "../types/udf";
import { qmetryRequest } from "./api/client-api";
import {
  bulkUpdateTestRunUdfs,
  fetchTestRunUdfMetadata,
  parseRawUdfs,
} from "./udf";
import { resolveDefaults } from "./utils";

/**
 * Create test suites.
 * @throws If `parentFolderId` or `name` are missing/invalid.
 */
export async function createTestSuites(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { udfFields, ...restPayload } = payload as any;
  const body: CreateTestSuitePayload = {
    ...DEFAULT_CREATE_TESTSUITE_PAYLOAD,
    ...(udfFields ?? {}),
    ...restPayload,
  };

  if (typeof body.parentFolderId !== "string") {
    throw new Error(
      "[createTestSuites] Missing or invalid required parameter: 'parentFolderId'.",
    );
  }
  if (typeof body.name !== "string") {
    throw new Error(
      "[createTestSuites] Missing or invalid required parameter: 'name'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.CREATE_UPDATE_TS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update test suites.
 * @throws If `id` or `entityKey` or `TsFolderID` are missing/invalid.
 */
export async function updateTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { udfFields, ...restPayload } = payload as any;
  const body: UpdateTestSuitePayload = {
    ...DEFAULT_UPDATE_TESTSUITE_PAYLOAD,
    ...(udfFields ?? {}),
    ...restPayload,
  };

  if (typeof body.id !== "number") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.entityKey !== "string") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'entityKey'.",
    );
  }
  if (typeof body.TsFolderID !== "number") {
    throw new Error(
      "[updateTestSuite] Missing or invalid required parameter: 'TsFolderID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.CREATE_UPDATE_TS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a list of test suites.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchTestSuites(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestSuitesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestSuitesPayload = {
    ...DEFAULT_FETCH_TESTSUITES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestSuites] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new Error(
      "[fetchTestSuites] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  const result = await qmetryRequest<Record<string, unknown>>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TS_LIST,
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
 * Fetches test suites to link with test case.
 * @throws If `tsFolderID` is missing/invalid.
 */
export async function fetchTestSuitesForTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestSuitesForTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestSuitesForTestCasePayload = {
    ...DEFAULT_FETCH_TESTSUITES_FOR_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsFolderID !== "number") {
    throw new Error(
      "[fetchTestSuitesForTestCase] Missing or invalid required parameter: 'tsFolderID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TS_LIST_FOR_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test cases linked to a given test suite.
 * @throws If `tsID` is missing/invalid.
 */
export async function fetchTestCasesByTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesByTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesByTestSuitePayload = {
    ...DEFAULT_FETCH_TESTCASES_BY_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[fetchTestCasesByTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TESTCASES_BY_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches executions for a given test suite.
 * @throws If `tsID` is missing/invalid.
 */
export async function fetchExecutionsByTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchExecutionsByTestSuitePayload & {
    scopeId?: number;
    orgCode?: string;
  },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { scopeId, orgCode, ...payloadRest } = payload as any;
  const body: FetchExecutionsByTestSuitePayload = {
    ...DEFAULT_FETCH_EXECUTIONS_BY_TESTSUITE_PAYLOAD,
    ...payloadRest,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[fetchExecutionsByTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_EXECUTIONS_BY_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId,
    orgCode,
  });
}

/**
 * Fetches test case runs for a given test suite run ID.
 * @throws If `tsrunID` or `viewId` is missing/invalid.
 */
export async function fetchTestCaseRunsByTestSuiteRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseRunsByTestSuiteRunPayload & {
    scopeId?: number;
    orgCode?: string;
  },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { scopeId, orgCode, ...payloadRest } = payload as any;
  const body: FetchTestCaseRunsByTestSuiteRunPayload = {
    ...DEFAULT_FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN_PAYLOAD,
    ...payloadRest,
  };

  if (typeof body.tsrunID !== "string" || !body.tsrunID) {
    throw new Error(
      "[fetchTestCaseRunsByTestSuiteRun] Missing or invalid required parameter: 'tsrunID'.",
    );
  }

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestCaseRunsByTestSuiteRun] Missing or invalid required parameter: 'viewId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId,
    orgCode,
  });
}

/**
 * Fetches linked issues for a specific test case run.
 * @throws If `entityId` is missing/invalid.
 */
export async function fetchLinkedIssuesByTestCaseRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchLinkedIssuesByTestCaseRunPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchLinkedIssuesByTestCaseRunPayload = {
    ...DEFAULT_FETCH_LINKED_ISSUES_BY_TESTCASE_RUN_PAYLOAD,
    ...payload,
  };

  if (typeof body.entityId !== "number") {
    throw new Error(
      "[fetchLinkedIssuesByTestCaseRun] Missing or invalid required parameter: 'entityId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_LINKED_ISSUES_BY_TESTCASE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Link test cases to a test suite.
 * @throws If `tcID` or `tcVersionID` are missing/invalid.
 */
export async function linkTestCasesToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkedTestCasesToTestSuitePayload & {
    scopeId?: number;
    orgCode?: string;
  },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { scopeId, orgCode, ...payloadRest } = payload as any;
  const body: LinkedTestCasesToTestSuitePayload = {
    ...DEFAULT_LINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
    ...payloadRest,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[linkTestCasesToTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  if (!body.tcvdIDs) {
    throw new Error("[linkTestCasesToTestSuite] 'tcvdIDs' must be provided.");
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINKED_TESTCASES_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId,
    orgCode,
  });
}

/**
 * Requirements Linked test cases to a test suite.
 * @throws If `tcID` or `rqVersionIds` are missing/invalid.
 */
export async function reqLinkedTestCasesToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: ReqLinkedTestCasesToTestSuitePayload & {
    scopeId?: number;
    orgCode?: string;
  },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { scopeId, orgCode, ...payloadRest } = payload as any;
  const body: ReqLinkedTestCasesToTestSuitePayload = {
    ...DEFAULT_REQLINKED_TESTCASE_TO_TESTSUITE_PAYLOAD,
    ...payloadRest,
  };

  if (typeof body.tsID !== "number") {
    throw new Error(
      "[reqLinkedTestCasesToTestSuite] Missing or invalid required parameter: 'tsID'.",
    );
  }

  if (!body.tcvdIDs) {
    throw new Error(
      "[reqLinkedTestCasesToTestSuite] 'tcvdIDs' must be provided.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINKED_TESTCASES_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    scopeId,
    orgCode,
  });
}

/**
 * Link platforms to a test suite.
 * @throws If `qmTsId` or `qmPlatformId` are missing/invalid.
 */
export async function linkPlatformsToTestSuite(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkedPlatformsToTestSuitePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: LinkedPlatformsToTestSuitePayload = {
    ...DEFAULT_LINKED_PLATFORMS_TO_TESTSUITE_PAYLOAD,
    ...payload,
  };

  if (typeof body.qmTsId !== "number") {
    throw new Error(
      "[linkPlatformsToTestSuite] Missing or invalid required parameter: 'qmTsId'.",
    );
  }

  if (
    !body.qmPlatformId ||
    typeof body.qmPlatformId !== "string" ||
    body.qmPlatformId.trim().length === 0
  ) {
    throw new Error(
      "[linkPlatformsToTestSuite] Missing or invalid required parameter: 'qmPlatformId'. It must be a non-empty comma-separated string of Platform IDs.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.LINK_PLATFORMS_TO_TESTSUITE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Bulk update execution status for test case runs.
 * @throws If `entityIDs`, `entityType`, `qmTsRunId`, or `runStatusID` are missing/invalid.
 */
export async function bulkUpdateExecutionStatus(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: BulkUpdateExecutionStatusPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: BulkUpdateExecutionStatusPayload = {
    ...DEFAULT_BULK_UPDATE_EXECUTION_STATUS_PAYLOAD,
    ...payload,
  };

  if (
    !body.entityIDs ||
    typeof body.entityIDs !== "string" ||
    body.entityIDs.trim().length === 0
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'entityIDs'. It must be a non-empty comma-separated string of Test Case Run IDs.",
    );
  }

  if (
    !body.entityType ||
    (body.entityType !== "TCR" && body.entityType !== "TCSR")
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'entityType'. Must be 'TCR' or 'TCSR'.",
    );
  }

  if (
    !body.qmTsRunId ||
    typeof body.qmTsRunId !== "string" ||
    body.qmTsRunId.trim().length === 0
  ) {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'qmTsRunId'. It must be a non-empty string.",
    );
  }

  if (typeof body.runStatusID !== "number") {
    throw new Error(
      "[bulkUpdateExecutionStatus] Missing or invalid required parameter: 'runStatusID'. It must be a number.",
    );
  }

  // Gate-only fields (and the auto-resolved folderPath) must not reach the status API body.
  const {
    viewId,
    udfValuesByRun,
    scopeId,
    orgCode,
    folderPath: _folderPath,
    ...statusBody
  } = body as BulkUpdateExecutionStatusPayload & { folderPath?: string };

  let udfUpdates: TestRunUdfUpdateResult[] = [];

  if (statusBody.entityType === "TCSR") {
    if (udfValuesByRun && Object.keys(udfValuesByRun).length > 0) {
      throw new Error(
        "[bulkUpdateExecutionStatus] 'udfValuesByRun' is only supported when entityType is 'TCR'. Test Run UDFs belong to Test Case Runs, not Test Case Step Runs.",
      );
    }
  } else {
    const gate = await applyMandatoryTestRunUdfGate(
      token,
      resolvedBaseUrl,
      resolvedProject,
      {
        tcRunIDs: statusBody.entityIDs
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
        qmTsRunId: statusBody.qmTsRunId,
        viewId,
        udfValuesByRun,
        scopeId,
        orgCode,
      },
    );
    if (gate.blocked) {
      return gate.blocked;
    }
    udfUpdates = gate.udfUpdates;
  }

  const statusUpdate = await qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTSUITE.BULK_UPDATE_EXECUTION_STATUS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: statusBody,
  });

  return { success: true, udfUpdates, statusUpdate };
}

const TEST_RUN_UDF_GATE_PAGE_SIZE = 100;

type TestRunUdfUpdateResult = { tcRunIDs: number[]; response: unknown };

type MandatoryTestRunUdfGateResult =
  | { blocked: Record<string, unknown>; udfUpdates?: undefined }
  | { blocked?: undefined; udfUpdates: TestRunUdfUpdateResult[] };

function isEmptyUdfValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Enforces mandatory Test Run UDFs before a TCR execution status update.
 * 1. Reads TCR UDF metadata; mandatory fields are those with `allowBlank === false`.
 * 2. Reads current UDF values of every target run from the test suite run's execution list.
 * 3. Overlays caller-supplied `udfValuesByRun`; if any run still misses a mandatory value,
 *    returns a blocked result without writing anything.
 * 4. Otherwise writes the supplied UDF values (one bulk call per identical value set).
 * @throws If `udfValuesByRun` references unknown runs/fields, a run is not in the suite run,
 *   or a UDF bulk update fails.
 */
async function applyMandatoryTestRunUdfGate(
  token: string,
  baseUrl: string,
  project: string,
  args: {
    tcRunIDs: string[];
    qmTsRunId: string;
    viewId?: number;
    udfValuesByRun?: Record<string, Record<string, TestRunUdfInputValue>>;
    scopeId?: number;
    orgCode?: string;
  },
): Promise<MandatoryTestRunUdfGateResult> {
  const { tcRunIDs, qmTsRunId, viewId, scopeId, orgCode } = args;
  const udfValuesByRun = args.udfValuesByRun ?? {};

  const metadata = await fetchTestRunUdfMetadata(token, baseUrl, project, {
    scopeId,
    orgCode,
  });
  const fieldsByName = new Map(metadata.fields.map((f) => [f.name, f]));

  const unknownRuns = Object.keys(udfValuesByRun).filter(
    (id) => !tcRunIDs.includes(id),
  );
  if (unknownRuns.length > 0) {
    throw new Error(
      `[bulkUpdateExecutionStatus] 'udfValuesByRun' contains tcRunIDs that are not in 'entityIDs': ${unknownRuns.join(", ")}.`,
    );
  }
  for (const [tcRunID, udfs] of Object.entries(udfValuesByRun)) {
    const unknownFields = Object.keys(udfs).filter(
      (name) => !fieldsByName.has(name),
    );
    if (unknownFields.length > 0) {
      throw new Error(
        `[bulkUpdateExecutionStatus] 'udfValuesByRun.${tcRunID}' contains unknown Test Run UDF field names: ${unknownFields.join(", ")}. ` +
          `Valid names: ${[...fieldsByName.keys()].join(", ") || "(none)"}.`,
      );
    }
  }

  const mandatoryFields = metadata.fields.filter((f) => f.allowBlank === false);

  if (mandatoryFields.length > 0) {
    if (typeof viewId !== "number") {
      throw new Error(
        "[bulkUpdateExecutionStatus] Missing or invalid parameter: 'viewId'. It is required to verify mandatory Test Run UDFs (latestViews.TE.viewId from project info).",
      );
    }

    const rowsById = await fetchTestCaseRunRows(token, baseUrl, project, {
      tcRunIDs,
      qmTsRunId,
      viewId,
      scopeId,
      orgCode,
    });

    const notFound = tcRunIDs.filter((id) => !rowsById.has(id));
    if (notFound.length > 0) {
      throw new Error(
        `[bulkUpdateExecutionStatus] tcRunID(s) ${notFound.join(", ")} not found in test suite run ${qmTsRunId}.`,
      );
    }

    const runsMissingFields = tcRunIDs.flatMap((tcRunID) => {
      const row = rowsById.get(tcRunID) as Record<string, any>;
      const current = parseRawUdfs(row);
      const supplied = udfValuesByRun[tcRunID] ?? {};
      const missingFields = mandatoryFields
        .filter((f) =>
          isEmptyUdfValue(
            f.name in supplied ? supplied[f.name]?.value : current[f.name],
          ),
        )
        .map((f) => ({
          name: f.name,
          label: f.label,
          fieldID: f.fieldID,
          fieldType: f.fieldType,
          ...(f.listName ? { listName: f.listName } : {}),
        }));
      return missingFields.length > 0
        ? [
            {
              tcRunID: Number(tcRunID),
              entityKey: row.entityKey,
              missingFields,
            },
          ]
        : [];
    });

    if (runsMissingFields.length > 0) {
      return {
        blocked: {
          success: false,
          code: "MANDATORY_TEST_RUN_UDF_MISSING",
          statusUpdated: false,
          message:
            `Execution status was NOT updated: ${runsMissingFields.length} Test Case Run(s) are missing mandatory Test Run UDF values. ` +
            "No UDF values or statuses were changed.",
          runsMissingFields,
          ...(Object.keys(metadata.lookupOptions).length > 0
            ? { lookupOptions: metadata.lookupOptions }
            : {}),
          _note:
            "Ask the user for the missing values, then retry with 'udfValuesByRun' keyed by tcRunID and UDF field name. " +
            "Lookup fields take option 'id' values from lookupOptions[listName]; dates use MM-DD-YYYY.",
        },
      };
    }
  }

  // Group runs with identical UDF value sets so each set is written with a single bulk call.
  const groups = new Map<
    string,
    { tcRunIDs: number[]; UDF: Record<string, UdfFieldValue> }
  >();
  for (const [tcRunID, udfs] of Object.entries(udfValuesByRun)) {
    const names = Object.keys(udfs).sort();
    if (names.length === 0) continue;
    const UDF: Record<string, UdfFieldValue> = {};
    for (const name of names) {
      const entry = udfs[name];
      UDF[name] = {
        fieldID: entry.fieldID ?? (fieldsByName.get(name)?.fieldID as number),
        value: entry.value,
        ...(entry.multiSelectAction
          ? { multiSelectAction: entry.multiSelectAction }
          : {}),
      };
    }
    const key = JSON.stringify(UDF);
    const group = groups.get(key);
    if (group) {
      group.tcRunIDs.push(Number(tcRunID));
    } else {
      groups.set(key, { tcRunIDs: [Number(tcRunID)], UDF });
    }
  }

  const udfUpdates: TestRunUdfUpdateResult[] = [];
  for (const group of groups.values()) {
    try {
      const response = await bulkUpdateTestRunUdfs(token, baseUrl, project, {
        tcRunIDs: group.tcRunIDs,
        UDF: group.UDF,
        scopeId,
        orgCode,
      });
      udfUpdates.push({ tcRunIDs: group.tcRunIDs, response });
    } catch (err) {
      const applied = udfUpdates.flatMap((u) => u.tcRunIDs);
      throw new Error(
        `[bulkUpdateExecutionStatus] Test Run UDF update failed for tcRunIDs ${group.tcRunIDs.join(", ")}; execution status was NOT updated. ` +
          `UDF updates already applied for tcRunIDs: ${applied.length > 0 ? applied.join(", ") : "(none)"}. ` +
          `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { udfUpdates };
}

/**
 * Pages through the test suite run's execution list until every requested tcRunID is found
 * or the list is exhausted. Returns rows keyed by tcRunID (as string).
 */
async function fetchTestCaseRunRows(
  token: string,
  baseUrl: string,
  project: string,
  args: {
    tcRunIDs: string[];
    qmTsRunId: string;
    viewId: number;
    scopeId?: number;
    orgCode?: string;
  },
): Promise<Map<string, Record<string, any>>> {
  const wanted = new Set(args.tcRunIDs);
  const rowsById = new Map<string, Record<string, any>>();
  let start = 0;

  while (rowsById.size < wanted.size) {
    const response = await qmetryRequest<Record<string, any>>({
      method: "POST",
      path: QMETRY_PATHS.TESTSUITE.GET_TESTCASE_RUNS_BY_TESTSUITE_RUN,
      token,
      project,
      baseUrl,
      body: {
        tsrunID: args.qmTsRunId,
        viewId: args.viewId,
        start,
        page: 1,
        limit: TEST_RUN_UDF_GATE_PAGE_SIZE,
      },
      scopeId: args.scopeId,
      orgCode: args.orgCode,
    });

    const data: Record<string, any>[] = Array.isArray(response?.data)
      ? response.data
      : [];
    for (const row of data) {
      const id = String(row.tcRunID);
      if (wanted.has(id)) rowsById.set(id, row);
    }

    start += data.length;
    const total = typeof response?.total === "number" ? response.total : 0;
    if (data.length === 0 || start >= total) break;
  }

  return rowsById;
}

/**
 * Fetches test suite detail data including UDF values.
 * @throws If `id` is missing/invalid.
 */
export async function fetchTestSuiteDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: { id: number; scope?: string },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (typeof payload.id !== "number" || payload.id <= 0) {
    throw new Error(
      "[fetchTestSuiteDetails] Missing or invalid required parameter: 'id'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTSUITE.GET_TS_DETAIL,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body: { scope: payload.scope ?? "project", id: payload.id },
    extraHeaders: { action: "detail-tab", screenname: "TESTSUITE" },
  });
}
