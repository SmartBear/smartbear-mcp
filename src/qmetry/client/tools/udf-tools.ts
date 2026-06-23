import { QMetryToolsHandlers } from "../../config/constants";
import {
  BulkUpdateTestRunUdfsArgsSchema,
  // CreateUdfArgsSchema, // TODO: Deferred to next release
  // FetchCustomListItemsArgsSchema,
  // FetchCustomListsArgsSchema,
  FetchTestRunUdfMetadataArgsSchema,
  FetchTestRunUdfValuesArgsSchema,
  // FetchUdfFieldTypesArgsSchema, // TODO: Deferred to next release
  // FetchUdfModulesArgsSchema, // TODO: Deferred to next release
} from "../../types/udf";
import type { QMetryToolParams } from "./types";

export const UDF_TOOLS: QMetryToolParams[] = [
  /* TODO: Deferred to next release — Create UDF and its dedicated support tools
  {
    title: "Create User Defined Field",
    toolset: "UDF",
    summary:
      "Create a new User Defined Field (custom field / UDF) for one or more modules in a QMetry project.",
    handler: QMetryToolsHandlers.CREATE_UDF,
    inputSchema: CreateUdfArgsSchema,
    purpose:
      "Creates a new User Defined Field (also called UDF, custom field, or user-defined field) " +
      "in QMetry and associates it with the specified modules in the current project. " +
      "Supports all 7 field types: STRING, LARGETEXT, NUMBER, DATETIMEPICKER, LOOKUPLIST, MULTILOOKUPLIST, and CASCADINGLIST. " +
      "For LOOKUPLIST, MULTILOOKUPLIST, and CASCADINGLIST types, a lookuplistId is required — " +
      "use the 'Fetch Custom Lists' tool to retrieve available list IDs. " +
      "Field names must contain only alphanumeric characters and underscores.",
    useCases: [
      "Create a string custom field for Test Case module",
      "Create a large text UDF for Test Run and Test Suite modules",
      "Create a lookup list custom field linked to an existing custom list",
      "Create a multi-select lookup UDF for the Requirement module",
      "Create a number field for Issue tracking",
      "Create a date picker UDF for Test Step module",
      "Create a cascading list custom field for any module",
      "Add the same UDF to multiple modules at once",
    ],
    examples: [
      {
        description:
          "Create a STRING UDF for Test Case module with max 50 chars",
        parameters: {
          fieldTypeID: 6,
          name: "test_env",
          label: "Test Environment",
          fieldLength: 50,
          modules: [3],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description:
          "Create a LARGETEXT UDF for Test Run and Test Case modules",
        parameters: {
          fieldTypeID: 2,
          name: "notes_field",
          label: "Notes",
          modules: [32, 3],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description: "Create a NUMBER UDF for Test Step module",
        parameters: {
          fieldTypeID: 5,
          name: "step_weight",
          label: "Step Weight",
          modules: [5],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description: "Create a DATETIMEPICKER UDF for Requirement module",
        parameters: {
          fieldTypeID: 1,
          name: "due_date",
          label: "Due Date",
          modules: [1],
          mandatory: true,
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description:
          "Create a LOOKUPLIST UDF for Test Suite — lookuplistId from Fetch Custom Lists",
        parameters: {
          fieldTypeID: 3,
          name: "priority_list",
          label: "Priority List",
          lookuplistId: 2398198,
          modules: [6],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description: "Create a MULTILOOKUPLIST UDF for Issue module",
        parameters: {
          fieldTypeID: 4,
          name: "affected_areas",
          label: "Affected Areas",
          lookuplistId: 2398201,
          modules: [11],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description:
          "Create a CASCADINGLIST UDF for Test Run and Test Case modules",
        parameters: {
          fieldTypeID: 7,
          name: "region_cascade",
          label: "Region",
          lookuplistId: 2381192,
          modules: [32, 3],
        },
        expectedOutput: "User defined field created successfully.",
      },
      {
        description:
          "Create a CASCADINGLIST UDF with default parent and child values pre-selected",
        parameters: {
          fieldTypeID: 7,
          name: "cascade_mcp2",
          label: "cascade_mcp2",
          lookuplistId: 2381199,
          modules: [32],
          listValues: [
            { id: 5126498, name: "abc", projectID: 42307 },
            { id: 5126500, name: "vkc", projectID: 42307 },
          ],
          defaultValue: [5126498],
          defaultChildValue: [5126499],
        },
        expectedOutput:
          "User defined field created successfully with default cascade selection.",
      },
      {
        description: "Create a STRING UDF with a default value (plain string)",
        parameters: {
          fieldTypeID: 6,
          name: "test",
          label: "test",
          fieldLength: 20,
          modules: [32],
          defaultValue: "testing default valu",
        },
        expectedOutput:
          "User defined field created successfully with default string value.",
      },
      {
        description: "Create a NUMBER UDF with a default numeric value",
        parameters: {
          fieldTypeID: 5,
          name: "num",
          label: "num",
          modules: [32],
          defaultValue: 11,
        },
        expectedOutput:
          "User defined field created successfully with default number value.",
      },
      {
        description:
          "Create a LOOKUPLIST UDF with a default list item pre-selected",
        parameters: {
          fieldTypeID: 3,
          name: "lookup00",
          label: "lookup00",
          lookuplistId: 2398206,
          modules: [32],
          listValues: [{ id: 5173520, name: "t", projectID: 42307 }],
          defaultValue: [5173520],
        },
        expectedOutput:
          "User defined field created successfully with default lookup selection.",
      },
      {
        description:
          "Create a MULTILOOKUPLIST UDF with a default item pre-selected",
        parameters: {
          fieldTypeID: 4,
          name: "multo",
          label: "multo",
          lookuplistId: 2398198,
          modules: [32],
          listValues: [
            { id: 5173521, name: "aa", projectID: 1250 },
            { id: 5173522, name: "bb", projectID: 1250 },
          ],
          defaultValue: [5173521],
        },
        expectedOutput:
          "User defined field created successfully with default multi-lookup selection.",
      },
      {
        description: "Create a mandatory STRING UDF for multiple modules",
        parameters: {
          fieldTypeID: 6,
          name: "build_version",
          label: "Build Version",
          fieldLength: 100,
          modules: [3, 6, 32],
          mandatory: true,
        },
        expectedOutput: "User defined field created successfully.",
      },
    ],
    hints: [
      "NEVER call 'Fetch UDF Field Types' to look up fieldTypeID. " +
        "All supported field types and their IDs are already listed in this tool's hints under FIELD TYPES AND IDs. " +
        "Use those values directly without any additional API call.",
      "FIELD NAME RULE: 'name' must contain ONLY alphanumeric characters and underscores (a-z, A-Z, 0-9, _). " +
        "Spaces or special characters will cause an API error. Examples: 'my_field', 'testEnv1', 'udf_str'.",
      "FIELD TYPES AND IDs:\n" +
        "  1 = DATETIMEPICKER (no extra params needed)\n" +
        "  2 = LARGETEXT (no extra params needed)\n" +
        "  3 = LOOKUPLIST (requires lookuplistId)\n" +
        "  4 = MULTILOOKUPLIST (requires lookuplistId)\n" +
        "  5 = NUMBER (no extra params needed)\n" +
        "  6 = STRING (use fieldLength to set max characters)\n" +
        "  7 = CASCADINGLIST (requires lookuplistId)",
      "MODULE IDs:\n" +
        "  1 = Requirement\n" +
        "  3 = Test Case\n" +
        "  5 = Test Step\n" +
        "  6 = Test Suite\n" +
        "  11 = Issue\n" +
        "  32 = Test Run",
      "LOOKUP TYPES: For fieldTypeID 3 (LOOKUPLIST), 4 (MULTILOOKUPLIST), or 7 (CASCADINGLIST), " +
        "you MUST provide lookuplistId. First call the 'Fetch Custom Lists' tool to find available lists " +
        "and use the 'Id' field from the response as lookuplistId.",
      "STRING fieldLength: If user does not specify fieldLength, default to 10. Always include fieldLength for STRING fields.",
      "DEFAULT VALUE SUPPORT — which field types support defaultValue at creation time:\n" +
        "  ✅ STRING (6): plain string value, e.g. defaultValue: 'my default text'\n" +
        "  ✅ NUMBER (5): plain number value, e.g. defaultValue: 42\n" +
        "  ✅ LOOKUPLIST (3): array of one item ID + listValues required, e.g. defaultValue: [5173520], listValues: [{id:5173520,name:'t',projectID:42307}]\n" +
        "  ✅ MULTILOOKUPLIST (4): array of item IDs + listValues required, e.g. defaultValue: [5173521], listValues: [{id:5173521,name:'aa',projectID:1250}]\n" +
        "  ✅ CASCADINGLIST (7): defaultValue (parent ID array) + defaultChildValue (child ID array) + listValues required\n" +
        "  ❌ LARGETEXT (2): defaultValue NOT supported — do not include it\n" +
        "  ❌ DATETIMEPICKER (1): defaultValue NOT supported — do not include it",
      "DEFAULT VALUES (LOOKUPLIST / MULTILOOKUPLIST / CASCADINGLIST only): " +
        "ONLY when fieldTypeID is 3, 4, or 7 AND user wants a default value pre-selected — " +
        "call 'Fetch Custom List Items' FIRST to get item IDs, THEN call this tool. " +
        "Do NOT call 'Fetch Custom List Items' for STRING (6), NUMBER (5), LARGETEXT (2), DATETIMEPICKER (1), " +
        "or for any lookup field where user did NOT request a default value. " +
        "Response 'Id' (capital I) → use in defaultValue array and listValues[].id. " +
        "Response 'Name' → use in listValues[].name. Never guess or fabricate item IDs.",
      "DEFAULT VALUES (CASCADINGLIST): Provide defaultValue (parent item ID array), defaultChildValue (child item ID array), " +
        "and listValues (parent list items). Example: listValues=[{id:5126498,name:'abc',projectID:42307}], " +
        "defaultValue=[5126498], defaultChildValue=[5126499].",
      "PROJECT CONTEXT: The tool automatically resolves the numeric project ID from the current session context. " +
        "If project context is not set, call 'Set Project Info' first or ensure projectKey is provided.",
      "If the user refers to 'custom fields', 'user defined fields', or 'UDFs', treat all as the same concept.",
      "If user specifies a module by name (e.g. 'Test Run'), map it to the correct moduleID (32) before calling the tool.",
      "If user specifies a field type by name (e.g. 'large text field', 'lookup list'), map it to the correct fieldTypeID.",
    ],
    outputDescription:
      "JSON object with success status and confirmation message when UDF is created.",
    readOnly: false,
    destructive: false,
    idempotent: false,
  },
  */
  // {
  //   title: "Fetch Custom Lists",
  //   toolset: "UDF",
  //   summary:
  //     "Fetch custom lists (lookup lists) available in the project. Use to get lookuplistId for LOOKUPLIST, MULTILOOKUPLIST, or CASCADINGLIST UDFs.",
  //   handler: QMetryToolsHandlers.FETCH_CUSTOM_LISTS,
  //   inputSchema: FetchCustomListsArgsSchema,
  //   purpose:
  //     "Retrieves the custom lists defined in the QMetry project. " +
  //     "These lists are required when creating LOOKUPLIST (3), MULTILOOKUPLIST (4), " +
  //     "or CASCADINGLIST (7) User Defined Fields. " +
  //     "The 'Id' field from the response is used as 'lookuplistId' when creating UDFs. " +
  //     "Supports optional filtering by list name and pagination.",
  //   useCases: [
  //     "Get all custom lists available in the current project",
  //     "Search for a specific custom list by name to get its ID",
  //     "Retrieve lookup list IDs before creating a LOOKUPLIST UDF",
  //     "Paginate through large numbers of custom lists",
  //   ],
  //   examples: [
  //     {
  //       description: "Get all custom lists in current project",
  //       parameters: {},
  //       expectedOutput:
  //         "List of all custom lists with Id, Listname, fieldName, noofitems, and listType.",
  //     },
  //     {
  //       description: "Search for a custom list by name",
  //       parameters: { listName: "Card Type" },
  //       expectedOutput:
  //         "Custom lists matching 'Card Type' with their Ids for use in UDF creation.",
  //     },
  //     {
  //       description: "Paginate through custom lists",
  //       parameters: { start: 0, page: 1, limit: 20 },
  //       expectedOutput: "First 20 custom lists in the project.",
  //     },
  //   ],
  //   hints: [
  //     "Use the 'Id' field from the response as 'lookuplistId' when calling 'Create User Defined Field'.",
  //     "Filter by listName for a faster, targeted search when you know the list name.",
  //     "The 'Listname' field is the human-readable name; 'fieldName' is the internal name.",
  //   ],
  //   outputDescription:
  //     "JSON object with 'data' array containing custom lists (Id, Listname, fieldName, noofitems, listType, isEditable).",
  //   readOnly: true,
  //   idempotent: true,
  //   openWorld: false,
  // },
  // {
  //   title: "Fetch Custom List Items",
  //   toolset: "UDF",
  //   summary:
  //     "Fetch the items (values) within a specific custom list by its ID. Returns item IDs and names needed to set default values when creating LOOKUPLIST, MULTILOOKUPLIST, or CASCADINGLIST UDFs.",
  //   handler: QMetryToolsHandlers.FETCH_CUSTOM_LIST_ITEMS,
  //   inputSchema: FetchCustomListItemsArgsSchema,
  //   purpose:
  //     "Retrieves the individual items stored in a QMetry custom list. " +
  //     "Call this ONLY when creating a LOOKUPLIST (3), MULTILOOKUPLIST (4), or CASCADINGLIST (7) UDF " +
  //     "AND the user wants a default value pre-selected. " +
  //     "Do NOT call for STRING, NUMBER, LARGETEXT, DATETIMEPICKER, or lookup fields with no default value requested. " +
  //     "Returns item 'Id' (capital I) and 'Name' — used in defaultValue array and listValues.",
  //   useCases: [
  //     "Get item IDs from a lookup list before creating a UDF with a default value",
  //     "List all options in a custom list to let the user pick a default",
  //     "Retrieve listValues needed for LOOKUPLIST or MULTILOOKUPLIST UDF creation",
  //     "Find specific item IDs by name to pre-select as UDF defaults",
  //   ],
  //   examples: [
  //     {
  //       description: "Get all items in custom list with ID 2385633",
  //       parameters: { listId: 2385633 },
  //       expectedOutput:
  //         "{ data: [{ Id: 5173524, Name: 'aa', Alias: 'aa', isArchived: false, ... }], total: 1, fieldName: 'PortalSelectList' }",
  //     },
  //   ],
  //   hints: [
  //     "Call 'Fetch Custom Lists' first to get the listId (the 'Id' field in that response).",
  //     "Response 'data' array: each item has 'Id' (capital I — use this in defaultValue and listValues[].id) and 'Name' (use in listValues[].name).",
  //     "MANDATORY WORKFLOW for creating LOOKUPLIST/MULTILOOKUPLIST/CASCADINGLIST with a default value: " +
  //       "1) Fetch Custom Lists → get lookuplistId. " +
  //       "2) Fetch Custom List Items (this tool) with that listId → get item Id and Name. " +
  //       "3) Create User Defined Field using lookuplistId, listValues:[{id:<Id>,name:<Name>,projectID:<projectID>}], defaultValue:[<Id>].",
  //     "projectID in listValues: use the numeric project ID from the current session context (same scopeId used elsewhere).",
  //   ],
  //   outputDescription:
  //     "JSON object with 'data' array of list items. Each item has 'Id' (numeric — use in defaultValue/listValues), 'Name', 'Alias', 'isArchived', 'isLocked', 'createdDate'. Also returns 'total' count and 'fieldName'.",
  //   readOnly: true,
  //   idempotent: true,
  //   openWorld: false,
  // },
  /* TODO: Deferred to next release — Fetch UDF Field Types and Fetch UDF Modules (only used for Create UDF flow)
  {
    title: "Fetch UDF Field Types",
    toolset: "UDF",
    summary:
      "Fetch available UDF field types supported in QMetry. Returns field type IDs, names, and descriptions.",
    handler: QMetryToolsHandlers.FETCH_UDF_FIELD_TYPES,
    inputSchema: FetchUdfFieldTypesArgsSchema,
    purpose:
      "Returns the list of User Defined Field types supported in QMetry. " +
      "Uses the built-in constant as the source of truth and merges any new types " +
      "returned from the API that are not yet in the constant. " +
      "Useful for discovering which field types are available before creating a UDF.",
    useCases: [
      "List all supported UDF field types with their IDs",
      "Check if a specific field type is supported",
      "Get field type descriptions to help users understand options",
    ],
    examples: [
      {
        description: "Get all supported UDF field types",
        parameters: {},
        expectedOutput:
          "Array of field types with Id, Fieldtype name, and Description.",
      },
    ],
    hints: [
      "DO NOT call this tool when the purpose is to get a fieldTypeID for 'Create User Defined Field'. " +
        "The 'Create User Defined Field' tool already lists all 7 field types and their IDs inline. " +
        "Only call this tool if the user explicitly asks to list or discover UDF field types.",
      "Use the 'Id' from the response as 'fieldTypeID' when calling 'Create User Defined Field'.",
      "Field types 3, 4, and 7 (LOOKUPLIST, MULTILOOKUPLIST, CASCADINGLIST) require a lookuplistId.",
      "Field type 6 (STRING) supports an optional fieldLength parameter.",
    ],
    outputDescription:
      "Array of field type objects with Id, Fieldtype (name), Description, and Preview fields.",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch UDF Modules",
    toolset: "UDF",
    summary:
      "Fetch all QMetry modules that support User Defined Fields (UDFs). Returns module IDs and names. Use to get the correct module ID before creating a UDF.",
    handler: QMetryToolsHandlers.FETCH_UDF_MODULES,
    inputSchema: FetchUdfModulesArgsSchema,
    purpose:
      "Returns the list of QMetry modules that support UDFs, served from built-in constants. " +
      "No API call is made. Use the 'id' from the response as the module ID when creating a User Defined Field.",
    useCases: [
      "List all modules that support UDFs",
      "Get the numeric module ID for a module name (e.g. 'Test Run' → 32)",
      "Confirm which module ID to use before calling 'Create User Defined Field'",
    ],
    examples: [
      {
        description: "Get all UDF-supported modules",
        parameters: {},
        expectedOutput:
          "Array of modules: [{id:1,name:'Requirement'},{id:3,name:'Test Case'},{id:5,name:'Test Step'},{id:6,name:'Test Suite'},{id:11,name:'Issue'},{id:32,name:'Test Run'}]",
      },
    ],
    hints: [
      "NEVER call this tool when you already know the module ID — the 'Create User Defined Field' tool lists all module IDs inline in its hints. Only call this tool if the user explicitly asks to list modules or if you need to confirm a module ID.",
      "Use the 'id' field from the response as the 'modules' array value when calling 'Create User Defined Field'.",
      "Module IDs are fixed constants: 1=Requirement, 3=Test Case, 5=Test Step, 6=Test Suite, 11=Issue, 32=Test Run.",
    ],
    outputDescription:
      "Array of module objects with 'id' (numeric module ID) and 'name' (module display name).",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  */
  {
    title: "Bulk Update Test Run UDFs",
    toolset: "UDF",
    summary:
      "Bulk update User Defined Field (UDF) values for one or more Test Case Runs in a test execution. Runs asynchronously in the background.",
    handler: QMetryToolsHandlers.BULK_UPDATE_TEST_RUN_UDFS,
    inputSchema: BulkUpdateTestRunUdfsArgsSchema,
    purpose:
      "Updates UDF (custom field) values for one or more Test Case Runs in bulk. " +
      "Supports all UDF field types: STRING, NUMBER, DATETIMEPICKER, LOOKUPLIST (single select), " +
      "MULTILOOKUPLIST (multi-select), and CASCADINGLIST (parent/child). " +
      "For MULTILOOKUPLIST fields, use 'append' to add values to existing selections or " +
      "'replace' to overwrite existing selections with the new values. " +
      "The operation runs asynchronously in QMetry's background — " +
      "track progress under 'Scheduled Task' in the QMetry UI. " +
      "All UDF fields in the payload are optional — include only the fields you want to update.",
    useCases: [
      "Bulk update a string UDF (e.g. build version, environment name) for multiple test runs",
      "Set a date UDF field (e.g. execution date) across multiple test case runs",
      "Update a numeric UDF field (e.g. story points, priority score) in bulk",
      "Set a single-select lookup UDF to a new value for multiple runs",
      "Append new values to a multi-select UDF field across multiple test runs",
      "Replace all existing selections in a multi-select UDF with new values",
      "Update a cascading list UDF (parent + child) for multiple test runs",
      "Update multiple UDF fields of different types in a single bulk operation",
      "Reset a UDF field value for all runs in a test suite execution",
      "Sync automated test result metadata (environment, build, platform) into UDF fields after execution",
    ],
    examples: [
      {
        description: "Bulk update a STRING UDF for multiple test runs",
        parameters: {
          tcRunIDs: [41572006, 41572009, 41572013],
          UDF: {
            "8190_String": {
              fieldID: 229241,
              value: "regression-v2.1",
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background. Go to 'Scheduled Task' to track the process.",
      },
      {
        description:
          "Bulk update a DATE UDF field for multiple test runs (MM-DD-YYYY format)",
        parameters: {
          tcRunIDs: [41572006, 41572009],
          UDF: {
            KN_DATE: {
              fieldID: 229255,
              value: "06-20-2026",
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description: "Bulk update a NUMBER UDF field for multiple test runs",
        parameters: {
          tcRunIDs: [41572006, 41572009, 41572013, 41572015],
          UDF: {
            defaultNum: {
              fieldID: 229003,
              value: 5,
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description:
          "Bulk update a single-select LOOKUPLIST UDF for multiple test runs",
        parameters: {
          tcRunIDs: [41572006, 41572009],
          UDF: {
            "8260LUP": {
              fieldID: 228563,
              value: 5108697,
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description:
          "Bulk update a MULTILOOKUPLIST UDF — APPEND new values to existing selections",
        parameters: {
          tcRunIDs: [41572006, 41572009, 41572013],
          UDF: {
            m_selections: {
              fieldID: 229223,
              value: [5158524, 5158525],
              multiSelectAction: "append",
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description:
          "Bulk update a MULTILOOKUPLIST UDF — REPLACE existing selections with new values",
        parameters: {
          tcRunIDs: [41572006, 41572009],
          UDF: {
            mullt_env: {
              fieldID: 229425,
              value: [5108697, 5108698],
              multiSelectAction: "replace",
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description:
          "Bulk update a CASCADINGLIST UDF (parent + child) for multiple test runs",
        parameters: {
          tcRunIDs: [41572006, 41572009, 41572013],
          UDF: {
            cascade_mcp: {
              fieldID: 229426,
              value: { parent: 5126498, child: 5126499 },
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background.",
      },
      {
        description:
          "Bulk update multiple UDF fields of different types in a single operation",
        parameters: {
          tcRunIDs: [41572006, 41572009, 41572013, 41572015, 41579875],
          UDF: {
            "8190_String": {
              fieldID: 229241,
              value: "smoke-test",
            },
            KN_DATE: {
              fieldID: 229255,
              value: "06-20-2026",
            },
            defaultNum: {
              fieldID: 229003,
              value: 3,
            },
            "8260LUP": {
              fieldID: 228563,
              value: 5108697,
            },
            m_selections: {
              fieldID: 229223,
              value: [5158524, 5158525],
              multiSelectAction: "append",
            },
            mullt_env: {
              fieldID: 229425,
              value: [5108697, 5108698],
              multiSelectAction: "replace",
            },
            cascade_mcp: {
              fieldID: 229426,
              value: { parent: 5126498, child: 5126499 },
            },
          },
        },
        expectedOutput:
          "Bulk updates to execution UDF values will run in the background. Go to 'Scheduled Task' to track the process.",
      },
    ],
    hints: [
      "REQUIRED: 'tcRunIDs' must be a non-empty array of numeric Test Case Run IDs. " +
        "Get IDs from 'Fetch Test Case Runs by Test Suite Run' tool → data[<index>].tcRunID.",
      "REQUIRED: 'UDF' must be an object with at least one field entry. " +
        "Each key is the UDF field name; each value has 'fieldID' and 'value'.",
      "VALUE FORMATS by field type:\n" +
        "  STRING: plain string, e.g. 'regression-build'\n" +
        "  NUMBER: number, e.g. 3\n" +
        "  DATETIMEPICKER: date string in MM-DD-YYYY format, e.g. '06-20-2026'\n" +
        "  LOOKUPLIST (single select): numeric item ID, e.g. 5108697\n" +
        "  MULTILOOKUPLIST (multi-select): array of item IDs, e.g. [5158524, 5158525]\n" +
        "  CASCADINGLIST: object with parent and child keys, e.g. {parent: 5126498, child: 5126499}",
      "MULTILOOKUPLIST — multiSelectAction rules:\n" +
        "  'append' (default): new values are ADDED to existing selections. Use when user says 'add', 'include', 'append'.\n" +
        "  'replace': existing selections are CLEARED and replaced with only the new values. Use when user says 'replace', 'set to', 'overwrite', 'change to'.\n" +
        "  If user does not specify, ALWAYS default to 'append'. Never assume 'replace'.",
      "MULTILOOKUPLIST — apply multiSelectAction per field individually. " +
        "Different multi-select fields in the same request can have different multiSelectAction values.",
      "DATE FORMAT: Always use MM-DD-YYYY format for DATETIMEPICKER fields (e.g. '06-20-2026', not '2026-06-20'). " +
        "Convert from any user-supplied date format before calling the tool.",
      "ASYNC OPERATION: This API runs in the background. " +
        "The success response means the job was queued, not that it completed. " +
        "Tell the user to check 'Scheduled Task' in QMetry UI to track completion.",
      "CRITICAL — FIELD IDs: The 'fieldID' for each UDF entry MUST be the exact numeric ID from QMetry's UDF definition — " +
        "do NOT guess, infer, or fabricate fieldIDs. " +
        "If the user has not provided a fieldID, ask the user to supply it or look it up in QMetry admin settings before calling this tool. " +
        "Using a wrong fieldID will silently fail or update the wrong field.",
      "CRITICAL — WORKFLOW: When user asks to bulk-update a UDF across all executions of a test suite run " +
        "(e.g. tsRunID 731600), ALWAYS call 'Fetch Test Case Runs by Test Suite Run' first with that tsRunID " +
        "to collect ALL tcRunIDs from the response (data[].tcRunID), THEN call this tool. " +
        "Never skip the fetch step or hard-code tcRunIDs.",
      "ALL UDF FIELDS ARE OPTIONAL: Only include the UDF fields the user wants to update. Do not include fields with no change.",
      "tcRunIDs vs entityIDs: This tool uses 'tcRunIDs' (array of numbers). " +
        "Do NOT confuse with 'Bulk Update Test Case Execution Status' which uses 'entityIDs' (comma-separated string).",
    ],
    outputDescription:
      "JSON object with success status, code 'CO.BULK_TC_EXECUTION_UDF_UPDATE_STARTED', and message confirming the background job was queued.",
    readOnly: false,
    destructive: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Run UDF Metadata",
    toolset: "UDF",
    summary:
      "Fetch the metadata (field definitions) for all Test Run UDF (User Defined Fields) configured in this QMetry project. " +
      "Returns each field's name, display label, type, and numeric fieldID (projectUserFieldID) required for bulk updates.",
    handler: QMetryToolsHandlers.FETCH_TEST_RUN_UDF_METADATA,
    inputSchema: FetchTestRunUdfMetadataArgsSchema,
    purpose:
      "Retrieves the full list of Test Run UDF field definitions from QMetry's admin metadata endpoint. " +
      "The response includes each field's projectUserFieldID (used as 'fieldID' in Bulk Update Test Run UDFs), " +
      "field name, display label, field type, and lookup list options for multi-select fields. " +
      "Call this tool BEFORE 'Bulk Update Test Run UDFs' when the user does not know the numeric fieldID for a UDF.",
    useCases: [
      "Get the fieldID for 'planned_execution_date' before bulk updating it",
      "List all available Test Run UDF fields and their types in the project",
      "Find the lookup list item IDs for a LOOKUPLIST or MULTILOOKUPLIST Test Run UDF",
      "Discover UDF field names and IDs when user says 'what Test Run UDF fields are available'",
    ],
    examples: [
      {
        description: "List all Test Run UDF fields in the project",
        parameters: {},
        expectedOutput:
          "Array of fields with fieldID, name, label, fieldType, and lookupOptions for list-based fields.",
      },
    ],
    hints: [
      "ALWAYS call this tool before 'Bulk Update Test Run UDFs' when the user has not explicitly provided a numeric fieldID. " +
        "The 'fieldID' in the bulk update corresponds to 'projectUserFieldID' in this response.",
      "This tool is the authoritative source of fieldIDs for all Test Run UDF fields — do NOT guess or hard-code fieldIDs.",
      "For LOOKUPLIST and MULTILOOKUPLIST fields, the response 'lookupOptions' contains the valid item IDs and labels to use as values in bulk updates.",
      "DATE fields use MM-DD-YYYY format (e.g. '06-23-2026') when setting values via Bulk Update Test Run UDFs.",
    ],
    outputDescription:
      "JSON object with 'fields' array (each item has fieldID, name, label, fieldType, allowBlank, and optional listName/listMasterID) " +
      "and 'lookupOptions' map for list-based fields.",
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
  {
    title: "Fetch Test Run UDF Values",
    toolset: "UDF",
    summary:
      "Fetch the Test Run UDF (User Defined Field) values for all test case runs in a given test suite run. " +
      "Returns each run's UDF values enriched with field label and type information from metadata.",
    handler: QMetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES,
    inputSchema: FetchTestRunUdfValuesArgsSchema,
    purpose:
      "Retrieves the test case runs for a test suite run and extracts their Test Run UDF field values. " +
      "Internally checks the 'hasTcRunUdf' flag — if UDFs are configured, it also calls the metadata API " +
      "to enrich each run's UDF values with field label, type, and numeric fieldID. " +
      "Use this tool when the user asks to view, list, or inspect UDF values on specific test executions.",
    useCases: [
      "Show me the UDF values for all runs in test suite run 731600",
      "What is the planned execution date set on each run in this test cycle?",
      "List the Test Run UDF values for test suite run 87039",
      "Fetch test run UDFs of executions for tsRunID 731600",
    ],
    examples: [
      {
        description: "Fetch UDF values for all runs in test suite run 731600",
        parameters: {
          tsrunID: "731600",
        },
        expectedOutput:
          "JSON with hasTcRunUdf, total, runs (each with tcRunID, entityKey, summary, runStatus, testRunUdfs array), " +
          "and availableUdfFields listing all configured UDF fields with their fieldIDs.",
      },
    ],
    hints: [
      "Use 'tsrunID' from the 'Fetch Executions by Test Suite' tool (data[<index>].tsRunID field).",
      "'viewId' is auto-resolved from latestViews.TE.viewId — leave blank unless explicitly overriding.",
      "If 'hasTcRunUdf' is false in the response, no Test Run UDFs are configured for this project.",
      "The 'testRunUdfs' array on each run contains enriched UDF values with label and fieldID — use fieldID from here when calling 'Bulk Update Test Run UDFs'.",
      "This tool calls both the execution list API and the UDF metadata API internally — no need to call 'Fetch Test Run UDF Metadata' separately when viewing values.",
    ],
    outputDescription:
      "JSON with hasTcRunUdf boolean, total count, runs array (each with tcRunID, entityKey, summary, runStatus, testRunUdfs), " +
      "and availableUdfFields array describing all UDF fields in the project.",
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
];
