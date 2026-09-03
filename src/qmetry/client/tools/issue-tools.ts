import { QMetryToolsHandlers } from "../../config/constants";
import {
  CreateIssueArgsSchema,
  FetchIssueDetailsArgsSchema,
  IssueExecutionsArgsSchema,
  IssuesLinkedToTestCaseArgsSchema,
  IssuesListArgsSchema,
  LinkedIssuesByTestCaseRunArgsSchema,
  LinkIssuesToTestcaseRunArgsSchema,
  UpdateIssueArgsSchema,
} from "../../types/common";
import type { QMetryToolParams } from "./types";

export const ISSUE_TOOLS: QMetryToolParams[] = [
  {
    title: "Create Defect or Issue",
    toolset: "Issues",
    summary: "Create a new defect/issue internally in QMetry.",
    handler: QMetryToolsHandlers.CREATE_ISSUE,
    inputSchema: CreateIssueArgsSchema,
    purpose:
      "REQUIRED WORKFLOW: Before calling this tool, ALWAYS call 'Fetch UDF Layout' (entityType='IS', pageName='ADD') first. " +
      "That call reveals mandatory UDF fields, system field requirements, and default values to auto-apply. " +
      "Skipping it causes CO.MANDATORY_FIELDS_MISSING errors. " +
      "Allows users to create a new defect/issue in QMetry with full system field and UDF support. " +
      "SYSTEM FIELDS (resolved from project info): issueType, issuePriority, issueOwner, component (used as labels), affectedRelease, affectedCycles, environment, description, tcRunID. " +
      "UDF FIELDS: pass via udfFields param — LOOKUPLIST (single ID), MULTILOOKUPLIST (array of IDs), CASCADINGLIST ({ parent, child }), STRING, NUMBER, DATETIMEPICKER. " +
      "Always fetch project info first to resolve valid IDs for system fields. " +
      "Fetch UDF Layout (entityType=IS, pageName=ADD) before setting UDF values.",

    useCases: [
      "Create a basic defect/issue with just a summary",
      "Set issueType, issueOwner, component (labels), environment, and affectedRelease using valid IDs from project info",
      "Create defects/issues with UDF values (hobby, destination, custom fields)",
      "Link defects/issues to specific test case runs using tcRunID",
    ],
    examples: [
      {
        description: "Create an issue with summary 'Login Issue'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput: "Issue created in summary details",
      },
      {
        description:
          "Create an issue with Major priority and Bug type to Bug with summary 'Login Issue'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput:
          "Issue created in summary details with priority and Bug type",
      },
      {
        description:
          "Create an issue with summary 'Login Issue' and set issueOwner to 'John Doe'",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
        },
        expectedOutput:
          "Issue created in summary details with owner, priority and Bug type",
      },
      {
        description:
          "Create an issue with summary 'Login Issue' and link it to test case run ID 567890",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          tcRunID: 567890,
        },
        expectedOutput:
          "Issue created in summary details and linked to test case run ID 567890",
      },
      {
        description:
          "Create an issue with summary 'Login Issue' and set description to 'User is unable to login' and owner to 'John Doe' and link it to test case run ID 567890",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          tcRunID: 567890,
          description: "User is unable to login",
        },
        expectedOutput:
          "Issue created in summary details with description, owner, priority, Bug type and linked to test case run ID 567890",
      },
      {
        description:
          "Create an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycles and owner to 'John Doe'",
        parameters: {
          name: "Login Issue",
          issueOwner: 15112,
          issuePriority: 2231988,
          issueType: 2231983,
          affectedRelease: [111840],
          affectedCycles: [112345, 112346],
        },
        expectedOutput:
          "Issue created in summary details with release and associated all cycles, owner",
      },
      {
        description:
          "Create an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycle 'Cycle 1.0.1', 'Cycle 1.0.2'",
        parameters: {
          name: "Login Issue",
          issuePriority: 2231988,
          issueType: 2231983,
          affectedRelease: [111840],
          affectedCycles: [112345, 112346],
        },
        expectedOutput:
          "Issue created in summary details with release and cycles",
      },
    ],
    hints: [
      "╔══════════════════════════════════════════════════════════════════╗",
      "║  STEP 0 — NON-NEGOTIABLE: Call 'Fetch UDF Layout' BEFORE create  ║",
      "╚══════════════════════════════════════════════════════════════════╝",
      "NEVER call 'Create Defect or Issue' without first calling 'Fetch UDF Layout' with entityType='IS', pageName='ADD'.",
      "Skipping this step WILL cause 400 errors (CO.MANDATORY_FIELDS_MISSING) because mandatory fields and defaults are unknown.",
      "This rule has NO exceptions — not even when the user only provided a name and nothing else.",
      "",
      "=== MANDATORY PRE-CREATE CHECK (ALWAYS DO THIS FIRST) ===",
      "Before creating any issue, call 'Fetch UDF Layout' with entityType='IS', pageName='ADD'.",
      "Response keys use 'IS' — same structure as TC but scoped to issue module.",
      "",
      "SYSTEM FIELDS mandatory check — use 'systemFields' array (from qmSDF.IS in newlayout):",
      "  Each entry: { name, label, fieldTypeName, isMandatory }",
      "  isMandatory=true (allowBlank=false) means field MUST have a value before creating.",
      "",
      "UDF FIELDS mandatory check — use 'fields' array (from qmUDF.IS in newlayout):",
      "  Each entry: { name, label, fieldTypeName, isMandatory, listName? }",
      "  isMandatory=true means field MUST have a value.",
      "",
      "DEFAULT VALUES — use 'defaultValues' object (from qmDefaultValue.IS in newlayout):",
      "  Shape: { fieldName: defaultValueId }  e.g. { 'str1': 'Tony Stark', 'lookup19': 5232630, 'component': 5232632 }",
      "  IMPORTANT: defaultValues can contain BOTH system field defaults AND UDF field defaults — handle each differently:",
      "  → SYSTEM field defaults (fields in qmSDF.IS, e.g. component/Labels, issueType, issuePriority): route to TOP-LEVEL params, NOT to udfFields.",
      "     - MULTILOOKUPLIST system fields (e.g. component): default is a single ID — wrap in array: component: [5232632].",
      "     - LOOKUPLIST system fields (e.g. issueType, issuePriority): default is a single ID — use directly: issueType: 5232517.",
      "  → UDF field defaults (fields in qmUDF.IS, e.g. str1, lookup19, age19): route to udfFields param.",
      "  IMPORTANT: QMetry's API sometimes returns 'defaultValues: {}' (empty) even when defaults exist in QMetry settings.",
      "  If 'defaultValues' is empty, you cannot auto-apply — ask user for mandatory fields without defaults.",
      "  RULE: isMandatory=true AND defaultValues[field.name] exists → auto-use default, do NOT ask user.",
      "  RULE: isMandatory=true AND no defaultValues entry → MUST ask user before creating.",
      "  RULE: isMandatory=false AND defaultValues entry exists → auto-apply if user didn't specify.",
      "",
      "SYSTEM FIELDS mandatory check — additional caveat:",
      "  IMPORTANT: QMetry's API sometimes returns 'systemFields: []' (empty) even when system fields ARE mandatory.",
      "  If 'systemFields' is empty, treat the following as always mandatory: summary, issueType, issuePriority.",
      "  For issueType/issuePriority defaults: check 'customListObjs.issueType' / 'customListObjs.issuePriority' from Fetch Project Info — use first non-archived entry as fallback.",
      "",
      "╔══════════════════════════════════════════════════════════════════════════╗",
      "║  PRE-FLIGHT DEFAULT SWEEP — MANDATORY STEP BEFORE EVERY CREATE CALL     ║",
      "╚══════════════════════════════════════════════════════════════════════════╝",
      "After resolving mandatory fields, sweep ALL defaultValues entries:",
      "  For EACH key in defaultValues:",
      "    IF the user did not explicitly provide that field → add it to the payload using the default value.",
      "    This applies regardless of isMandatory — non-mandatory defaults MUST also be auto-applied.",
      "    Route correctly: system fields → top-level params, UDF fields → udfFields.",
      "    MULTILOOKUPLIST system fields (e.g. component): wrap single default ID in array → component: [id].",
      "  Example: defaultValues = { str1: 'Tony Stark', lookup19: 5232630, component: 5232632 }",
      "    → user only said 'create an issue named X'",
      "    → payload MUST include: udfFields.str1='Tony Stark', udfFields.lookup19=5232630, component=[5232632]",
      "    → WRONG to put component in udfFields — it is a system field and must be a top-level array param.",
      "    → WRONG to omit component just because it is not mandatory — it has a default.",
      "  Skipping this sweep = missing fields in the created record = user-visible data loss.",
      "╚══════════════════════════════════════════════════════════════════════════╝",
      "",
      "DECISION MATRIX:",
      "  | isMandatory | Has default | Action                              |",
      "  |-------------|-------------|-------------------------------------|",
      "  | true        | YES         | Auto-fill with default, no ask      |",
      "  | true        | NO          | Ask user before creating            |",
      "  | false       | YES         | Auto-fill with default — REQUIRED   |",
      "  | false       | NO          | Skip if user didn't provide         |",
      "Only after ALL mandatory fields resolved AND default sweep complete → proceed with create.",
      "=== END MANDATORY PRE-CREATE CHECK ===",
      "",
      "=== ERROR RECOVERY: CO.MANDATORY_FIELDS_MISSING ===",
      "If create fails with error code 'CO.MANDATORY_FIELDS_MISSING', DO NOT give up. Auto-recover:",
      "  1. Parse the 'MISSING_FIELDS' list from the error response (comma-separated field labels).",
      "  2. Match each label against 'fields[].label' and 'systemFields[].label' from the Fetch UDF Layout response.",
      "  3. For matched UDF fields: check 'listOptions[field.listName]' for valid option IDs.",
      "  4. For matched system fields (e.g. 'Priority'): check 'customListObjs.issuePriority' from project info.",
      "  5. If the field has a 'defaultValues' entry: auto-fill it silently.",
      "  6. If no default exists: ask the user ONLY for the missing fields by label.",
      "  7. Retry create with the resolved values added to the payload.",
      "  NEVER ask user to 'try again' manually — resolve and retry automatically.",
      "=== END ERROR RECOVERY ===",
      "",
      "=== DATE FORMAT CHECK (MANDATORY — EVERY CREATE REQUEST) ===",
      "ALWAYS call 'Fetch QMetry Project Info' before every create request — not only when the user explicitly mentions a date.",
      "Any UDF field could be a DATETIMEPICKER. Wrong format causes QMetry to silently discard the field value (API returns success but value is NOT stored — no error).",
      "STEP 1: From project info, read dateTimeFormatID (e.g. 3).",
      "STEP 2: Find entry in dateTimeFormatNew where id === dateTimeFormatID → read its unique_value (e.g. 'yyyy-MM-dd').",
      "STEP 3: unique_value pattern: yyyy=4-digit year, MM=2-digit month (01-12), dd=2-digit day, MMM=3-letter month (Jan/Feb/...).",
      "  Example: id=1 → MM-dd-yyyy → '10-25-2000' | id=2 → dd-MM-yyyy → '25-10-2000' | id=3 → yyyy-MM-dd → '2000-10-25' | id=4 → dd-MMM-yyyy → '25-Oct-2000'",
      "STEP 4: For EVERY DATETIMEPICKER field in the payload: parse any user-provided date and re-format it using the active unique_value pattern before sending.",
      "NEVER assume a date format — always derive it from dateTimeFormatID. Wrong format = silent data loss.",
      "=== END DATE FORMAT CHECK ===",
      "",
      "CRITICAL: summary, issueType, issuePriority are REQUIRED fields to create an issue",
      "OPTIONAL SYSTEM FIELDS: issueOwner, component, affectedRelease, affectedCycles, description, environment, tcRunID",
      "SYSTEM FIELD ID RESOLUTION — fetch project info, then use these mappings:",
      "- issueType: customListObjs.issueType[<index>].id",
      "- issuePriority: customListObjs.issuePriority[<index>].id",
      "- issueOwner / owner: customListObjs.users[<index>].id  (match by name)",
      "- component / labels: customListObjs.component[<index>].id  (component acts as labels — pass array of IDs)",
      "- environment: free-text string (e.g. 'Chrome', 'Firefox', 'Production') — pass directly as top-level field, no ID lookup needed",
      "- sync_with: customListObjs.component[<index>].igConfigurationID or internalTrackerId",
      "- tcRunID: data[<index>].tcRunID (from 'Execution/Fetch Testcase Run ID')",
      "If the user provides a issuePriority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.issuePriority[index].name, and use its ID in the payload. If the name is not found, skip the issuePriority field and show a user-friendly message: 'Defect/issue created without issuePriority, as given issuePriority is not available in the current project.'",
      "If the user provides an issueOwner name, fetch project info, find the matching issueOwner in customListObjs.users[index].name, and use its ID in the payload as issueOwner. If the name is not found, skip the issueOwner field and show a user-friendly message: 'Defect/issue created without issueOwner, as given issueOwner is not available in the current project.'",
      "If the user provides an issue type name, fetch project info, find the matching type in customListObjs.issueType[index].name, and use its ID in the payload as issueType. If the name is not found, skip the issueType field and show a user-friendly message: 'Defect/issue created without issue type, as given type is not available in the current project.'",
      "",
      "=== RELEASE/CYCLE ID RESOLUTION (MANDATORY WHEN USER PROVIDES RELEASE OR CYCLE) ===",
      "ALWAYS call 'Fetch Releases and Cycles' tool (FETCH_RELEASES_AND_CYCLES) to resolve release and cycle IDs — do NOT guess IDs from project info.",
      "Fetch Releases and Cycles response structure:",
      "  releases[<index>].releaseID   → use as affectedRelease value (wrap in array: [releaseID])",
      "  releases[<index>].name        → release display name to match against user input",
      "  releases[<index>].builds[<index>].buildID  → use as affectedCycles value (wrap in array: [buildID])",
      "  releases[<index>].builds[<index>].name     → cycle display name to match against user input",
      "PAYLOAD FORMAT: both affectedRelease and affectedCycles MUST be arrays of numeric IDs:",
      "  affectedRelease: [releaseID]           e.g. affectedRelease: [92112]",
      "  affectedCycles: [buildID]              e.g. affectedCycles: [130831]",
      "  affectedCycles: [buildID1, buildID2]   multiple cycles allowed",
      "WORKFLOW when user provides release/cycle name or ID:",
      "  1. Call FETCH_RELEASES_AND_CYCLES to get all releases and their nested cycles (builds).",
      "  2. Match user's release name/ID → extract releases[<index>].releaseID.",
      "  3. Match user's cycle name/ID within that release → extract releases[<index>].builds[<index>].buildID.",
      "  4. Set affectedRelease: [releaseID] and affectedCycles: [buildID] in payload.",
      "VALIDATION: If the release or cycle name/ID is not found in FETCH_RELEASES_AND_CYCLES response, skip both fields and show: 'Issue created without release/cycle association, as given release/cycle is not available in the current project.'",
      "NEVER pass a single number for affectedRelease or affectedCycles — always wrap in array even for one ID.",
      "=== END RELEASE/CYCLE ID RESOLUTION ===",
      "",
      "Ensure all IDs used are valid for the current QMetry project context",
      "This tool is essential for defect management and test execution linkage",
      "Helps maintain traceability between test executions and reported issues",
      "Critical for quality assurance and defect lifecycle management",
      "Use for creating issues directly from test execution contexts",
      "",
      "UDF (User Defined Fields) WORKFLOW FOR CREATE:",
      "1. Call 'Fetch UDF Layout' with entityType='IS', pageName='ADD' to discover field names, types, and list option IDs.",
      "   IF listOptions[field.listName] is empty after Fetch UDF Layout, the tool already tried a metadata fallback. " +
        "   If STILL empty, ask the user to provide the option ID from the QMetry UI — do NOT guess numeric IDs.",
      "2. For LOOKUPLIST fields: pick one ID from listOptions[field.listName][].id.",
      "3. For MULTILOOKUPLIST fields: pick an array of IDs.",
      "4. For CASCADINGLIST fields: pick parent ID, then call 'Fetch Cascade Child Values' for child ID. Pass { parent: parentId, child: childId }.",
      "5. Pass all UDF values via 'udfFields' param: { fieldName: value }.",
      "6. Mandatory UDF fields (isMandatory=true) MUST be included or create will fail.",
    ],
    outputDescription:
      "JSON object containing the new create issue with id, dfid(defectID).",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Issue",
    toolset: "Issues",
    summary: "Update an existing QMetry issue by DefectId and/or entityKey.",
    handler: QMetryToolsHandlers.UPDATE_ISSUE,
    inputSchema: UpdateIssueArgsSchema,
    purpose:
      "REQUIRED WORKFLOW: Before calling this tool, call 'Fetch UDF Layout' (entityType='IS', pageName='DETAIL') to discover mandatory fields, default values, and valid list option IDs. " +
      "Skipping this causes missing or incorrect UDF values in updated records. " +
      "Update an existing QMetry issue by DefectId and/or entityKey. " +
      "Only fields provided will be updated. " +
      "Refer to the Create Issue tool for field mapping and valid values.",
    useCases: [
      "Update issue summary (title)",
      "Change issue priority, type, or owner",
      "Update affected release or cycles",
      "Update description or environment",
      "Bulk update using DefectId and/or entityKey",
    ],
    examples: [
      {
        description: "Update issue summary",
        parameters: {
          DefectId: 118150,
          summary:
            "Money withdrawal is success even if insufficient amount_updated",
        },
        expectedOutput: "Issue summary updated successfully.",
      },
      {
        description: "Update issue priority",
        parameters: { DefectId: 118150, issuePriority: 189340 },
        expectedOutput: "Issue priority updated successfully.",
      },
      {
        description: "Update issue type",
        parameters: { DefectId: 118150, issueType: 189337 },
        expectedOutput: "Issue type updated successfully.",
      },
      {
        description: "Update affected release",
        parameters: { DefectId: 118150, affectedRelease: 3730 },
        expectedOutput: "Affected release updated successfully.",
      },
    ],
    hints: [
      "=== DEFAULT VALUES — APPLY FOR ANY UNSET FIELD ===",
      "ALWAYS call 'Fetch UDF Layout' with entityType='IS', pageName='DETAIL' before updating.",
      "defaultValues (from Fetch UDF Layout, i.e. qmDefaultValue.IS): { fieldName: defaultValueId } — sweep ALL entries.",
      "  defaultValues can contain BOTH system field defaults AND UDF field defaults — handle each differently:",
      "  → SYSTEM field defaults (fields in qmSDF.IS, e.g. component/Labels, issueType, issuePriority): route to TOP-LEVEL params, NOT to udfFields.",
      "     - MULTILOOKUPLIST system fields (e.g. component): default is a single ID — wrap in array: component: [5232632].",
      "     - LOOKUPLIST system fields (e.g. issueType, issuePriority): default is a single ID — use directly.",
      "  → UDF field defaults (fields in qmUDF.IS, e.g. str1, lookup19, age19): route to udfFields param.",
      "  For EACH key in defaultValues: if user did not explicitly provide that field → include it in payload using default, routed correctly.",
      "  This applies to non-mandatory fields too (e.g. component/Labels). Omitting them = data loss.",
      "  IMPORTANT: QMetry's API sometimes returns 'defaultValues: {}' (empty) — if so, skip auto-apply and ask user for mandatory fields without defaults.",
      "systemFields (from qmSDF.IS): isMandatory=true fields must retain a valid value after update.",
      "  IMPORTANT: QMetry's API sometimes returns 'systemFields: []' (empty). If so, treat summary, issueType, issuePriority as always mandatory.",
      "fields/UDF (from qmUDF.IS): isMandatory=true UDF fields must be included if being changed.",
      "=== END DEFAULT VALUES ===",
      "",
      "=== DATE FORMAT CHECK (MANDATORY — EVERY UPDATE REQUEST) ===",
      "ALWAYS call 'Fetch QMetry Project Info' before every update request — not only when the user explicitly mentions a date.",
      "Any UDF field could be a DATETIMEPICKER. Wrong format causes QMetry to silently discard the field value (API returns success but value is NOT stored — no error).",
      "STEP 1: From project info, read dateTimeFormatID (e.g. 3).",
      "STEP 2: Find entry in dateTimeFormatNew where id === dateTimeFormatID → read its unique_value (e.g. 'yyyy-MM-dd').",
      "STEP 3: unique_value pattern: yyyy=4-digit year, MM=2-digit month (01-12), dd=2-digit day, MMM=3-letter month (Jan/Feb/...).",
      "  Example: id=1 → MM-dd-yyyy → '10-25-2000' | id=2 → dd-MM-yyyy → '25-10-2000' | id=3 → yyyy-MM-dd → '2000-10-25' | id=4 → dd-MMM-yyyy → '25-Oct-2000'",
      "STEP 4: For EVERY DATETIMEPICKER field in the payload: parse any user-provided date and re-format it using the active unique_value pattern before sending.",
      "NEVER assume a date format — always derive it from dateTimeFormatID. Wrong format = silent data loss.",
      "=== END DATE FORMAT CHECK ===",
      "",
      "To get the DefectId, call the Issue/Fetch issue tool and use data[<index>].id from the response.",
      "if you have pass issue key (VT-IS-5, MAC-IS-10 etc.) then first fetch issue by issue key to get issue id.",
      "Along with DefectId, pass only those fields which are to be updated.",
      "Refer to the Create Issue tool for valid field mappings and values.",
      "You can update summary, priority, type, affectedRelease, affectedCycles, description, sync_with, issueOwner, component, environment, tcRunID, etc.",
      "If you provide entityKey, it will be used for additional validation but DefectId is required.",
      "",
      "UDF (User Defined Fields) WORKFLOW FOR UPDATE:",
      "1. Call 'Fetch UDF Layout' with entityType='IS', pageName='DETAIL' to get field names, fieldIDs (projectUserFieldID), and list option IDs.",
      "   IF listOptions[field.listName] is empty after Fetch UDF Layout, the tool already tried a metadata fallback. " +
        "   If STILL empty, ask the user to provide the option ID from the QMetry UI — do NOT guess numeric IDs.",
      "2. For LOOKUPLIST fields: pick one ID from listOptions[field.listName][].id.",
      "3. For MULTILOOKUPLIST fields: pick array of IDs; also pass alias flat key (e.g., fieldNameAlias: 'Option Label').",
      "4. For CASCADINGLIST fields: pick parent ID + fetch child with 'Fetch Cascade Child Values'. Pass { parent: parentId, child: childId }.",
      "5. Pass BOTH 'udfFields' (flat root values) AND 'UDF' wrapper (with fieldID) — both required for update.",
      "   Example: udfFields: { is_field: 'value' }, UDF: { is_field: { fieldID: 3001, value: 'value' } }",
      "6. Mandatory UDF fields (isMandatory=true) MUST be included.",
    ],
    outputDescription: "JSON object with update status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Defects or Issues",
    toolset: "Issues",
    summary:
      "Fetch QMetry defects or issues - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_ISSUES,
    inputSchema: IssuesListArgsSchema,
    purpose:
      "Get defects or issues from QMetry. System automatically gets correct viewId from project.",
    useCases: [
      "List all issues in a project",
      "Search for specific issues using filters",
      "Get paginated issue results",
    ],
    examples: [
      {
        description:
          "Get all issues from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of issues from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all issues from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of issues from UT project using UT's specific IS viewId",
      },
      {
        description: "Get issues by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Issues associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get issues by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All defects or issues associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get issues by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All defects or issues associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific issue by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-IS-636","field":"entityKeyId"}]',
        },
        expectedOutput: "Issues matching the entity key criteria",
      },
      {
        description:
          "Search for multiple defects or issues by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-IS-636,MAC-IS-637,MAC-IS-638","field":"entityKeyId"}]',
        },
        expectedOutput: "Issues matching any of the specified entity keys",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and issues fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.IS.viewId",
      "Step 3: Use the SAME projectKey and the extracted IS viewId for fetching issues",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and issues fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by issues key (like MAC-IS-1684), use filter: \'[{"type":"string","value":"MAC-IS-1684","field":"entityKeyId"}]\'',
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: name, stateAlias, typeAlias, entityKeyId, createdDate, createdByAlias, updatedDate, updatedByAlias, createdSystem, dfOwner, priorityAlias, linkedTcrCount, linkedRqCount, attachmentCount, componentAlias, environmentText",
      "SORT FIELDS: entityKey, name, typeAlias, stateAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, priorityAlias, createdSystem, linkedTcrCount, linkedRqCount, dfOwner, attachmentCount, environmentText",
      "For multiple entity keys, use comma-separated values in filter",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for defect management and issue tracking",
      "Critical for quality assurance and defect lifecycle analysis",
      "Use for compliance reporting and issue traceability",
      "Helps maintain visibility into project defects and issues",
    ],
    outputDescription:
      "JSON object with 'data' array containing issues. Each issue has 'id' (numeric defect ID — use this as defectId for Fetch Issue Details), 'entityKey', 'name'/'summary', and other fields. There is no 'DefectId' field in this response — 'id' is the defect identifier.",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Linked Issues of Test Case Run",
    toolset: "Issues",
    summary:
      "Get issues that are linked (or not linked) to a specific test case run in QMetry",
    handler: QMetryToolsHandlers.FETCH_LINKED_ISSUES_BY_TESTCASE_RUN,
    inputSchema: LinkedIssuesByTestCaseRunArgsSchema,
    purpose:
      "CRITICAL: This tool requires entityId which is the Test Case Run ID (tcRunID), NOT any other ID! " +
      "When user asks for 'linked issues of test execution' or 'linked issues of test suite' or 'linked issues of test run', " +
      "you MUST first fetch the test run data to get the proper tcRunID values, then use those as entityId. " +
      "NEVER use user-provided IDs directly as entityId without validation! " +
      "This tool retrieves issues linked to specific test case runs for defect tracking and traceability analysis.",
    useCases: [
      "Get all issues linked to a specific test case run for defect tracking",
      "Find issues that are NOT linked to a test case run (gap analysis)",
      "Generate defect reports and traceability matrix for test case runs",
      "Monitor issue resolution progress for specific test case executions",
      "Analyze test execution quality by examining linked defects",
      "Filter issues by type, priority, status, or owner for test case runs",
      "Audit issue-test case run relationships for compliance",
      "Track defect lifecycle in relation to test execution results",
      "Quality assurance - ensure proper issue tracking for failed test runs",
      "Impact analysis - see which issues affect specific test executions",
    ],
    examples: [
      {
        description: "Get all issues linked to test case run ID 1121218",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
        },
        expectedOutput:
          "List of issues linked to the test case run with issue details, status, and metadata",
      },
      {
        description: "Get issues NOT linked to test case run (gap analysis)",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: false,
        },
        expectedOutput:
          "List of issues that are NOT linked to test case run for gap analysis",
      },
      {
        description: "Filter linked issues by issue type and status",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"list","value":[1],"field":"typeAlias"},{"type":"list","value":[1,2],"field":"stateAlias"}]',
        },
        expectedOutput: "Bug type issues in Open or In Progress status",
      },
      {
        description: "Search linked issues by name and priority",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"string","value":"login","field":"name"},{"type":"list","value":[1],"field":"priorityAlias"}]',
        },
        expectedOutput: "High priority issues containing 'login' in their name",
      },
      {
        description: "Filter issues by date range and entity key",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"value":"2024-01-01","type":"date","field":"createdDate","comparison":"gt"},{"value":"2024-12-31","type":"date","field":"createdDate","comparison":"lt"},{"type":"string","value":"BUG-001,BUG-002","field":"entityKeyId"}]',
        },
        expectedOutput: "Specific issues created within date range",
      },
      {
        description: "Filter issues by owner and created system",
        parameters: {
          entityId: 1121218,
          getColumns: true,
          getLinked: true,
          filter:
            '[{"type":"list","value":[123],"field":"dfOwner"},{"type":"list","value":["QMetry"],"field":"createdSystem"}]',
        },
        expectedOutput: "Issues owned by specific user and created in QMetry",
      },
    ],
    hints: [
      "WORKFLOW CRITICAL: NEVER use user-provided IDs directly as entityId!",
      "ALWAYS fetch execution data first to get proper tcRunID values!",
      "",
      "WHEN USER ASKS: 'fetch linked issues of test suite [ID]' OR 'linked issues of test run [ID]':",
      "STEP 1: Identify what type of ID the user provided",
      "STEP 2A: If Test Suite ID → fetch executions by test suite → get tsRunID → fetch test runs → get tcRunID",
      "STEP 2B: If Test Run ID → fetch test case runs by test suite run → get tcRunID",
      "STEP 2C: If Test Case ID → fetch test case executions → get tcRunID",
      "STEP 3: Use tcRunID as entityId for this tool",
      "",
      "ID HIERARCHY: Test Suite → Test Suite Runs → Test Case Runs (tcRunID = entityId)",
      "ID HIERARCHY: Test Case → Test Case Executions (tcRunID = entityId)",
      "",
      "CRITICAL: entityId parameter is REQUIRED - this is the Test Case Run numeric ID (tcRunID)",
      "HOW TO GET entityId:",
      "1. Call appropriate execution APIs to get test case runs",
      "2. From the response, extract data[<index>].tcRunID",
      "3. Use tcRunID as entityId for this tool",
      "4. Example: tcRunID 1121218 becomes entityId: 1121218",
      "",
      "getLinked=true (default): Returns issues that ARE linked to the test case run",
      "getLinked=false: Returns issues that are NOT linked to the test case run (useful for gap analysis)",
      "istcrFlag=true (default): Set to true for test case run operations",
      "getColumns=true (default): Include column metadata in response",
      "",
      "FILTER CAPABILITIES: Support extensive filtering by issue properties",
      "FILTER FIELDS: name (string), typeAlias (list), stateAlias (list), entityKeyId (string), createdDate (date with comparison), createdByAlias (list), updatedDate (date with comparison), createdSystem (list), updatedByAlias (list), dfOwner (list), priorityAlias (list), linkedTcrCount (numeric), linkedRqCount (numeric), attachmentCount (numeric), componentAlias (list), environmentText (string), affectedRelease (list)",
      "ISSUE TYPE IDs: Typically 1=Bug, 2=Enhancement, 3=Task (verify with your QMetry instance)",
      "ISSUE STATE IDs: Typically 1=Open, 2=In Progress, 3=Resolved, 4=Closed (verify with your QMetry instance)",
      "ISSUE PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "DATE FILTERING: Use 'gt' (greater than) and 'lt' (less than) comparisons for date fields",
      "ENTITY KEY SEARCH: Use comma-separated values for multiple issue keys",
      "CREATED SYSTEM: Use 'QMetry' or 'JIRA' to filter by creation system",
      "OWNER IDs: Use numeric user IDs from QMetry user management",
      "COMPONENT/LABEL IDs: Use numeric IDs for component/label filtering",
      "ENVIRONMENT TEXT: Filter by environment description text",
      "AFFECTED RELEASE: Use release IDs for filtering by affected releases",
      "LINKED COUNT FILTERS: Use numeric values for linkedTcrCount, linkedRqCount, attachmentCount",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for defect tracking and traceability audits",
      "Critical for understanding test execution quality and issue relationships",
      "Use for compliance reporting and issue lifecycle management",
      "Helps establish relationships between test failures and reported issues",
      "Essential for impact analysis when test case runs change or fail",
    ],
    outputDescription:
      "JSON object with issues array containing issue details, priorities, status, owner information, and linkage metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Issues to Testcase Run",
    toolset: "Issues",
    summary: "Link one or more issues to a QMetry Testcase Run (execution).",
    handler: QMetryToolsHandlers.LINK_ISSUES_TO_TESTCASE_RUN,
    inputSchema: LinkIssuesToTestcaseRunArgsSchema,
    purpose:
      "Link existing QMetry issues to a specific Testcase Run (execution) by providing their IDs. " +
      "This is used to associate defects with a test execution for traceability and reporting.",
    useCases: [
      "Link a single issue to a testcase run",
      "Link multiple issues to a testcase run",
      "Automate defect association during test execution",
      "Maintain traceability between defects and test runs",
    ],
    examples: [
      {
        description: "Link one issue to a testcase run",
        parameters: { issueIds: ["5054834"], tcrId: 567890 },
        expectedOutput:
          "Issue 5054834 linked to testcase run 567890 successfully.",
      },
      {
        description: "Link multiple issues to a testcase run",
        parameters: { issueIds: ["5054834", "5054835"], tcrId: 567890 },
        expectedOutput:
          "Issues 5054834, 5054835 linked to testcase run 567890 successfully.",
      },
    ],
    hints: [
      "if you have pass issue key (VT-IS-5, MAC-IS-10 etc.) then first fetch issue by issue key to get issue id.",
      "To get the issueIds, call the Fetch issues linked with testcases tool and use data[<index>].defectID from the response.",
      "To get the tcrId, call the Execution/Fetch Testcase Run ID tool and use data[<index>].tcRunID from the response.",
      "Both issueIds and tcrId are required.",
      "You can link multiple issues at once by providing an array of IDs.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Issue Executions",
    toolset: "Issues",
    summary:
      "Get test case executions linked to a QMetry-native (non-Jira) defect/issue. " +
      "ALWAYS present results as a unified table: Test Suite Key | Test Suite Name | Release | Cycle | Platform | Executed Version | Execution Status | <UDF Label columns…>. " +
      "NEVER show a separate type+value UDF breakdown — always combine identification fields and UDF values in one table per execution row.",
    handler: QMetryToolsHandlers.FETCH_ISSUE_EXECUTIONS,
    inputSchema: IssueExecutionsArgsSchema,
    purpose:
      "Retrieve all test case execution runs that are linked to a specific QMetry-native defect or issue. " +
      "This tool is for local QMetry issues only (not Jira-integrated projects). " +
      "Returns execution details including test case name, run status, platform, release/cycle, and UDF fields. " +
      "The issue execution API (/rest/execution/getExecutionsForIssue) already returns Test Run UDF saved values in each row's udfjson field. " +
      "This tool parses that udfjson and enriches it with Test Run UDF metadata so all configured UDF fields are included, even when a value is empty. " +
      "Do NOT call 'Fetch Test Run UDF Values' after this tool for issue execution UDFs; that generic UDF tool uses the test-suite-run execution API, which is not the correct issue execution source. " +
      "To get linkedAssetId, call Fetch Defects or Issues tool and use data[<index>].id from the response. " +
      "IMPORTANT: Every execution record always contains key identification fields — " +
      "Test Suite Key (tsEntityKey), Test Suite Name (tsName), Release (releaseName), Cycle (cycleName), " +
      "Platform (platformName), Executed Version (executedVersion), and Test Run UDF values (testRunUdfs). " +
      "These MUST always be shown in the response so users can identify which test suite run each execution belongs to.",
    useCases: [
      "Get all test executions linked to a specific defect",
      "Audit which test cases were run against a given issue",
      "Filter executions by run status (failed, passed, etc.) for an issue",
      "Filter executions by platform/environment for an issue",
      "Filter executions by tester/executor for an issue",
      "Show archived and active test suite executions for an issue",
      "View UDF (custom field) values on executions linked to an issue",
      "Track test coverage and execution progress for a defect",
    ],
    examples: [
      {
        description: "Get all executions linked to issue ID 9598240",
        parameters: {
          linkedAssetId: 9598240,
        },
        expectedOutput:
          "Present as ONE unified table — never as a separate type+value UDF breakdown. Example:\n" +
          "| Test Suite Key | Test Suite Name  | Release | Cycle   | Platform | Executed Version | Execution Status | Tested By | Environments UDF     | Execution Type |\n" +
          "| MAC-TS-42      | Regression Suite | R1      | Sprint1 | Chrome   | 1               | Failed           | varis     | chrome, edge, safari | Functional     |\n" +
          "| MAC-TS-43      | Login Suite      | R1      | Sprint1 | Firefox  | 2               | Blocked          | john      | firefox              | Regression     |\n" +
          "Columns in order: Test Suite Key (tsEntityKey) | Test Suite Name (tsName) | Release (releaseName) | Cycle (cycleName) | Platform (platformName) | Executed Version (executedVersion) | Execution Status (runStatusName) | then one column per UDF label. " +
          "Use the UDF 'label' as column header. Show null UDF values as '-'.",
      },
      {
        description: "Get executions with pagination (page 1, 20 records)",
        parameters: {
          linkedAssetId: 9598240,
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput: "First 20 executions linked to the issue",
      },
      {
        description: "Filter executions by run status (failed or passed)",
        parameters: {
          linkedAssetId: 9509016,
          filter:
            '[{"type":"list","field":"runStatusName","value":["failed","passed"]}]',
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput: "Executions with failed or passed status for the issue",
      },
      {
        description: "Filter executions by test case name",
        parameters: {
          linkedAssetId: 9509016,
          filter: '[{"type":"string","value":"login","field":"tcName"}]',
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput: "Executions where test case name contains 'login'",
      },
      {
        description: "Filter by platform, status, and tester",
        parameters: {
          linkedAssetId: 9509016,
          filter:
            '[{"type":"list","field":"runStatusName","value":["failed"]},{"type":"list","field":"platformID","value":[100145]},{"type":"list","field":"executionCreatedByLoginAlias","value":["Varis Khan"]}]',
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput:
          "Failed executions on platform 100145 created by Varis Khan",
      },
      {
        description:
          "Filter by status and include archived test suite executions",
        parameters: {
          linkedAssetId: 9509016,
          filter:
            '[{"type":"list","field":"runStatusName","value":["failed","passed"]},{"value":[1,0],"type":"list","field":"isTestSuiteArchived"}]',
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput:
          "Executions with failed/passed status including archived test suites",
      },
      {
        description: "Filter by execution version and linkage level",
        parameters: {
          linkedAssetId: 9509016,
          filter:
            '[{"type":"string","value":"1","field":"executedVersion"},{"type":"string","value":"Test Case","field":"linkageLevel"}]',
          page: 1,
          start: 0,
          limit: 20,
        },
        expectedOutput: "Executions at Test Case linkage level for version 1",
      },
    ],
    hints: [
      "=== MANDATORY RESPONSE FORMAT — READ THIS BEFORE RENDERING ANY OUTPUT ===",
      "",
      "PIVOT RULE — CRITICAL:",
      "The 'testRunUdfs' field on each execution is an array of { name, label, fieldID, fieldType, value }.",
      "You MUST pivot this array into TABLE COLUMNS — do NOT render it as rows.",
      "  → Each testRunUdfs[i].label  = a column header in the unified table",
      "  → Each testRunUdfs[i].value  = the cell value for that execution's row",
      "  → testRunUdfs[i].fieldType   = INTERNAL METADATA — NEVER show this as a column",
      "  → testRunUdfs[i].fieldID     = INTERNAL METADATA — NEVER show this as a column",
      "",
      "FORBIDDEN PATTERNS — NEVER do any of these:",
      "  ❌ Do NOT render a separate sub-table (UDF Label | Type | Value) per execution",
      "  ❌ Do NOT show 'Type' or 'fieldType' as a visible column",
      "  ❌ Do NOT group output by tcRunID with individual breakdowns beneath each",
      "  ❌ Do NOT show raw UDF field keys (e.g. 'TRString', '8260LUP') as headers — use 'label'",
      "",
      "REQUIRED OUTPUT — ONE unified table, all executions as rows:",
      "| Test Suite Key | Test Suite Name | Release | Cycle | Platform | Executed Version | Execution Status | <UDF Label 1> | <UDF Label 2> | ... |",
      "|----------------|-----------------|---------|-------|----------|------------------|------------------|---------------|---------------|-----|",
      "| MAC-TS-42      | Login Suite     | R1      | S1    | Chrome   | v1               | Failed           | varis         | chrome, edge  | ... |",
      "",
      "MANDATORY COLUMNS (always first, in this order):",
      "  1. Test Suite Key    → tsEntityKey    (e.g. 'MAC-TS-42')",
      "  2. Test Suite Name   → tsName         (test suite display name)",
      "  3. Release           → releaseName",
      "  4. Cycle             → cycleName",
      "  5. Platform          → platformName",
      "  6. Executed Version  → executedVersion",
      "  7. Execution Status  → runStatusName",
      "  8. Tested By         → executionCreatedByLoginAlias/testedBy when present",
      "  9+. One column per UDF field — use testRunUdfs[i].label as header, testRunUdfs[i].value as cell.",
      "",
      "Null UDF values → show as '-'. If hasTcRunUdf is false, show columns 1-8 only.",
      "ISSUE EXECUTION UDF SOURCE — CRITICAL:",
      "Do NOT call 'Fetch Test Run UDF Values' for issue execution UDFs.",
      "Do NOT create or use another issue-specific UDF fetch tool.",
      "Use this tool's response directly: it calls /rest/execution/getExecutionsForIssue for execution rows, parses each row's udfjson for saved UDF values, and uses Test Run UDF metadata to include all configured UDF labels with null/empty values.",
      "=== END MANDATORY RESPONSE FORMAT ===",
      "",
      "CRITICAL: linkedAssetId is REQUIRED - this is the numeric defect ID from QMetry (not entity key like VKT-IS-5)",
      "HOW TO GET linkedAssetId: Call Fetch Defects or Issues tool → use data[<index>].id from the response",
      "AUTO-RESOLVE: If user provides an issue entity key (e.g. VKT-IS-5, MAC-IS-10), first call Fetch Defects or Issues with that entity key as filter, extract data[<index>].id, then use it as linkedAssetId",
      'AUTO-RESOLVE FILTER EXAMPLE: to resolve VKT-IS-5 → use filter \'[{"type":"string","value":"VKT-IS-5","field":"entityKeyId"}]\' in Fetch Defects or Issues tool',
      "This tool supports QMetry-native issues only — do NOT use for Jira-integrated projects",
      "API SOURCE: Execution rows and saved UDF values come from /rest/execution/getExecutionsForIssue. The udfjson field contains saved Test Run UDF values, e.g. Tested_By, execution_type, Country_mcp_udf, environments_udf.",
      "METADATA SOURCE: This tool also calls Test Run UDF metadata once to get all available labels, fieldIDs, field types, list options (qmUDFList), and empty fields. Merge metadata fields with udfjson values by UDF name.",
      "RESPONSE FIELDS: hasTcRunUdf=true means executions have UDF data; each execution includes a 'testRunUdfs' array with ALL project-defined UDF fields",
      "ALL UDF FIELDS: ALL project-defined Test Run UDF fields are returned for every execution — including fields not yet set (value: null)",
      "Each element in testRunUdfs: { name, label, fieldID, fieldType, value } — use fieldID when calling 'Bulk Update Test Run UDFs'",
      "VALUE RESOLUTION: For LOOKUPLIST and MULTILOOKUPLIST fields, values are resolved from their internal uniqueLabel key to the human-readable display name using qmUDFList lookup options. Always display the resolved name, not the raw uniqueLabel.",
      'EXAMPLE testRunUdfs: [{ "name": "TRString", "label": "TR String", "fieldID": 229241, "fieldType": "STRING", "value": "test" }, { "name": "lookup_browser", "label": "Lookup Browser MCP", "fieldID": 229433, "fieldType": "LOOKUPLIST", "value": "Chrome" }, { "name": "dateField", "label": "Date", "fieldID": 229255, "fieldType": "DATETIMEPICKER", "value": null }]',
      "FILTER FIELDS:",
      "  - tcName (string): filter by test case name substring",
      "  - linkageLevel (string): 'Test Case' or 'Test Step'",
      "  - executedVersion (string): version number as string e.g. '1'",
      '  - runStatusName (list): e.g. ["failed","passed","in progress"]',
      "  - platformID (list): numeric platform IDs e.g. [100145]. Get from FETCH_PLATFORMS tool",
      '  - executionCreatedByLoginAlias (list): usernames/login aliases e.g. ["john.doe"]',
      "  - isTestSuiteArchived (list): [1] active only, [0] archived only, [1,0] both",
      'FILTER FORMAT: JSON string array — \'[{"type":"list","field":"runStatusName","value":["failed"]}]\'',
      "Multiple filter conditions are combined with AND logic",
      "Use pagination (page, start, limit) for large result sets",
      "Get platform IDs using the FETCH_PLATFORMS tool before filtering by platformID",
      "Execution status names are case-sensitive — use lowercase: 'failed', 'passed', 'in progress', 'blocked', 'not run'",
      "hasTcRunUdf: false → No Test Run UDFs configured; testRunUdfs will not appear; a 'testRunUdfNote' field explains this.",
    ],
    outputDescription:
      "JSON object with 'data' array of execution records, 'hasTcRunUdf' boolean flag, and 'total' count. " +
      "Each execution record ALWAYS contains these mandatory identification fields: " +
      "'tsEntityKey' (Test Suite Key, e.g. 'MAC-TS-42'), 'tsName' (Test Suite Name), " +
      "'releaseName' (Release), 'cycleName' (Cycle), 'platformName' (Platform/environment), " +
      "'executedVersion' (Executed Version of the test case), 'runStatusName' (Execution Status label), " +
      "'tcRunID' (numeric Test Run ID), 'tcName' (Test Case Name), 'tcEntityKey' (Test Case Key), " +
      "and 'testRunUdfs' (array of objects each with name, label, fieldID, fieldType, value — use 'label' for display headers, null if not set). " +
      "For LOOKUPLIST and MULTILOOKUPLIST fields, 'value' contains the resolved human-readable display name (from qmUDFList), not the raw internal uniqueLabel key. " +
      "ALL project-defined UDF fields are always included, even those with no value. " +
      "When hasTcRunUdf is false, a 'testRunUdfNote' field provides a professional explanation instead.",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Issues Linked to Test Case",
    toolset: "Issues",
    summary:
      "Get issues that are linked (or not linked) to a specific test case in QMetry",
    handler: QMetryToolsHandlers.FETCH_ISSUES_LINKED_TO_TESTCASE,
    inputSchema: IssuesLinkedToTestCaseArgsSchema,
    purpose:
      "Retrieve issues/defects that are linked to a specific test case. " +
      "This tool provides traceability between test cases and issues, helping with " +
      "defect tracking, impact analysis, and test case validation. " +
      "The getLinked parameter is optional and defaults to true for fetching linked issues.",
    useCases: [
      "Get all issues linked to a specific test case for defect tracking",
      "Find issues that are NOT linked to a test case (gap analysis)",
      "Generate traceability reports between test cases and issues",
      "Filter issues by type, priority, status, or owner",
      "Monitor issue resolution progress for specific test cases",
      "Audit issue-test case relationships for compliance",
      "Filter issues by summary content or execution version",
      "Get issue details for test execution planning",
      "Track linkage level (Test Case vs Test Step level)",
      "Quality assurance - ensure proper issue tracking",
    ],
    examples: [
      {
        description:
          "Get all issues linked to test case ID 4495658 (default behavior)",
        parameters: { tcID: 4495658 },
        expectedOutput:
          "List of issues linked to the test case with issue details, status, and metadata",
      },
      {
        description: "Get all issues linked to test case ID 4495658 (explicit)",
        parameters: { tcID: 4495658, getLinked: true },
        expectedOutput:
          "List of issues linked to the test case with issue details, status, and metadata",
      },
      {
        description: "Get issues NOT linked to test case (gap analysis)",
        parameters: { tcID: 4495658, getLinked: false },
        expectedOutput: "List of issues that are NOT linked to the test case",
      },
      {
        description: "Get linked issues with pagination",
        parameters: { tcID: 4495658, getLinked: true, limit: 25, page: 1 },
        expectedOutput: "Paginated list of issues linked to the test case",
      },
      {
        description:
          "Filter linked issues by summary content (using default getLinked=true)",
        parameters: {
          tcID: 4495658,
          filter: '[{"value":"login","type":"string","field":"summary"}]',
        },
        expectedOutput:
          "Issues linked to test case that contain 'login' in their summary",
      },
      {
        description: "Filter linked issues by status and priority",
        parameters: {
          tcID: 4495658,
          getLinked: true,
          filter:
            '[{"value":[1,2],"type":"list","field":"issueState"},{"value":[1],"type":"list","field":"issuePriority"}]',
        },
        expectedOutput: "High priority issues in Open or In Progress status",
      },
      {
        description: "Filter issues by execution version",
        parameters: {
          tcID: 4495658,
          getLinked: true,
          filter: '[{"value":"2","type":"string","field":"executedVersion"}]',
        },
        expectedOutput: "Issues linked to version 2 of the test case execution",
      },
    ],
    hints: [
      "CRITICAL: tcID parameter is REQUIRED - this is the Test Case numeric ID",
      "getLinked parameter is OPTIONAL - defaults to true if not provided",
      "HOW TO GET tcID:",
      "1. Call FETCH_TEST_CASES with filter on entityKeyId to resolve test case key to numeric ID",
      "2. From response, use data[index].tcID field",
      "3. Example: MAC-TC-1684 → tcID: 4495658",
      "getLinked=true (default): Returns issues that ARE linked to the test case",
      "getLinked=false: Returns issues that are NOT linked to the test case (useful for gap analysis)",
      "If getLinked is not specified, it defaults to true (linked issues)",
      "FILTER CAPABILITIES: Extensive filtering by issue properties",
      "FILTER FIELDS: summary (string), executedVersion (string), linkageLevel (string), issueType (list), issuePriority (list), issueState (list), owner (list)",
      "LINKAGE LEVEL: 'Test Case' for test case level links, 'Test Step' for step level links",
      "ISSUE TYPE IDs: Typically 1=Bug, 2=Enhancement, 3=Task (verify with your QMetry instance)",
      "ISSUE PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "ISSUE STATUS IDs: Typically 1=Open, 2=In Progress, 3=Resolved, 4=Closed (verify with your QMetry instance)",
      "OWNER IDs: Use numeric user IDs from QMetry user management",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large issue result sets (start, page, limit parameters)",
      "This tool is essential for defect tracking and traceability audits",
      "Helps establish relationships between test failures and reported issues",
      "Critical for impact analysis when test cases change",
      "Use for compliance reporting and quality metrics",
    ],
    outputDescription:
      "JSON object with issues array containing issue details, priorities, status, and linkage information",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Issue Details",
    toolset: "Issues",
    summary:
      "Fetch full detail data for a QMetry issue including UDF field values",
    handler: QMetryToolsHandlers.FETCH_ISSUE_DETAILS,
    inputSchema: FetchIssueDetailsArgsSchema,
    purpose:
      "Get complete issue details including UDF values. Use this when you need UDF field data for a specific issue — the list API (Fetch Issues) omits UDF values.",
    useCases: [
      "Get UDF field values for a specific issue",
      "Retrieve full issue metadata including custom fields",
      "Inspect issue details before updating UDF values",
    ],
    examples: [
      {
        description: "Fetch details for issue with DefectId 1430676",
        parameters: { defectId: 1430676 },
        expectedOutput:
          "Full issue detail object with UDFTypeData map and all UDF field values including MUL1, TCR_STR, etc.",
      },
    ],
    hints: [
      "CRITICAL: Use 'data[<index>].id' from Fetch Issues/Defects response as 'defectId'. The list API response field is named 'id' — there is no 'DefectId' field in the list response. Do NOT guess or derive defectId from the entity key suffix.",
      'AUTO-RESOLVE: If user provides an issue entity key (e.g. VKMCP2-IS-1, MAC-IS-10), first call Fetch Defects or Issues with filter \'[{"type":"string","value":"VKMCP2-IS-1","field":"entityKeyId"}]\', then use \'data[<index>].id\' as defectId.',
      "UDF VALUES: Response includes a 'UDFTypeData' map with all UDF field values for the issue.",
      "WORKFLOW: To fetch issue UDF values — (1) Fetch Issues with entityKey filter → get data[0].id, (2) in parallel Fetch UDF Layout entityType='IS' pageName='DETAIL' → get field labels/types, (3) call this tool with defectId=data[0].id → read UDFTypeData.",
    ],
    outputDescription:
      "JSON object with data property containing full issue details including UDFTypeData map and all UDF field values",
    readOnly: true,
    idempotent: true,
  },
];
