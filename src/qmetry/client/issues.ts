import { QMETRY_PATHS } from "../config/rest-endpoints";
import {
  type CreateIssuePayload,
  DEFAULT_CREATE_ISSUE_PAYLOAD,
  DEFAULT_FETCH_ISSUE_EXECUTIONS_PAYLOAD,
  DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
  DEFAULT_FETCH_ISSUES_PAYLOAD,
  DEFAULT_LINK_ISSUES_TO_TESTCASE_RUN_PAYLOAD,
  DEFAULT_UPDATE_ISSUE_PAYLOAD,
  type FetchIssueExecutionsPayload,
  type FetchIssuesLinkedToTestCasePayload,
  type FetchIssuesPayload,
  type LinkIssuesToTestcaseRunPayload,
  type UpdateIssuePayload,
} from "../types/issues";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

/**
 * Create Defect/Issue.
 * @throws If `issueType` or `issuePriority` or `summary` are missing/invalid.
 */
export async function createIssue(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: CreateIssuePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: CreateIssuePayload = {
    ...DEFAULT_CREATE_ISSUE_PAYLOAD,
    ...payload,
  };

  if (typeof body.issueType !== "number") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'issueType'.",
    );
  }
  if (typeof body.issuePriority !== "number") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'issuePriority'.",
    );
  }
  if (typeof body.summary !== "string") {
    throw new Error(
      "[createIssue] Missing or invalid required parameter: 'summary'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.CREATE_UPDATE_ISSUE,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Update Defect/Issue.
 * @throws If `DefectId` is missing/invalid.
 */
export async function updateIssue(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: UpdateIssuePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: UpdateIssuePayload = {
    ...DEFAULT_UPDATE_ISSUE_PAYLOAD,
    ...payload,
  };

  if (typeof body.DefectId !== "number") {
    throw new Error(
      "[updateIssue] Missing or invalid required parameter: 'DefectId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.ISSUES.CREATE_UPDATE_ISSUE,
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
export async function fetchIssues(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchIssuesPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchIssuesPayload = {
    ...DEFAULT_FETCH_ISSUES_PAYLOAD,
    ...payload,
  };

  if (typeof body.viewId !== "number") {
    throw new Error(
      "[fetchIssues] Missing or invalid required parameter: 'viewId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUES_LIST,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetches issues linked to a specific test case.
 * @throws If `tcID` is missing/invalid.
 */
export async function fetchIssuesLinkedToTestCase(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: FetchIssuesLinkedToTestCasePayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: FetchIssuesLinkedToTestCasePayload = {
    ...DEFAULT_FETCH_ISSUES_LINKED_TO_TESTCASE_PAYLOAD,
    ...payload,
  };

  if (typeof body.tcID !== "number") {
    throw new Error(
      "[fetchIssuesLinkedToTestCase] Missing or invalid required parameter: 'tcID'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUES_LINKED_TO_TC,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}

/**
 * Fetch executions for a QMetry-native (non-Jira) issue.
 * Also fetches UDF metadata (once, project-wide) to enrich each execution with
 * ALL available Test Run UDF fields, including fields with no value set (null).
 * @throws If linkedAssetId or linkedAsset.id is missing/invalid.
 */
export async function fetchIssueExecutions(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload:
    | (Omit<FetchIssueExecutionsPayload, "linkedAsset"> & {
        linkedAssetId?: number;
      })
    | FetchIssueExecutionsPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const { linkedAssetId, ...rest } = payload as any;
  const resolvedLinkedAsset =
    (payload as FetchIssueExecutionsPayload).linkedAsset ??
    (typeof linkedAssetId === "number"
      ? { type: "DF" as const, id: linkedAssetId }
      : undefined);

  if (!resolvedLinkedAsset || typeof resolvedLinkedAsset.id !== "number") {
    throw new Error(
      "[fetchIssueExecutions] Missing or invalid required parameter: 'linkedAssetId'.",
    );
  }

  const body: FetchIssueExecutionsPayload = {
    ...DEFAULT_FETCH_ISSUE_EXECUTIONS_PAYLOAD,
    ...rest,
    linkedAsset: resolvedLinkedAsset,
  };

  const result = await qmetryRequest<Record<string, any>>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUE_EXECUTIONS,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
    extraHeaders: {
      action: "link-tc-list-view",
      screenname: "ISSUE",
    },
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

    const { udfjson: _udfjson, ...rowRest } = row;
    return { ...rowRest, testRunUdfs };
  });

  return {
    ...result,
    data: enrichedData,
  };
}

/**
 * Link Issues to Testcase Run.
 * @throws If issueIds or tcrId are missing/invalid.
 */
export async function linkIssuesToTestcaseRun(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: LinkIssuesToTestcaseRunPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  const body: LinkIssuesToTestcaseRunPayload = {
    ...DEFAULT_LINK_ISSUES_TO_TESTCASE_RUN_PAYLOAD,
    ...payload,
  };

  if (!Array.isArray(body.issueIds) || body.issueIds.length === 0) {
    throw new Error(
      "[linkIssuesToTestcaseRun] Missing or invalid required parameter: 'issueIds'.",
    );
  }

  if (typeof body.tcrId !== "number") {
    throw new Error(
      "[linkIssuesToTestcaseRun] Missing or invalid required parameter: 'tcrId'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "PUT",
    path: QMETRY_PATHS.ISSUES.LINK_ISSUES_TO_TESTCASE_RUN,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    body,
  });
}
