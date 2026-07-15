import { QMetryToolsHandlers } from "../../config/constants.ts";
import {
  BulkUpdateTestRunUdfsArgsSchema,
  FetchCascadeChildValuesArgsSchema,
  FetchTestRunUdfMetadataArgsSchema,
  FetchTestRunUdfValuesArgsSchema,
} from "../../types/udf.ts";
import type { QMetryToolParams } from "./types.ts";

export const UDF_TOOLS: QMetryToolParams[] = [
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
          tcRunIDs: [41_572_006, 41_572_009, 41_572_013],
          UDF: {
            "8190_String": {
              fieldID: 229_241,
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
          tcRunIDs: [41_572_006, 41_572_009],
          UDF: {
            KN_DATE: {
              fieldID: 229_255,
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
          tcRunIDs: [41_572_006, 41_572_009, 41_572_013, 41_572_015],
          UDF: {
            defaultNum: {
              fieldID: 229_003,
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
          tcRunIDs: [41_572_006, 41_572_009],
          UDF: {
            "8260LUP": {
              fieldID: 228_563,
              value: 5_108_697,
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
          tcRunIDs: [41_572_006, 41_572_009, 41_572_013],
          UDF: {
            m_selections: {
              fieldID: 229_223,
              value: [5_158_524, 5_158_525],
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
          tcRunIDs: [41_572_006, 41_572_009],
          UDF: {
            mullt_env: {
              fieldID: 229_425,
              value: [5_108_697, 5_108_698],
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
          tcRunIDs: [41_572_006, 41_572_009, 41_572_013],
          UDF: {
            cascade_mcp: {
              fieldID: 229_426,
              value: { parent: 5_126_498, child: 5_126_499 },
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
          tcRunIDs: [
            41_572_006, 41_572_009, 41_572_013, 41_572_015, 41_579_875,
          ],
          UDF: {
            "8190_String": {
              fieldID: 229_241,
              value: "smoke-test",
            },
            KN_DATE: {
              fieldID: 229_255,
              value: "06-20-2026",
            },
            defaultNum: {
              fieldID: 229_003,
              value: 3,
            },
            "8260LUP": {
              fieldID: 228_563,
              value: 5_108_697,
            },
            m_selections: {
              fieldID: 229_223,
              value: [5_158_524, 5_158_525],
              multiSelectAction: "append",
            },
            mullt_env: {
              fieldID: 229_425,
              value: [5_108_697, 5_108_698],
              multiSelectAction: "replace",
            },
            cascade_mcp: {
              fieldID: 229_426,
              value: { parent: 5_126_498, child: 5_126_499 },
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
        "  CASCADINGLIST: object with parent and child keys, e.g. {parent: 5126498, child: 5126499}. " +
        "To get valid child IDs for a CASCADINGLIST field — first call 'Fetch Test Run UDF Metadata' to get the parent " +
        "item IDs from lookupOptions, then call 'Fetch Cascade Child Values' with a parent item ID to get " +
        "the available child IDs, then use {parent: <parentId>, child: <childId>} as the value here.",
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
      "Returns each run's UDF values enriched with field label and type information from metadata. " +
      "Use this tool for test suite run UDF values (sourceContext='testSuiteRun'). " +
      "Do NOT use this tool for test case executions — 'Fetch Test Case Executions' already calls metadata internally and returns 'testRunUdfs' in every execution row.",
    handler: QMetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES,
    inputSchema: FetchTestRunUdfValuesArgsSchema,
    purpose:
      "Retrieves the test case runs for a test suite run and extracts their Test Run UDF field values. " +
      "Internally checks the 'hasTcRunUdf' flag — if UDFs are configured, it also calls the metadata API " +
      "to enrich each run's UDF values with field label, type, and numeric fieldID. " +
      "Use this tool for test suite run UDF values (sourceContext='testSuiteRun'). If the user request started from 'Fetch Test Case Runs by Test Suite Run', pass the parent response rows through 'sourceRows'. " +
      "Do NOT use this tool for test case executions: 'Fetch Test Case Executions' already calls metadata internally, parses udfjson per row, and returns 'testRunUdfs' on every execution record — use that data directly. " +
      "Do NOT use this tool for issue executions; 'Fetch Issue Executions' already reads UDF values from its own udfjson response and enriches them with metadata.",
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
          sourceContext: "testSuiteRun",
        },
        expectedOutput:
          "Present as ONE unified table — never as a separate type+value breakdown. Example:\n" +
          "| Test Case Key | Test Case Summary        | Executed Version | Execution Status | Tested By | Environments UDF     | Execution Type | Country    |\n" +
          "| MAC-TC-5      | Login - valid credential | 1                | Passed           | varis     | chrome, edge, safari | Functional     | India > i3 |\n" +
          "| MAC-TC-6      | Login - invalid password | 2                | Failed           | john      | firefox              | Regression     | -          |\n" +
          "Columns: Test Case Key (entityKey) | Test Case Summary (summary) | Executed Version (latestVersion) | Execution Status (runStatus) | Tested By | then one column per UDF label. " +
          "Use the UDF 'label' as column header. Show null UDF values as '-'.",
      },
    ],
    hints: [
      "DEFAULT DISPLAY CONTRACT: Always render 'unifiedTableRows' as ONE table. Do not render UDFs as Label | Type | Value rows.",
      "When sourceContext='testSuiteRun', mandatory columns are: Test Case Key | Test Case Summary | Executed Version | Execution Status | Tested By | then one column per UDF label.",
      "PARENT-TO-UDF WORKFLOW: If Fetch Test Case Runs by Test Suite Run was already called, pass parentResponse.data as sourceRows with sourceContext='testSuiteRun'. This preserves identification fields and avoids repeating the same API call.",
      "For prompts like 'Fetch test case runs of VKMCP-TS-1 and its Test Run UDFs': call Fetch Test Case Runs by Test Suite Run, then call this tool with sourceContext='testSuiteRun' and sourceRows=<that response data>.",
      "For prompts like 'Fetch Test Case Executions and show Test Run UDFs': call Fetch Test Case Executions ONLY — that tool already calls metadata internally and returns testRunUdfs on every execution row. Do NOT call this tool for test case executions.",
      "For prompts like 'Fetch Issue Executions and Test Run UDFs': call Fetch Issue Executions only. Do not call this tool, because issue UDF values come from /rest/execution/getExecutionsForIssue udfjson and are already enriched by the issue tool with metadata.",
      "If no parent rows are available, use 'tsrunID' from the 'Fetch Executions by Test Suite' tool (data[<index>].tsRunID field).",
      "'viewId' is auto-resolved from latestViews.TE.viewId — leave blank unless explicitly overriding. It is only needed when sourceRows is not supplied.",
      "If 'hasTcRunUdf' is false in the response, no Test Run UDFs are configured for this project.",
      "The 'testRunUdfs' array on each run contains enriched UDF values with label and fieldID — use fieldID from here when calling 'Bulk Update Test Run UDFs'.",
      "This tool calls UDF metadata internally — no need to call 'Fetch Test Run UDF Metadata' separately when viewing values.",
      "When sourceRows is omitted, this tool also calls the test-suite-run execution list API internally. When sourceRows is provided, it reuses those rows and does not refetch the parent execution list.",
    ],
    outputDescription:
      "JSON with hasTcRunUdf boolean, sourceContext, total count, defaultColumns, udfColumns, unifiedTableRows, runs array, " +
      "and availableUdfFields array describing all UDF fields in the project. " +
      "Render unifiedTableRows directly as the final table: default identification fields first, then one column per UDF label.",
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
  {
    title: "Fetch Cascade Child Values",
    toolset: "UDF",
    summary:
      "Fetch the child values of a CASCADINGLIST UDF field for a given parent item ID. " +
      "Use this before bulk-updating a CASCADINGLIST Test Run UDF to discover valid child item IDs.",
    handler: QMetryToolsHandlers.FETCH_CASCADE_CHILD_VALUES,
    inputSchema: FetchCascadeChildValuesArgsSchema,
    purpose:
      "Retrieves the available child items for a selected parent item in a CASCADINGLIST UDF field. " +
      "CASCADINGLIST fields have a two-level hierarchy: a parent value and a dependent child value. " +
      "The child options are not static — they depend on which parent item is selected. " +
      "This tool resolves that dependency by returning all valid child item IDs for a given parent ID. " +
      "Call this tool AFTER 'Fetch Test Run UDF Metadata' to get parent item IDs from lookupOptions, " +
      "and BEFORE 'Bulk Update Test Run UDFs' to obtain the correct child item ID to include in the update payload.",
    useCases: [
      "Find valid child values for a CASCADINGLIST UDF before bulk-updating test runs",
      "List all child options available under a specific parent cascade item",
      "Resolve child item ID when user knows the parent but not the child",
      "Discover cascade hierarchy for a UDF field before setting it on test executions",
    ],
    examples: [
      {
        description:
          "Fetch child values for parent cascade item with ID 5173534",
        parameters: {
          id: 5_173_534,
        },
        expectedOutput:
          '{ parentId: 5173534, parentName: "India", children: [{ id: 5173535, name: "i1", uniqueLabel: "i1", isArchived: false }, ...], _note: "Use \'id\' from \'children\' as the \'child\' value in the CASCADINGLIST update." }',
      },
      {
        description:
          "Fetch child values including archived items for parent ID 5126498",
        parameters: {
          id: 5_126_498,
          isArchReq: true,
        },
        expectedOutput:
          '{ parentId: 5126498, parentName: "abc", children: [...], _note: "..." }',
      },
    ],
    hints: [
      "MANDATORY WORKFLOW for CASCADINGLIST bulk update:\n" +
        "  1. Call 'Fetch Test Run UDF Metadata' → get the CASCADINGLIST field's 'fieldID' (projectUserFieldID) " +
        "     and parent item options from 'lookupOptions'.\n" +
        "  2. Call this tool ('Fetch Cascade Child Values') with a parent item 'id' from step 1 → get child item IDs.\n" +
        "  3. Call 'Bulk Update Test Run UDFs' with value: { parent: <parentId>, child: <childId> } and the 'fieldID' from step 1.",
      "The parent item IDs are in the 'lookupOptions' map returned by 'Fetch Test Run UDF Metadata'. " +
        "Each entry under the field's listName contains items with 'id' — use that 'id' as the 'id' parameter here.",
      "The response 'children' array contains objects with 'id', 'name', 'uniqueLabel', and 'isArchived'. " +
        "Use 'id' as the 'child' value in the bulk update payload.",
      "Set 'isArchReq: true' only if the user explicitly asks to include archived/inactive child options.",
      "This endpoint requires 'scope' and 'orgcode' headers — these are injected automatically from the session " +
        "context when 'Set Project Info' has been called. If you see an authorization error, call 'Set Project Info' first.",
      "Do NOT call this tool for STRING, NUMBER, DATETIMEPICKER, LOOKUPLIST, or MULTILOOKUPLIST fields — " +
        "only CASCADINGLIST (fieldType: 'CASCADINGLIST') fields have a parent-child hierarchy.",
    ],
    outputDescription:
      "JSON object with 'parentId' (the input ID), 'parentName' (the parent item's display name), " +
      "'children' array (each item has id, name, uniqueLabel, isArchived), and a '_note' explaining how to use the IDs.",
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
];
