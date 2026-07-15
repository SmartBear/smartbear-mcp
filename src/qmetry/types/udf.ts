import { z } from "zod";
import { CommonFields } from "./common.ts";

export interface UdfModule {
  moduleID: number;
  mandatory: boolean;
}

export interface UdfListValue {
  id: number;
  name: string;
  projectID: number;
}

export interface UdfDataEntry {
  projectID: number;
  projectName: string;
  modules: UdfModule[];
  moduleModel: any[];
  listValues?: UdfListValue[];
  defaultValue?: string | number | number[] | null;
  defaultChildValue?: number[];
}
export interface FetchUdfFieldTypesPayload {
  scopeId?: number;
  orgCode?: string;
}

export const FetchUdfFieldTypesArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
  baseUrl: CommonFields.baseUrl,
});

export const FetchUdfModulesArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
});

export interface UdfFieldValue {
  fieldID: number;
  value: string | number | number[] | { parent: number; child: number } | null;
  multiSelectAction?: "append" | "replace";
}

export interface BulkUpdateTestRunUdfsPayload {
  tcRunIDs: number[];
  UDF: Record<string, UdfFieldValue>;
  scopeId?: number;
  orgCode?: string;
}

const UdfFieldValueSchema = z.object({
  fieldID: z
    .number()
    .int()
    .positive()
    .describe(
      "Numeric ID of the UDF field to update. " +
        "Get this from the UDF field definition in QMetry admin or from the field's metadata.",
    ),
  value: z
    .union([
      z.string(),
      z.number(),
      z.array(z.number().int()),
      z.object({
        parent: z.number().int().describe("Parent item ID for cascading list."),
        child: z.number().int().describe("Child item ID for cascading list."),
      }),
    ])
    .describe(
      "Value to set for this UDF field. Type depends on field type:\n" +
        "STRING: plain string, e.g. 'test value'\n" +
        "NUMBER: number, e.g. 3\n" +
        "DATETIMEPICKER: date string in MM-DD-YYYY format, e.g. '06-20-2026'\n" +
        "LOOKUPLIST (single): numeric item ID, e.g. 5108697\n" +
        "MULTILOOKUPLIST (multi-select): array of item IDs, e.g. [5158524, 5158525]\n" +
        "CASCADINGLIST: object with parent and child IDs, e.g. {parent: 5126498, child: 5126499}",
    ),
  multiSelectAction: z
    .enum(["append", "replace"])
    .optional()
    .default("append")
    .describe(
      "Action for MULTILOOKUPLIST fields only. " +
        "'append' adds the new values to existing selections (default). " +
        "'replace' clears existing selections and sets only the new values. " +
        "Omit or use 'append' if user does not specify — never assume 'replace'.",
    ),
});

export const BulkUpdateTestRunUdfsArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tcRunIDs: z
    .array(z.number().int().positive())
    .min(1)
    .describe(
      "Array of Test Case Run IDs to update UDF values for. " +
        "To get tcRunIDs — Call 'Fetch Test Case Runs by Test Suite Run' tool. " +
        "From the response, get value of data[<index>].tcRunID. " +
        "Example: [41572006, 41572009, 41572013]",
    ),
  UDF: z
    .record(z.string(), UdfFieldValueSchema)
    .describe(
      "Object mapping UDF field names to their new values. " +
        "Each key is the UDF field name (e.g. 'test_env', 'priority_field'). " +
        "Each value is an object with fieldID and value (and optionally multiSelectAction for multi-select fields). " +
        "All UDF fields are optional — include only the fields you want to update.",
    ),
});

// ---------------------------------------------------------------------------
// Test Run UDF Metadata
// ---------------------------------------------------------------------------

export interface FetchTestRunUdfMetadataPayload {
  scopeId?: number;
  orgCode?: string;
}

export const FetchTestRunUdfMetadataArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
});

// ---------------------------------------------------------------------------
// Fetch Test Run UDF Values
// ---------------------------------------------------------------------------

export interface FetchTestRunUdfValuesPayload {
  tsrunID?: string;
  viewId?: number;
  sourceContext?: "testSuiteRun" | "testCaseExecutions";
  sourceRows?: Record<string, unknown>[];
  startIndex?: number;
  size?: number;
  scopeId?: number;
  orgCode?: string;
}

// ---------------------------------------------------------------------------
// Fetch Cascade Child Values
// ---------------------------------------------------------------------------

export interface FetchCascadeChildValuesPayload {
  id: number;
  isArchReq?: boolean;
  scopeId?: number;
  orgCode?: string;
}

export const FetchCascadeChildValuesArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  id: z
    .number()
    .int()
    .positive()
    .describe(
      "Numeric ID of the parent cascade list item to fetch child values for. " +
        "Get this from the 'lookupOptions' returned by 'Fetch Test Run UDF Metadata' " +
        "for a CASCADINGLIST field — each option has an 'id' field.",
    ),
  isArchReq: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to include archived child items in the response (default: false).",
    ),
});

export const FetchTestRunUdfValuesArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,
  baseUrl: CommonFields.baseUrl,
  tsrunID: z.coerce
    .string()
    .optional()
    .describe(
      "Test Suite Run ID. CRITICAL: the parameter name is 'tsrunID' — do NOT use 'testSuiteRunId', 'tsRunID', or any other variant. " +
        "Accepts a string or number (e.g. 731600 or '731600' — both are valid). " +
        "Get this from 'Fetch Executions by Test Suite' → use data[<index>].tsRunID from the response. " +
        "Required when sourceRows is not provided.",
    ),
  viewId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "View ID for the test execution list (latestViews.TE.viewId from project info). " +
        "Auto-resolved from project info when omitted. Required when sourceRows is not provided.",
    ),
  sourceContext: z
    .enum(["testSuiteRun", "testCaseExecutions"])
    .optional()
    .default("testSuiteRun")
    .describe(
      "Which parent tool produced sourceRows. Use 'testSuiteRun' for Fetch Test Case Runs by Test Suite Run. " +
        "Do NOT use this tool for Fetch Test Case Executions — that tool calls metadata internally and returns testRunUdfs on every execution row; use that data directly. " +
        "Do NOT use this tool for Fetch Issue Executions; that tool already reads udfjson and enriches it with metadata.",
    ),
  sourceRows: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      "Optional rows already returned by Fetch Test Case Runs by Test Suite Run. " +
        "The UDF tool will reuse these rows, enrich/pivot UDF values, and preserve identification fields instead of making the same execution-list API call again. " +
        "Do NOT pass Fetch Test Case Executions rows here — those rows already have testRunUdfs enriched. " +
        "Do not pass issue execution rows here; use Fetch Issue Executions output directly for issue UDFs.",
    ),
  startIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Zero-based start index for pagination (default: 0)."),
  size: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(50)
    .describe("Number of test case runs to return per page (default: 50)."),
});
