import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type CreateTestCasesPayload,
  DEFAULT_CREATE_TESTCASES_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_EXECUTIONS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD,
  DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD,
  DEFAULT_FETCH_TESTCASES_PAYLOAD,
  DEFAULT_LINKED_REQUIREMENT_TO_TESTCASE_PAYLOAD,
  DEFAULT_UPDATE_TESTCASES_PAYLOAD,
  type FetchTestCaseDetailsPayload,
  type FetchTestCaseExecutionsPayload,
  type FetchTestCaseStepsPayload,
  type FetchTestCasesLinkedToRequirementPayload,
  type FetchTestCasesPayload,
  type FetchTestCaseVersionDetailsPayload,
  type linkRequirementToTestCasePayload,
  type UpdateTestCasesPayload,
} from "../types/testcase.js";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

/**
 * Create test cases.
 * @throws If `tcFolderID` or `name` are missing/invalid.
 */
export async function createTestCases(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateTestCasesPayload = {
    ...DEFAULT_CREATE_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcFolderID !== "string") {
    throw new Error(
      "[createTestCases] Missing or invalid required parameter: 'tcFolderID'.",
    );
  }
  if (typeof body.name !== "string") {
    throw new Error(
      "[createTestCases] Missing or invalid required parameter: 'name'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.CREATE_UPDATE_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update test cases.
 * @throws If `tcID` or `tcVersionID` are missing/invalid.
 */
export async function updateTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: UpdateTestCasesPayload = {
    ...DEFAULT_UPDATE_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[updateTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }
  if (typeof body.tcVersionID !== "number") {
    throw new Error(
      "[updateTestCase] Missing or invalid required parameter: 'tcVersionID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTCASE.CREATE_UPDATE_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a list of test cases.
 * @throws If `viewId` or `folderPath` are missing/invalid.
 */
export async function fetchTestCases(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesPayload = {
    ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchTestCases] Missing or invalid required parameter: 'viewId'.",
    );
  }
  if (typeof body.folderPath !== "string") {
    throw new Error(
      "[fetchTestCases] Missing or invalid required parameter: 'folderPath'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case details.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchTestCaseDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseDetailsPayload = {
    ...DEFAULT_FETCH_TESTCASE_DETAILS_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[fetchTestCaseDetails] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_DETAILS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case details by version.
 * @throws If `id` is missing/invalid.
 */
export async function fetchTestCaseVersionDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseVersionDetailsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseVersionDetailsPayload = {
    ...DEFAULT_FETCH_TESTCASE_VERSION_DETAILS_PAYLOAD,
    ...payload,
  };

  if (!body.id) {
    throw new Error(
      "[fetchTestCaseVersionDetails] Missing or invalid required parameter: 'id'.",
    );
  }
  if (typeof body.version !== "number") {
    throw new Error(
      "[fetchTestCaseVersionDetails] Missing or invalid required parameter: 'version'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_DETAILS_BY_VERSION,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches a test case steps.
 * @throws If `id` is missing/invalid.
 */
export async function fetchTestCaseSteps(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseStepsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseStepsPayload = {
    ...DEFAULT_FETCH_TESTCASE_STEPS_PAYLOAD,
    ...payload,
  };

  if (typeof body.id !== "number") {
    throw new Error(
      "[fetchTestCaseSteps] Missing or invalid required parameter: 'id'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_STEPS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches test cases linked to a specific requirement.
 * @throws If `rqID` is missing/invalid.
 */
export async function fetchTestCasesLinkedToRequirement(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCasesLinkedToRequirementPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCasesLinkedToRequirementPayload = {
    ...DEFAULT_FETCH_TESTCASES_LINKED_TO_REQUIREMENT_PAYLOAD,
    ...payload,
  };

  if (typeof body.rqID !== "number") {
    throw new Error(
      "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_LINKED_TO_RQ,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches executions for a specific test case.
 * Also fetches UDF metadata (once, project-wide) to enrich each execution with
 * ALL available Test Run UDF fields, including fields with no value set (null).
 * @throws If `tcid` is missing/invalid.
 */
export async function fetchTestCaseExecutions(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchTestCaseExecutionsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchTestCaseExecutionsPayload = {
    ...DEFAULT_FETCH_TESTCASE_EXECUTIONS_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcid !== "number") {
    throw new Error(
      "[fetchTestCaseExecutions] Missing or invalid required parameter: 'tcid'.",
    );
  }

  const result = await qmetryRequest<Record<string, any>>({
    method: "POST",
    path: QMETRY_PATHS.TESTCASE.GET_TC_EXECUTIONS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });

  if (result.hasTcRunUdf === false) {
    return {
      ...result,
      testRunUdfNote:
        "No Test Run UDFs are configured for this project. " +
        "The 'testRunUdfs' field will not be present in execution records. " +
        "To enable Test Run UDF features, a project administrator must define Test Run UDF fields in the project settings.",
    };
  }

  // Fetch UDF metadata once — field definitions are project-wide and identical across all executions
  let fieldDefs: Record<string, any> = {};
  try {
    const meta = await qmetryRequest<{
      qmUDF?: { TCR?: Record<string, any> };
    }>({
      method: "POST",
      path: QMETRY_PATHS.UDF.TEST_RUN_UDF_METADATA,
      token,
      project: resolvedProject,
      baseUrl: resolvedBaseUrl,
      body: { entityType: "TCR" },
      extraHeaders: {
        action: "fetch-steps",
        screenname: "EXECUTION RUN",
      },
    });
    fieldDefs = meta.qmUDF?.TCR ?? {};
  } catch {
    // metadata call is best-effort — proceed without enrichment
  }

  const hasMetadata = Object.keys(fieldDefs).length > 0;
  const rows: any[] = result.data ?? [];

  const enrichedData = rows.map((row: any) => {
    let rawUdfs: Record<string, unknown> = {};
    if (row.udfjson) {
      try {
        rawUdfs = JSON.parse(row.udfjson);
      } catch {
        rawUdfs = {};
      }
    }

    let testRunUdfs: any;
    if (hasMetadata) {
      // Show ALL project-defined UDF fields; value is null when not set on this execution
      testRunUdfs = Object.values(fieldDefs).map((def: any) => {
        let value: unknown = Object.hasOwn(rawUdfs, def.name)
          ? rawUdfs[def.name]
          : null;
        // Strip HTML from rich text (LARGETEXT) field values
        if (typeof value === "string" && /<[^>]+>/.test(value)) {
          value = value
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim();
        }
        return {
          name: def.name as string,
          label: def.fieldLabel as string,
          fieldID: def.projectUserFieldID as number,
          fieldType: def.fieldTypeName as string,
          value,
        };
      });
    } else {
      // Fallback: metadata unavailable — parse udfjson keys directly
      testRunUdfs = Object.fromEntries(
        Object.entries(rawUdfs).map(([key, val]) => {
          if (typeof val === "string" && /<[^>]+>/.test(val)) {
            const text = val
              .replace(/<[^>]*>/g, " ")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/\s+/g, " ")
              .trim();
            return [key, text];
          }
          return [key, val];
        }),
      );
    }

    const { udfjson: _udfjson, ...rest } = row;
    return { ...rest, testRunUdfs };
  });

  return {
    ...result,
    data: enrichedData,
  };
}

/**
 * Links a requirement to a test case.
 * @throws If `tcID` or `tcVersionID` or `rqVersionIds` are missing/invalid.
 */
export async function linkRequirementToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: linkRequirementToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: linkRequirementToTestCasePayload = {
    ...DEFAULT_LINKED_REQUIREMENT_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "string") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }
  if (typeof body.tcVersionId !== "number") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'tcVersionId'.",
    );
  }
  if (typeof body.rqVersionIds !== "string") {
    throw new Error(
      "[linkRequirementToTestCase] Missing or invalid required parameter: 'rqVersionIds'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.TESTCASE.LINKED_RQ_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
