import { z } from "zod";
import { CommonFields, DEFAULT_PAGINATION } from "./common";

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

export interface CreateUdfPayload {
  fieldTypeID: number;
  name: string;
  label: string;
  fieldLength?: number;
  lookuplistId?: number;
  modules: number[];
  mandatory?: boolean;
  listValues?: UdfListValue[];
  defaultValue?: string | number | number[] | null;
  defaultChildValue?: number[];
  scopeId?: number;
  orgCode?: string;
}

export interface FetchCustomListsPayload {
  start?: number;
  page?: number;
  limit?: number;
  filter?: string;
  listName?: string;
  scopeId?: number;
  orgCode?: string;
}

export interface FetchCustomListItemsPayload {
  listId: number;
  scopeId?: number;
  orgCode?: string;
}

export interface FetchUdfFieldTypesPayload {
  scopeId?: number;
  orgCode?: string;
}

export const DEFAULT_FETCH_CUSTOM_LISTS_PAYLOAD: Omit<
  FetchCustomListsPayload,
  "scopeId" | "orgCode"
> = {
  ...DEFAULT_PAGINATION,
  limit: 50,
};

export const CreateUdfArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
  baseUrl: CommonFields.baseUrl,
  fieldTypeID: z
    .number()
    .int()
    .min(1)
    .max(7)
    .describe(
      "Field type numeric ID. Supported types:\n" +
        "1 = DATETIMEPICKER - date/time selection calendar\n" +
        "2 = LARGETEXT - multi-line text input\n" +
        "3 = LOOKUPLIST - single-select custom list (requires lookuplistId)\n" +
        "4 = MULTILOOKUPLIST - multi-select custom list (requires lookuplistId)\n" +
        "5 = NUMBER - numeric input\n" +
        "6 = STRING - single-line text (use fieldLength to cap characters)\n" +
        "7 = CASCADINGLIST - hierarchical single-select (requires lookuplistId)",
    ),
  name: z
    .string()
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Field name can only contain alphanumeric characters and underscore.",
    )
    .describe(
      "Internal field name — ONLY alphanumeric characters and underscore allowed " +
        "(e.g. 'my_field_1'). Spaces or special characters will cause an API error.",
    ),
  label: z
    .string()
    .describe("Display label shown in the QMetry UI for this field."),
  fieldLength: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Maximum character length for STRING (fieldTypeID=6) fields. " +
        "Not applicable for other field types.",
    ),
  lookuplistId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Required for LOOKUPLIST (3), MULTILOOKUPLIST (4), and CASCADINGLIST (7). " +
        "Use the 'Fetch Custom Lists' tool to retrieve available list IDs.",
    ),
  modules: z
    .array(z.number().int())
    .min(1)
    .describe(
      "Array of module IDs to associate this UDF with. Supported modules:\n" +
        "1 = Requirement\n" +
        "3 = Test Case\n" +
        "5 = Test Step\n" +
        "6 = Test Suite\n" +
        "11 = Issue\n" +
        "32 = Test Run",
    ),
  mandatory: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether this field is mandatory in the specified modules (default: false).",
    ),
  listValues: z
    .array(
      z.object({
        id: z.number().int().describe("List item ID from the custom list."),
        name: z.string().describe("List item display name."),
        projectID: z
          .number()
          .int()
          .describe("Project ID the list item belongs to."),
      }),
    )
    .optional()
    .describe(
      "Optional: pre-selected list items to associate with this field in the project. " +
        "For CASCADINGLIST fields, provide the parent list items here. " +
        "Obtain item IDs from the custom list linked via lookuplistId.",
    ),
  defaultValue: z
    .union([z.string(), z.number(), z.array(z.number().int())])
    .nullable()
    .optional()
    .describe(
      "Optional default value for the field. Type depends on fieldTypeID:\n" +
        "STRING (6): plain string, e.g. 'my default text'\n" +
        "NUMBER (5): plain number, e.g. 42\n" +
        "LOOKUPLIST (3): array of one item ID, e.g. [5173520] — also provide listValues\n" +
        "MULTILOOKUPLIST (4): array of item IDs, e.g. [5173521] — also provide listValues\n" +
        "CASCADINGLIST (7): array of parent item ID, e.g. [5126498] — also provide listValues and defaultChildValue\n" +
        "LARGETEXT (2): NOT supported — omit this field\n" +
        "DATETIMEPICKER (1): NOT supported — omit this field",
    ),
  defaultChildValue: z
    .array(z.number().int())
    .optional()
    .describe(
      "CASCADINGLIST only: array of default child item IDs selected under the defaultValue parent. " +
        "Example: [5126499]",
    ),
});

export const FetchCustomListsArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
  baseUrl: CommonFields.baseUrl,
  listName: z
    .string()
    .optional()
    .describe(
      "Optional: filter results by list name (partial match). " +
        "Leave empty to retrieve all custom lists in the project.",
    ),
  start: CommonFields.start,
  page: CommonFields.page,
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Number of records per page (default: 50)."),
});

export const FetchCustomListItemsArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
  baseUrl: CommonFields.baseUrl,
  listId: z
    .number()
    .int()
    .positive()
    .describe(
      "The numeric ID of the custom list to fetch items for. " +
        "Use the 'Fetch Custom Lists' tool to get this ID (the 'Id' field in the response).",
    ),
});

export const FetchUdfFieldTypesArgsSchema = z.object({
  projectKey: CommonFields.projectKey,
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
