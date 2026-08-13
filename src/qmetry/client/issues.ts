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

type UdfFieldDefinition = {
  name?: string;
  fieldLabel?: string;
  projectUserFieldID?: number;
  fieldTypeName?: string;
  listMasterID?: string | number;
  qmListName?: string;
};

type CustomListItem = {
  id?: string | number;
  Id?: string | number;
  name?: string;
  Name?: string;
  uniqueLabel?: string;
  alias?: string;
  Alias?: string;
};

const CUSTOM_LIST_PAGE_SIZE = 50;
const LOOKUP_FIELD_TYPES = new Set(["LOOKUPLIST", "MULTILOOKUPLIST"]);

function getListDefinitionKey(def: UdfFieldDefinition): string | undefined {
  if (def.listMasterID !== undefined) return `id:${def.listMasterID}`;
  if (def.qmListName) return `name:${def.qmListName}`;
  return undefined;
}

function buildListOptionMap(items: CustomListItem[]): Map<string, string> {
  const options = new Map<string, string>();

  for (const item of items) {
    const id = item.id ?? item.Id;
    const label =
      item.uniqueLabel ?? item.alias ?? item.Alias ?? item.name ?? item.Name;

    if (id !== undefined && label !== undefined) {
      options.set(String(id), label);
    }
  }

  return options;
}

function resolveLookupValue(
  rawValue: unknown,
  fieldType: string | undefined,
  options: Map<string, string>,
): unknown {
  if (rawValue === null || rawValue === undefined) return rawValue;

  if (fieldType === "LOOKUPLIST") {
    return options.get(String(rawValue)) ?? rawValue;
  }

  if (fieldType === "MULTILOOKUPLIST" && Array.isArray(rawValue)) {
    return rawValue.map((item) => options.get(String(item)) ?? item);
  }

  return rawValue;
}

function parseRawUdfs(udfjson: unknown): Record<string, unknown> {
  if (!udfjson) return {};

  try {
    const parsedUdfs =
      typeof udfjson === "string" ? JSON.parse(udfjson) : udfjson;

    return parsedUdfs !== null &&
      typeof parsedUdfs === "object" &&
      !Array.isArray(parsedUdfs)
      ? (parsedUdfs as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function fetchCustomListItems(
  token: string,
  baseUrl: string,
  project: string,
  listMasterID: number,
  scopeId?: number,
  orgCode?: string,
): Promise<CustomListItem[]> {
  const items: CustomListItem[] = [];
  let start = 0;
  let page = 1;

  while (true) {
    const response = await qmetryRequest<{
      data?: CustomListItem[];
      total?: string | number;
    }>({
      method: "POST",
      path: QMETRY_PATHS.UDF.CUSTOM_LIST_VALUES,
      token,
      project,
      baseUrl,
      scopeId,
      orgCode,
      body: {
        qmMasterId: listMasterID,
        start,
        limit: CUSTOM_LIST_PAGE_SIZE,
        page,
        params: { showArchive: false },
      },
    });

    const batch = Array.isArray(response.data) ? response.data : [];
    items.push(...batch);

    const total = Number(response.total);
    const hasAllItems = Number.isFinite(total)
      ? items.length >= total
      : batch.length < CUSTOM_LIST_PAGE_SIZE;
    if (batch.length === 0 || hasAllItems) break;

    start += batch.length;
    page += 1;
  }

  return items;
}

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

  const { linkedAssetId, scopeId, orgCode, ...rest } = payload as any;
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
  let fieldDefs: Record<string, UdfFieldDefinition> = {};
  let inlineListOptions: Record<string, CustomListItem[]> = {};
  try {
    const meta = await qmetryRequest<{
      qmUDF?: { TCR?: Record<string, UdfFieldDefinition> };
      qmUDFList?: Record<string, CustomListItem[]>;
    }>({
      method: "POST",
      path: QMETRY_PATHS.UDF.TEST_RUN_UDF_METADATA,
      token,
      project: resolvedProject,
      baseUrl: resolvedBaseUrl,
      body: { entityType: "TCR" },
      scopeId,
      orgCode,
      extraHeaders: {
        action: "fetch-steps",
        screenname: "EXECUTION RUN",
      },
    });
    fieldDefs = meta.qmUDF?.TCR ?? {};
    inlineListOptions = meta.qmUDFList ?? {};
  } catch {
    // metadata call is best-effort — proceed without enrichment
  }

  const hasMetadata = Object.keys(fieldDefs).length > 0;
  const rows: any[] = result.data ?? [];
  const parsedRows = rows.map((row) => ({
    row,
    rawUdfs: parseRawUdfs(row.udfjson),
  }));
  const listDefinitions = new Map<string, UdfFieldDefinition>();
  for (const def of Object.values(fieldDefs)) {
    if (!LOOKUP_FIELD_TYPES.has(def.fieldTypeName ?? "")) continue;
    const fieldName = def.name;
    if (
      !fieldName ||
      !parsedRows.some(
        ({ rawUdfs }) =>
          Object.hasOwn(rawUdfs, fieldName) &&
          rawUdfs[fieldName] !== null &&
          rawUdfs[fieldName] !== undefined,
      )
    ) {
      continue;
    }
    const key = getListDefinitionKey(def);
    if (key) listDefinitions.set(key, def);
  }

  const listOptionsByDefinition = new Map<string, Map<string, string>>();
  await Promise.all(
    [...listDefinitions.entries()].map(async ([key, def]) => {
      const inlineOptions = def.qmListName
        ? inlineListOptions[def.qmListName]
        : undefined;
      if (Array.isArray(inlineOptions) && inlineOptions.length > 0) {
        listOptionsByDefinition.set(key, buildListOptionMap(inlineOptions));
        return;
      }

      const listMasterID = Number(def.listMasterID);
      if (!Number.isFinite(listMasterID)) return;

      try {
        const items = await fetchCustomListItems(
          token,
          resolvedBaseUrl,
          resolvedProject,
          listMasterID,
          scopeId,
          orgCode,
        );
        listOptionsByDefinition.set(key, buildListOptionMap(items));
      } catch {
        // List enrichment is best-effort; retain raw IDs when unavailable.
      }
    }),
  );

  const enrichedData = parsedRows.map(({ row, rawUdfs }) => {
    let testRunUdfs: any;
    if (hasMetadata) {
      // Show ALL project-defined UDF fields; value is null when not set on this execution
      testRunUdfs = Object.values(fieldDefs).map((def: any) => {
        const rawValue: unknown = Object.hasOwn(rawUdfs, def.name)
          ? rawUdfs[def.name]
          : null;
        const listDefinitionKey = getListDefinitionKey(def);
        const listOptions = listDefinitionKey
          ? listOptionsByDefinition.get(listDefinitionKey)
          : undefined;
        let value = resolveLookupValue(
          rawValue,
          def.fieldTypeName,
          listOptions ?? new Map(),
        );
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
        const enrichedUdf = {
          name: def.name as string,
          label: def.fieldLabel as string,
          fieldID: def.projectUserFieldID as number,
          fieldType: def.fieldTypeName as string,
          value,
        };

        return LOOKUP_FIELD_TYPES.has(def.fieldTypeName)
          ? { ...enrichedUdf, rawValue }
          : enrichedUdf;
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
