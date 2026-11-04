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
import { fetchUdfLayout } from "./udf";
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

  const { udfFields, ...restPayload } = payload as any;
  const body: CreateIssuePayload = {
    ...DEFAULT_CREATE_ISSUE_PAYLOAD,
    ...(udfFields ?? {}),
    ...restPayload,
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

  // Pre-flight: fetch UDF layout to (1) auto-apply defaults and (2) validate mandatory fields.
  try {
    const layout = await fetchUdfLayout(
      token,
      resolvedBaseUrl,
      resolvedProject,
      {
        entityType: "IS",
        pageName: "ADD",
      },
    );

    const systemFieldTypeMap: Record<string, string> = Object.fromEntries(
      layout.systemFields.map((f: any) => [f.name, f.fieldTypeName]),
    );
    const systemFieldNames = new Set(Object.keys(systemFieldTypeMap));

    // Step 1: auto-apply defaults for any field not already set in the payload.
    // System MULTILOOKUPLIST defaults come as a single ID — wrap in array.
    for (const [fieldName, defaultValue] of Object.entries(
      layout.defaultValues,
    )) {
      if (body[fieldName] !== undefined && body[fieldName] !== null) continue;
      if (
        systemFieldNames.has(fieldName) &&
        systemFieldTypeMap[fieldName] === "MULTILOOKUPLIST" &&
        typeof defaultValue === "number"
      ) {
        body[fieldName] = [defaultValue];
      } else {
        body[fieldName] = defaultValue;
      }
    }

    // Step 2: validate all mandatory fields (system + UDF) are present after defaults applied.
    const missing: string[] = [];
    const allMandatory = [
      ...layout.systemFields.filter((f: any) => f.isMandatory),
      ...layout.fields.filter((f: any) => f.isMandatory),
    ];
    for (const field of allMandatory) {
      const val = body[field.name];
      const absent =
        val === undefined ||
        val === null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (absent) {
        missing.push(field.label ?? field.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `[createIssue] Missing mandatory fields: ${missing.join(", ")}. ` +
          "Provide values for these fields before creating the issue.",
      );
    }
  } catch (err: any) {
    // Re-throw our own mandatory-field errors; swallow layout-fetch failures.
    if (err?.message?.startsWith("[createIssue]")) throw err;
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

  const { udfFields, ...restPayload } = payload as any;
  const body: UpdateIssuePayload = {
    ...DEFAULT_UPDATE_ISSUE_PAYLOAD,
    ...(udfFields ?? {}),
    ...restPayload,
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

  const result = await qmetryRequest<Record<string, unknown>>({
    method: "POST",
    path: QMETRY_PATHS.ISSUES.GET_ISSUES_LIST,
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

  const hasMetadata = Object.keys(fieldDefs).length > 0;
  const rows: any[] = result.data ?? [];

  const enrichedData = rows.map((row: any) => {
    let rawUdfs: Record<string, unknown> = {};
    if (row.udfjson) {
      if (typeof row.udfjson === "string") {
        try {
          rawUdfs = JSON.parse(row.udfjson);
        } catch {
          rawUdfs = {};
        }
      } else {
        rawUdfs = row.udfjson as Record<string, unknown>;
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
        // Resolve uniqueLabel → display name for lookup fields
        const listName = def.qmListName as string | undefined;
        const options: any[] = listName ? (lookupOptions[listName] ?? []) : [];
        let valueResolved = false;
        if (options.length > 0) {
          if (typeof value === "string") {
            const match = options.find((o) => o.uniqueLabel === value);
            if (match) {
              value = match.name;
              valueResolved = true;
            }
          } else if (Array.isArray(value)) {
            let allResolved = true;
            value = value.map((v) => {
              const match = options.find((o) => o.uniqueLabel === v);
              if (!match) allResolved = false;
              return match ? match.name : v;
            });
            valueResolved = allResolved;
          } else {
            valueResolved = true;
          }
        }
        const isLookupField = [
          "LOOKUPLIST",
          "MULTILOOKUPLIST",
          "CASCADINGLIST",
        ].includes(def.fieldTypeName ?? "");
        return {
          name: def.name as string,
          label: def.fieldLabel as string,
          fieldID: def.projectUserFieldID as number,
          fieldType: def.fieldTypeName as string,
          value,
          ...(isLookupField && !valueResolved && value !== null
            ? {
                _rawValue: true,
                _note: "Lookup options unavailable — value is raw internal ID.",
              }
            : {}),
        };
      });
    } else {
      // Fallback: metadata unavailable — parse udfjson keys directly
      testRunUdfs = Object.fromEntries(
        Object.entries(rawUdfs).map(([key, val]) => {
          if (typeof val === "string" && /<[^>]+>/.test(val)) {
            const text = val
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

/**
 * Fetches full issue detail data including UDF values.
 * @throws If `defectId` is missing/invalid.
 */
export async function fetchIssueDetails(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: { defectId: number; scopeId?: number; orgCode?: string },
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (typeof payload.defectId !== "number" || payload.defectId <= 0) {
    throw new Error(
      "[fetchIssueDetails] Missing or invalid required parameter: 'defectId'.",
    );
  }
  const url = QMETRY_PATHS.ISSUES.GET_ISSUE_DETAIL + payload.defectId;
  const extraHeaders: Record<string, string> = {
    action: "detail",
    screenname: "ISSUE",
  };
  if (typeof payload.scopeId === "number") {
    extraHeaders["scope"] = String(payload.scopeId);
  }
  if (typeof payload.orgCode === "string") {
    extraHeaders["orgcode"] = payload.orgCode;
  }
  extraHeaders["Content-Type"] = "application/json";
  return qmetryRequest<unknown>({
    method: "GET",
    path: url,
    token,
    project: resolvedProject,
    baseUrl: resolvedBaseUrl,
    extraHeaders,
  });
}
