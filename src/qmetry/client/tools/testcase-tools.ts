import { QMetryToolsHandlers } from "../../config/constants";
import {
  CreateTestCaseArgsSchema,
  LinkTestcaseToIssuesArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseExecutionsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseStepsArgsSchema,
  TestCaseStepsWithUdfArgsSchema,
  TestCaseVersionDetailsArgsSchema,
  UpdateTestCaseArgsSchema,
} from "../../types/common";
import type { QMetryToolParams } from "./types";

export const TESTCASE_TOOLS: QMetryToolParams[] = [
  {
    title: "Create Test Case",
    toolset: "Test Cases",
    summary:
      "Create a new test case in QMetry with steps, metadata, and release/cycle mapping.",
    handler: QMetryToolsHandlers.CREATE_TEST_CASE,
    inputSchema: CreateTestCaseArgsSchema,
    purpose:
      "REQUIRED WORKFLOW: Before calling this tool, ALWAYS call 'Fetch UDF Layout' (entityType='TC', pageName='ADD') first. " +
      "That call reveals mandatory UDF fields, system field requirements, and default values to auto-apply. " +
      "Skipping it causes CO.MANDATORY_FIELDS_MISSING errors. " +
      "Allows users to create a new test case in QMetry, including steps, custom fields, and release/cycle mapping. " +
      "Supports all major test case fields and step-level UDFs. " +
      "For fields like priority, owner, component, etc., fetch their valid values using the project info tool. " +
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info.\n\n" +
      "STEPS RULE (CRITICAL — apply before every create call):\n" +
      "Include 'steps' in the payload UNLESS the user explicitly says not to create steps.\n" +
      "  - SCENARIO 1: User explicitly provides steps → use them as given.\n" +
      "  - SCENARIO 2: User has NOT mentioned steps (and did not say to skip them) → generate meaningful steps from the test case name, description, and context. Use your knowledge to infer logical test steps.\n" +
      "  - SCENARIO 3: User explicitly says NOT to create steps (e.g. 'no steps', 'without steps', 'skip steps') → set skipSteps: true and omit the 'steps' field entirely.\n" +
      "  - NEVER send steps: [] (empty array) — either send at least 1 valid step object or omit steps entirely with skipSteps: true.\n" +
      "STEP DEFAULT VALUES: After generating or parsing steps, check 'stepDefaultValues' from Fetch UDF Layout.\n" +
      "  For each step field that has a default value in stepDefaultValues AND the user has not explicitly provided a value for that field in the step: send the default value.\n" +
      "  Do NOT ask the user — auto-apply defaults silently.",

    useCases: [
      "Create a basic test case with just a name and folder",
      "Add detailed steps with custom fields (UDFs) to a test case",
      "Associate test case with specific release/cycle for planning",
      "Set priority, owner, component, and other metadata using valid IDs from project info",
      "Create test cases for automation or manual testing types",
      "Add test case to a specific folder using tcFolderID",
      "Include estimated execution time and description",
      "Map test case to multiple cycles/releases",
    ],
    examples: [
      {
        description:
          "MOST COMMON: User provides only a name — steps are auto-generated from context.",
        parameters: {
          name: "Login Test Case",
          steps: [
            { orderId: 1, description: "Navigate to the login page" },
            { orderId: 2, description: "Enter valid username and password" },
            { orderId: 3, description: "Click the Login button" },
            {
              orderId: 4,
              description: "Verify successful login and dashboard is shown",
            },
          ],
        },
        expectedOutput:
          "Test case created with auto-generated steps inferred from the test case name 'Login Test Case'.",
      },
      {
        description:
          "Create test case with metadata only — steps auto-generated from context",
        parameters: {
          tcFolderID: "102653",
          name: "Login Test Case",
          priority: 2025268,
          testCaseState: 2025271,
          estimatedTime: 3600,
          description: "Verifies login flow",
          steps: [
            { orderId: 1, description: "Navigate to the login page" },
            { orderId: 2, description: "Enter valid credentials" },
            { orderId: 3, description: "Submit the login form" },
            { orderId: 4, description: "Verify redirection to the home page" },
          ],
        },
        expectedOutput:
          "Test case created with metadata and auto-generated steps based on description 'Verifies login flow'.",
      },
      {
        description:
          "SCENARIO 1: User explicitly asked for steps — 'create test case with step 1 - Go to login page, step 2 - enter credentials'",
        parameters: {
          tcFolderID: "102653",
          name: "Login Flow Test",
          steps: [
            {
              orderId: 1,
              description: "Go to login page",
            },
            {
              orderId: 2,
              description: "Enter credentials",
            },
          ],
        },
        expectedOutput:
          "Test case created with 2 steps because user explicitly mentioned steps in prompt.",
      },
      {
        description:
          "SCENARIO 1: User provided steps with full metadata (steps explicitly mentioned in prompt)",
        parameters: {
          tcFolderID: "102653",
          name: "Test Case 1",
          steps: [
            {
              orderId: 1,
              description: "First Step",
              inputData: "First Data",
              expectedOutcome: "First Outcome",
              UDF: {
                customField1: "Custom Field Data A",
                customField2: "Custom Field Data B",
              },
            },
          ],
          priority: 2025268,
          component: [2025328],
          testcaseOwner: 1467,
          testCaseState: 2025271,
          testCaseType: 2025282,
          estimatedTime: 10,
          description: "Description",
          testingType: 2025275,
          associateRelCyc: true,
          releaseCycleMapping: [
            {
              release: 14239,
              cycle: [21395],
              version: 1,
            },
          ],
        },
        expectedOutput:
          "Test case created with steps because user explicitly requested steps. All metadata populated.",
      },
      {
        description:
          "SCENARIO 3: User explicitly says no steps — 'create a test case without any steps'",
        parameters: {
          name: "Login Test Case",
          skipSteps: true,
        },
        expectedOutput:
          "Test case created with no steps because user explicitly asked to skip them.",
      },
      {
        description:
          "User provides name only — steps auto-generated from test case name context",
        parameters: {
          name: "Password Reset Test Case",
          steps: [
            { orderId: 1, description: "Navigate to the login page" },
            { orderId: 2, description: "Click on 'Forgot Password' link" },
            {
              orderId: 3,
              description:
                "Enter registered email address and submit the reset form",
            },
            {
              orderId: 4,
              description: "Click reset link from email and set a new password",
            },
            {
              orderId: 5,
              description: "Verify login succeeds with the new password",
            },
          ],
        },
        expectedOutput:
          "Test case created with 5 auto-generated steps inferred from the name 'Password Reset Test Case'. No user-provided steps — LLM generated them from context.",
      },
    ],
    hints: [
      "╔══════════════════════════════════════════════════════════════════════════════╗",
      "║  STEPS RULE — INCLUDE STEPS UNLESS USER EXPLICITLY ASKS TO SKIP THEM         ║",
      "╚══════════════════════════════════════════════════════════════════════════════╝",
      "",
      "Include 'steps' in the payload unless the user explicitly says NOT to create steps.",
      "NEVER send steps: [] (empty array) — either send at least 1 valid step object or omit steps with skipSteps: true.",
      "",
      "HOW TO POPULATE STEPS:",
      "",
      "  SCENARIO 1 — User explicitly provides steps in their prompt.",
      "    Trigger phrases: 'with steps', 'step 1 -', 'add steps', 'include steps', 'following steps', 'these steps'.",
      "    Action: Parse the user's step text into { orderId, description, inputData?, expectedOutcome? } objects.",
      "    Example: 'create test case, step 1 - open browser, step 2 - click login'",
      "      → steps: [{ orderId: 1, description: 'open browser' }, { orderId: 2, description: 'click login' }]",
      "",
      "  SCENARIO 2 — User does NOT mention steps at all.",
      "    Action: Generate meaningful steps based on the test case name, description, and all other context provided.",
      "    Use your knowledge of the feature/flow being tested to infer logical, realistic test steps.",
      "    Always include 2-5 steps that make sense for the test case.",
      "    Example: name='Login Test Case' → steps: [{orderId:1, description:'Navigate to login page'}, {orderId:2, description:'Enter credentials'}, {orderId:3, description:'Submit form'}, {orderId:4, description:'Verify login success'}]",
      "",
      "  SCENARIO 3 — User explicitly says NOT to create steps.",
      "    Trigger phrases: 'no steps', 'without steps', 'skip steps', 'don\\'t add steps', 'without any steps'.",
      "    Action: Set skipSteps: true and omit the 'steps' field entirely from the payload.",
      "    Example: 'create test case Login Test Case without steps' → { name: 'Login Test Case', skipSteps: true }",
      "",
      "STEP DEFAULT VALUES — apply after step generation (scenarios 1 and 2 only):",
      "  After building the steps array (from user input OR auto-generated), check 'stepDefaultValues' from Fetch UDF Layout.",
      "  stepDefaultValues shape: { fieldName: defaultValue } — e.g. { 'lookup19': 5232630 }",
      "  For EACH step, for EACH key in stepDefaultValues:",
      "    IF the user has NOT explicitly specified a value for that field in the step → set it to the default value.",
      "  This applies to step UDF fields (step.UDF) that have defaults configured.",
      "  Auto-apply silently — do NOT ask the user.",
      "  Example: stepDefaultValues = { status: 5232630 } → every step's UDF.status = 5232630 unless user gave a different value.",
      "",
      "DECISION TABLE:",
      "  | Situation                          | Action                                                                      |",
      "  |------------------------------------|-----------------------------------------------------------------------------|",
      "  | User provided steps                | Use steps from user's prompt; fill step UDF defaults from stepDefaultValues |",
      "  | User did not mention steps         | Auto-generate steps from context; fill step UDF defaults from stepDefaultValues |",
      "  | User explicitly said NO steps      | Set skipSteps: true, omit 'steps' field entirely                            |",
      "",
      "╚══════════════════════════════════════════════════════════════════════════════╝",
      "",
      "╔══════════════════════════════════════════════════════════════════╗",
      "║  STEP 0 — NON-NEGOTIABLE: Call 'Fetch UDF Layout' BEFORE create  ║",
      "╚══════════════════════════════════════════════════════════════════╝",
      "NEVER call 'Create Test Case' without first calling 'Fetch UDF Layout' with entityType='TC', pageName='ADD'.",
      "Skipping this step WILL cause 400 errors (CO.MANDATORY_FIELDS_MISSING) because mandatory fields and defaults are unknown.",
      "This rule has NO exceptions — not even when the user only provided a name and nothing else.",
      "",
      "=== MANDATORY PRE-CREATE CHECK ===",
      "",
      "SYSTEM FIELDS mandatory check — use 'systemFields' array from Fetch UDF Layout:",
      "  Each entry: { name, label, fieldTypeName, isMandatory }",
      "  isMandatory=true (allowBlank=false in QMetry) means the field MUST have a value.",
      "  IMPORTANT: QMetry's API sometimes returns 'systemFields: []' (empty) even when system fields ARE mandatory.",
      "  If 'systemFields' is empty, treat the following as always mandatory: name (Summary), testCaseState (Status).",
      "  For testCaseState default: check 'customListObjs.testCaseState' from Fetch Project Info — use first non-archived entry as fallback.",
      "",
      "UDF FIELDS mandatory check — use 'fields' array from Fetch UDF Layout:",
      "  Each entry: { name, label, fieldTypeName, isMandatory, listName? }",
      "  IMPORTANT: QMetry's API sometimes returns isMandatory=false for fields that ARE enforced as mandatory.",
      "  The 'isMandatory' flag is a hint, not a guarantee. Trust the actual API error over this flag.",
      "  When isMandatory=true: field MUST have a value.",
      "",
      "DEFAULT VALUES — use 'defaultValues' object from Fetch UDF Layout:",
      "  Shape: { fieldName: defaultValueId }  e.g. { 'lookup19': 5232630, 'estimatedTime': 18305.0, 'priority': 5232497 }",
      "  These are pre-configured QMetry defaults. ALWAYS auto-apply them — even when user did not mention the field.",
      "  IMPORTANT: QMetry's API sometimes returns 'defaultValues: {}' (empty) even when defaults exist in QMetry settings.",
      "  If 'defaultValues' is empty, you cannot auto-apply — ask user for mandatory fields without defaults.",
      "  RULE: if isMandatory=true AND defaultValues[field.name] exists → use default, do NOT ask user.",
      "  RULE: if isMandatory=true AND NO defaultValues[field.name] → MUST ask user before creating.",
      "  RULE: if isMandatory=false AND defaultValues[field.name] exists → auto-apply default if user didn't specify.",
      "  RULE: if isMandatory=false AND no default → skip if user didn't provide.",
      "",
      "╔══════════════════════════════════════════════════════════════════════════╗",
      "║  PRE-FLIGHT DEFAULT SWEEP — MANDATORY STEP BEFORE EVERY CREATE CALL     ║",
      "╚══════════════════════════════════════════════════════════════════════════╝",
      "After resolving mandatory fields, do a full sweep of ALL defaultValues entries:",
      "  For EACH key in defaultValues:",
      "    IF the user did not explicitly provide that field → add it to the payload using the default value.",
      "    This applies regardless of isMandatory — non-mandatory defaults MUST also be auto-applied.",
      "  Example: defaultValues = { lookup19: 5232630, estimatedTime: 18305, priority: 5232497 }",
      "    → user only said 'create a test case named X'",
      "    → payload MUST include: lookup19=5232630, estimatedTime=18305, priority=5232497",
      "    → WRONG to omit priority/estimatedTime just because they are not mandatory — they have defaults.",
      "  Skipping this sweep = missing fields in the created record = user-visible data loss.",
      "╚══════════════════════════════════════════════════════════════════════════╝",
      "",
      "TEST CASE STEPS — always required (see STEPS RULE above):",
      "  stepSystemFields: built-in step fields { name, label, fieldTypeName, isMandatory }",
      "  stepFields: step-level UDF fields { name, label, fieldTypeName, isMandatory, listName? }",
      "  Mandatory stepFields UDFs (isMandatory=true) must be filled in step.UDF — use stepDefaultValues for defaults, else a placeholder value.",
      "  STEP DEFAULT VALUES: use 'stepDefaultValues' object from Fetch UDF Layout — same auto-fill logic as defaultValues.",
      "    For EACH key in stepDefaultValues: if user has NOT explicitly provided a value for that step field → auto-apply the default silently.",
      "    This applies to all steps (both user-provided and auto-generated).",
      "",
      "DECISION MATRIX:",
      "  | isMandatory | Has default | Action                              |",
      "  |-------------|-------------|-------------------------------------|",
      "  | true        | YES         | Auto-fill with default, no ask      |",
      "  | true        | NO          | Ask user before creating            |",
      "  | false       | YES         | Auto-fill with default — REQUIRED   |",
      "  | false       | NO          | Skip if user didn't provide         |",
      "",
      "Only after ALL mandatory fields are resolved AND default sweep is complete → proceed with create.",
      "=== END MANDATORY PRE-CREATE CHECK ===",
      "",
      "=== ERROR RECOVERY: CO.MANDATORY_FIELDS_MISSING ===",
      "If create fails with error code 'CO.MANDATORY_FIELDS_MISSING', DO NOT give up. Auto-recover:",
      "  1. Parse the 'MISSING_FIELDS' list from the error response (comma-separated field labels).",
      "  2. Match each label against 'fields[].label' and 'systemFields[].label' from the Fetch UDF Layout response.",
      "  3. For matched UDF fields: check 'listOptions[field.listName]' for valid option IDs.",
      "  4. For matched system fields (e.g. 'Status'): check 'customListObjs.testCaseState' from project info.",
      "  5. If the field has a 'defaultValues' entry: auto-fill it silently.",
      "  6. If no default exists: ask the user ONLY for the missing fields by label.",
      "  7. Retry create with the resolved values added to the payload.",
      "  NEVER ask user to 'try again' manually — resolve and retry automatically.",
      "=== END ERROR RECOVERY ===",
      "",
      "=== DATE FORMAT CHECK (MANDATORY — EVERY CREATE REQUEST) ===",
      "ALWAYS call 'Fetch QMetry Project Info' before every create request — not only when the user explicitly mentions a date.",
      "Any UDF field could be a DATETIMEPICKER. Wrong format causes QMetry to silently discard the field value (API returns success but value is NOT stored — no error).",
      "Project info response contains 'dateTimeFormatID' and 'dateTimeFormatNew' array.",
      "STEP 1: From project info, read dateTimeFormatID (e.g. 3).",
      "STEP 2: Find entry in dateTimeFormatNew where id === dateTimeFormatID → read its unique_value (e.g. 'yyyy-MM-dd').",
      "STEP 3: unique_value is the Java/QMetry format pattern. Mapping:",
      "  yyyy = 4-digit year | MM = 2-digit month (01-12) | dd = 2-digit day | MMM = 3-letter month (Jan/Feb/...)",
      "  Example: id=1 → MM-dd-yyyy → '10-25-2000' | id=2 → dd-MM-yyyy → '25-10-2000' | id=3 → yyyy-MM-dd → '2000-10-25' | id=4 → dd-MMM-yyyy → '25-Oct-2000'",
      "STEP 4: For EVERY DATETIMEPICKER field in the payload (user-provided OR from defaultValues):",
      "  - Parse the date regardless of what format the user typed",
      "  - Re-format it using the active unique_value pattern",
      "  - Send the re-formatted string to the API",
      "Examples with unique_value='yyyy-MM-dd':",
      "  User says '25 Dec 2024' → send '2024-12-25'",
      "  User says '12/25/2024' → send '2024-12-25'",
      "  Default value is a date string '2024-12-25' → already correct, keep it",
      "NEVER send a date in a format different from the project's active dateTimeFormatID format.",
      "Fetch project info ONCE per create/update operation and reuse dateTimeFormatID for all date fields.",
      "=== END DATE FORMAT CHECK ===",
      "",
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info (rootFolders.TC.id).",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "STALE / NOT-FOUND ID RECOVERY (applies to ALL system fields — priority, component/label, owner, status, testCaseType, testingType, release, cycle): " +
        "If the user references a value by name and it is NOT found in your current cached project info data, DO NOT give up or skip the field immediately. " +
        "Instead: call 'Fetch QMetry Project Info' fresh (no arguments needed) to get the latest snapshot, then re-scan the relevant customListObjs list. " +
        "This is mandatory when: (a) the user just added a new label/priority/status/user in QMetry UI, or (b) the cached info is from an earlier turn. " +
        "Only skip + show a friendly message if the value is still missing AFTER the fresh fetch.",
      "FOLDER ID RESOLUTION (tcFolderID): " +
        "Project info only exposes the ROOT folder ID (rootFolders.TC.id). Sub-folder IDs are NOT returned by project info. " +
        "If the user specifies a sub-folder (e.g. 'Folder 1'), use this resolution order: " +
        "1. Check if the user already provided the numeric folder ID — use it directly. " +
        "2. Try fetching test cases with folderPath='<folder name>' and scope='folder' — if a TC exists there, its folder context confirms the path, but the ID is still needed from the UI. " +
        "3. If still unresolved, ask the user: 'Please provide the numeric folder ID for \"<folder name>\". You can find it in the QMetry URL when browsing that folder (look for folderId=XXXXX).' " +
        "NEVER silently fall back to root folder when the user explicitly named a sub-folder — always ask first.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found after a fresh fetch, skip the priority field (it is not required) and show a user-friendly message: 'Test case created without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case created without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case created without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case created without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case created without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case created without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Create test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the create payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case created without priority, as given priority is not available in the current project.'",
      "tcFolderID is required; use the root folder ID from project info or a specific folder.",
      "STEPS: ALWAYS include steps in the payload. If user did not provide steps, auto-generate them from the test case name and context. See STEPS RULE at top of hints.",
      "If the user provides a prompt like 'create test case with steps as step 1 - Go to login page, step 2 - give credential, step 3 - go to test case page, step 4 - create test case', LLM should parse each step and convert it into the steps payload array, mapping each step to an object with orderId, description, and optionally inputData and expectedOutcome.",
      "Example mapping: 'step 1 - Go to login page' → { orderId: 1, description: 'Go to login page' }.",
      "LLM should increment orderId for each step, use the step text as description, and optionally infer inputData/expectedOutcome if provided in the prompt.",
      "Demo steps payload: steps: [ { orderId: 1, description: 'First Step', inputData: 'First Data', expectedOutcome: 'First Outcome', UDF: { customField1: 'Custom Field Data A', customField2: 'Custom Field Data B' } }, ... ]",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the test case, set associateRelCyc: true in the payload.",
      "If the user provides a release ID, map it from projects.releases[index].releaseID in the project info response, and use that ID in releaseCycleMapping.",
      "If the user provides both release and cycle IDs, validate both against the current project's releases and cycles; if valid, use them in releaseCycleMapping.",
      "When adding releaseCycleMapping, always include the 'version' field (usually set to 1) in each mapping object. The correct format is: { release: <releaseID>, cycle: [<cycleID>], version: 1 }. If 'version' is missing, the request will fail.",
      "If the user provides a release name, map it to its ID from project info; if a cycle name is provided, map it to its ID from the associated release's builds list.",
      "Example payload: releaseCycleMapping: [ { release: <releaseID>, cycle: [<cycleID>], version: 1 } ]",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Test case created without release/cycle association, as given release/cycle is not available in the current project.'",
      "All IDs (priority, owner, etc.) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
      "estimatedTime is in SECONDS (e.g. 3600 = 1 hour, 36000 = 10 hours). NOT minutes.",
      "Description and testingType are optional but recommended for clarity.",
      "",
      "UDF (User Defined Fields) WORKFLOW FOR CREATE:",
      "1. Call 'Fetch UDF Layout' with entityType='TC', pageName='ADD' to discover field names, types, list option IDs, and udfmID (projectUserFieldID).",
      "   IF listOptions[field.listName] is empty after Fetch UDF Layout, the tool already tried a metadata fallback. " +
        "   If STILL empty, ask the user to provide the option ID from the QMetry UI — do NOT guess numeric IDs.",
      "2. For LOOKUPLIST fields: pick one ID from listOptions[field.listName][].id.",
      "3. For MULTILOOKUPLIST fields: pick an array of IDs from listOptions[field.listName][].id.",
      "4. For CASCADINGLIST fields (ROOT-LEVEL UDF — MANDATORY STEPS):",
      "   a. MUST call 'Fetch Cascade Child Values' with parentId to get available child options (do NOT skip this step).",
      "   b. Pass the cascade value as: { parent: parentId, child: childId } in udfFields.",
      "   Example: udfFields: { project19: { parent: 5232623, child: 5232625 } }",
      "5. For STRING/LARGETEXT/NUMBER/DATETIMEPICKER: pass value directly.",
      "6. Pass all UDF values via 'udfFields' param: { fieldName: value }.",
      "7. Mandatory UDF fields (isMandatory=true) MUST be included or create will fail.",
      "",
      "STEP UDFs: Pass step UDF values in each step's 'UDF' object.",
      "Call 'Fetch UDF Layout' for stepFields to discover field names, types, and udfmID (projectUserFieldID).",
      "Step UDF field types follow same rules as root UDF EXCEPT for CASCADINGLIST — step cascade requires a DIFFERENT format:",
      "",
      "STEP CASCADINGLIST UDF FORMAT (critical — different from root cascade):",
      "For a cascade field named 'project19' with udfmID=2637584, parent={id:5232626, value:'React'}, child={id:5232628, value:'Redux'}:",
      "You MUST include THREE keys inside the step's UDF object:",
      "  1. fieldName: { parent: parentId, child: childId }",
      "     e.g. project19: { parent: 5232626, child: 5232628 }",
      "  2. fieldName_value: [{ FieldID: 'fieldName', FieldValue: [{ id: parentId, value: 'parentLabel', child: { id: childId, value: 'childLabel' } }], type: 'CASCADINGLIST' }]",
      "     e.g. project19_value: [{ FieldID: 'project19', FieldValue: [{ id: 5232626, value: 'React', child: { id: 5232628, value: 'Redux' } }], type: 'CASCADINGLIST' }]",
      "  3. fieldName_selectedList: { id: udfmID, name: 'fieldName', type: 'CASCADINGLIST' }",
      "     e.g. project19_selectedList: { id: 2637584, name: 'project19', type: 'CASCADINGLIST' }",
      "To get parentLabel and childLabel: call 'Fetch Cascade Child Values' — it returns option labels alongside IDs.",
      "udfmID comes from Fetch UDF Layout stepFields[].projectUserFieldID.",
      "NEVER omit _value or _selectedList for step cascade fields — the API silently ignores cascade data without them.",
    ],
    outputDescription:
      "JSON object containing the new test case ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Test Case",
    toolset: "Test Cases",
    summary:
      "Update an existing QMetry test case OR create a new version by tcID and tcVersionID, with auto-resolution from entityKey.",
    handler: QMetryToolsHandlers.UPDATE_TEST_CASE,
    inputSchema: UpdateTestCaseArgsSchema,
    purpose:
      "Update a QMetry test case's metadata, steps, or other fields. Can also create NEW VERSIONS of test cases. " +
      "Requires tcID and tcVersionID, which can be auto-resolved from the test case entityKey using the test case list and version detail tools. " +
      "Supports updating summary, priority, owner, component, state, type, description, steps, and more. Only fields provided will be updated. " +
      "VERSION CREATION: Set withVersion=true to create a NEW incremental version (e.g., version 2→3). Without this flag, updates existing version. " +
      "CRITICAL ANTI-DUPLICATION: When updating steps, ALWAYS include tcStepID for existing steps to update them in place. " +
      "Steps WITHOUT tcStepID are treated as NEW steps and will be ADDED (causing duplication if you meant to update). " +
      "Always fetch existing steps first using FETCH_TEST_CASE_STEPS to get their tcStepID values before updating.",
    useCases: [
      "Update test case summary (name)",
      "Change priority, owner, or state of a test case",
      "Edit, add, or remove test steps",
      "Update only metadata (no steps)",
      "Create a new version of a test case (withVersion=true)",
      "Update a specific version of a test case (without withVersion flag)",
      "Bulk update using entityKey auto-resolution",
      "Modify test case description or estimated time",
      "Change test case type or component",
      "Update testing type or custom fields",
      "Update, add and remove test case steps",
      "Version control for test case evolution tracking",
    ],
    examples: [
      {
        description: "Update test case summary (existing version update)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          name: "MAC Test11",
        },
        expectedOutput:
          "Test case summary updated. tcID and tcVersionID auto-resolved from entityKey. Only 'name' field changed. Version remains the same.",
      },
      {
        description: "Create NEW VERSION with updated summary and description",
        parameters: {
          tcID: 4572654,
          tcVersionID: 5514384,
          tcVersion: 1,
          name: "Add two numbers 2 v2",
          description: "Test Description version 2",
          withVersion: true,
          versionComment: "version 2 comment add",
          notruncurrent: true,
          notrunall: true,
        },
        expectedOutput:
          "New version created (version 2). Test case now has incremental version with updated summary and description. Original version 1 remains unchanged.",
      },
      {
        description:
          "Create NEW VERSION with all metadata fields (release, cycle, priority, owner, etc.)",
        parameters: {
          tcID: 4572654,
          tcVersionID: 5514384,
          tcVersion: 1,
          name: "Facebook Login Validation Failed update from MCP V2",
          description: "Existing description V2",
          priority: 2355751,
          testcaseOwner: 6963,
          testCaseState: 2355753,
          testCaseType: 2355762,
          estimatedTime: 7200,
          withVersion: true,
          versionComment: "Created version 2 with updated metadata",
          notruncurrent: true,
          notrunall: true,
          folderPath: 602290,
          scope: "project",
        },
        expectedOutput:
          "New test case version 2 created with updated summary, description, priority (High), owner (umang.savaliya), state, type, and estimated time (2 hours). Version comment added for tracking.",
      },
      {
        description: "Update EXISTING VERSION 2 (not creating new version)",
        parameters: {
          tcID: 4572654,
          tcVersionID: 5514385,
          name: "Updated version 2 name",
          priority: 2355752,
        },
        expectedOutput:
          "Version 2 updated with new name and priority. No new version created because withVersion flag is not set. This is a normal update of existing version.",
      },
      {
        description:
          "Update priority to High and owner to john.doe (existing version)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          priority: 505015,
          testcaseOwner: 6963,
        },
        expectedOutput:
          "Priority and owner updated. Field IDs auto-resolved from project info. tcID/tcVersionID resolved from entityKey. Existing version modified.",
      },
      {
        description: "Update steps (edit, add, remove) - existing version",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          steps: [
            {
              orderId: 1,
              description: "Step 22",
              inputData: "Input 22",
              expectedOutcome: "Outcome 22",
              tcStepID: 3014032, // CRITICAL: Include tcStepID to UPDATE existing step (not create duplicate)
            },
            {
              orderId: 2,
              description: "Step3",
              inputData: "Input 3",
              expectedOutcome: "Outcome 3",
              // CRITICAL: No tcStepID = CREATE NEW step
            },
          ],
          removeSteps: [
            { tcStepID: 3014031, description: "Step 1", orderId: 1 },
          ],
          isStepUpdated: true,
        },
        expectedOutput:
          "Steps updated: Step 22 edited (tcStepID preserved), Step3 added (no tcStepID), Step 1 removed. tcID/tcVersionID auto-resolved. Existing version modified.",
      },
      {
        description: "Create NEW VERSION with updated steps",
        parameters: {
          tcID: 4572654,
          tcVersionID: 5514384,
          tcVersion: 1,
          name: "Add two numbers 2 v2",
          steps: [
            {
              orderId: 1,
              description: "I and u have a calculator",
              inputData: "",
              expectedOutcome: "",
              tcStepID: 38001791,
            },
            {
              orderId: 2,
              description: "I add 41 and 31",
              inputData: "",
              expectedOutcome: "",
              tcStepID: 38001793,
            },
            {
              orderId: 3,
              description: "the result should be 72",
              inputData: "",
              expectedOutcome: "",
              tcStepID: 38001792,
            },
          ],
          withVersion: true,
          versionComment: "version 2 with preserved steps",
          notruncurrent: true,
          notrunall: true,
          isStepUpdated: true,
        },
        expectedOutput:
          "New version 2 created with all steps from version 1 preserved. Steps carry forward with their tcStepID values. Version comment added for tracking.",
      },
      {
        description: "Update only metadata (no steps) - existing version",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          updateOnlyMetadata: true,
          name: "New Name",
        },
        expectedOutput:
          "Metadata updated only. Steps unchanged. tcID/tcVersionID auto-resolved. Existing version modified.",
      },
      {
        description:
          "Create NEW VERSION from existing version 2 with updated steps (working payload for linked test cases)",
        parameters: {
          tcID: 4594145,
          tcVersionID: 5536706,
          tcVersion: 2,
          name: "Mock Test Case - E-commerce Checkout Flow - v3",
          steps: [
            {
              orderId: 1,
              description: "Open browser and navigate to e-commerce website",
              expectedOutcome:
                "Homepage loads successfully with product catalog",
              inputData: "URL: https://example-shop.com",
              tcStepID: 38129471,
            },
            {
              orderId: 2,
              description: "Search for product",
              expectedOutcome: "Search results display relevant products",
              inputData: "Search term: 'wireless headphones'",
              tcStepID: 38129475,
            },
            {
              orderId: 3,
              description: "Select product and add to cart",
              expectedOutcome: "Product added to cart, cart counter increments",
              inputData: "Click 'Add to Cart' button",
              tcStepID: 38129472,
            },
            {
              orderId: 4,
              description: "Proceed to checkout",
              expectedOutcome: "Checkout page displays with cart summary",
              inputData: "Click cart icon and 'Proceed to Checkout'",
              tcStepID: 38129473,
            },
            {
              orderId: 5,
              description: "Complete payment",
              expectedOutcome: "Order confirmation page displayed",
              inputData: "Fill payment details and submit",
              tcStepID: 38129474,
            },
            {
              orderId: 6,
              description: "Verify order confirmation email received",
              expectedOutcome: "Email with order details received in inbox",
              inputData: "Check email account for confirmation",
            },
            {
              orderId: 7,
              description: "Check order status in account dashboard",
              expectedOutcome:
                "Order status shows as 'Processing' with tracking information",
              inputData: "Navigate to My Orders section",
            },
          ],
          withVersion: true,
          versionComment:
            "Created version 3: Added 2 new verification steps (email and order status check)",
          notrunall: false,
          notruncurrent: false,
          scope: "project",
        },
        expectedOutput:
          "New version 3 created successfully from version 2. Test case now has 7 steps (5 preserved + 2 new). Key: tcVersion=2 was used because version 2 already existed in system. notrunall and notruncurrent both false (not true). Result shows tcVersion: 3 in response with new tcVersionID.",
      },
    ],
    hints: [
      "=== DEFAULT VALUES — APPLY FOR ANY UNSET FIELD ===",
      "Call 'Fetch UDF Layout' with entityType='TC', pageName='DETAIL' before updating.",
      "defaultValues (from Fetch UDF Layout): { fieldName: defaultValueId } — sweep ALL entries.",
      "  For EACH key in defaultValues: if user did not explicitly provide that field → include it in payload with the default value.",
      "  This applies to non-mandatory fields too (e.g. priority, estimatedTime). Omitting them = data loss.",
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
      "CRITICAL - VERSION CREATION vs UPDATE DISTINCTION:",
      "This tool supports TWO MODES using the SAME API endpoint:",
      "",
      "MODE 1: CREATE NEW VERSION (withVersion=true)",
      "- Purpose: Create an incremental version of the test case (e.g., v1 → v2, v2 → v3)",
      "- When to use: User explicitly asks to 'create new version', 'create version 2', 'increment version'",
      "- Required fields: tcID, tcVersionID (of source version), tcVersion (current version number), withVersion=true",
      "- Optional but recommended: versionComment (track what changed), notruncurrent, notrunall",
      "- Behavior: Creates a NEW test case version with incremented version number. Source version remains unchanged.",
      "- Example: If current version is 1, setting withVersion=true creates version 2",
      "- Use cases: Updating test case for new requirements, creating variants for different scenarios, version control",
      "",
      "MODE 2: UPDATE EXISTING VERSION (withVersion=false or omitted)",
      "- Purpose: Modify fields of an EXISTING version without creating a new version",
      "- When to use: User asks to 'update test case', 'modify version X', 'change summary' (without mentioning new version)",
      "- Required fields: tcID, tcVersionID (of version to update)",
      "- Do NOT include: withVersion flag, versionComment, tcVersion",
      "- Behavior: Updates the specified version in-place. No new version is created.",
      "- Example: Updating version 2's summary - only version 2 is modified, no version 3 is created",
      "- Use cases: Fixing typos, updating metadata, modifying steps in existing version",
      "",
      "CRITICAL FIELD UNDERSTANDING:",
      "- tcVersionID: The VERSION ID (numeric identifier) of the version you're working with",
      "- tcVersion: The VERSION NUMBER (1, 2, 3, etc.) - only needed when withVersion=true",
      "- tcID: The TEST CASE ID (remains same across all versions)",
      "- Example: Test case VKMCP-TC-10 (tcID: 4572654) has version 1 (tcVersionID: 5514384, tcVersion: 1)",
      "- When creating version 2 from version 1: Send tcVersionID=5514384 (source), tcVersion=1 (current), withVersion=true",
      "",
      "HOW TO DETERMINE WHICH MODE:",
      "  'create new version' / 'create version 2' / 'update with new version' → MODE 1 (withVersion=true)",
      "  'update test case' / 'change priority' / 'modify version X' (no mention of new version) → MODE 2",
      "  Ambiguous → ask: 'Do you want to create a new version or update the existing version?'",
      "",
      "VERSION CREATION WORKFLOW: fetch tcID + latest tcVersionID + tcVersion → build payload → call API.",
      "  New version inherits all source fields; only explicitly passed fields are overridden.",
      "  Recommended: include versionComment. Steps: use tcStepID to preserve, omit to add, use removeSteps to delete.",
      "  Set isStepUpdated:true if steps are added, modified, or removed.",
      "",
      "FIELD IDs for version creation — all from project info customListObjs.<field>[].id:",
      "  priority | testcaseOwner (→owner list) | testCaseState | testCaseType | testingType | component (array of IDs)",
      "  estimatedTime in seconds | scope:'project' | folderPath: string path or numeric ID",
      "",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID and tcVersionID.",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "NAMED FIELD RESOLUTION (priority, component, owner, testCaseState, testCaseType, testingType):",
      "  If user provides a name instead of an ID: look up ID from project info customListObjs.<field>[].name.",
      "  Field→key map: priority→priority | component→component | owner→testcaseOwner | state→testCaseState | type→testCaseType | testingType→testingType.",
      "  If not found after a fresh project info fetch: skip the field (it is not required) and show:",
      "  'Test case updated without <field>, as given <field> is not available in the current project.'",
      "",
      "CRITICAL: To update test case steps without **Duplication**, use the following rules:",
      "- ANTI-DUPLICATION RULE: The tcStepID field is THE KEY to prevent duplication:",
      "  * WITH tcStepID = UPDATE existing step (QMetry modifies the existing step in place)",
      "  * WITHOUT tcStepID = CREATE new step (QMetry adds a brand new step)",
      "- For steps to be UPDATED: ALWAYS fetch existing steps first using FETCH_TEST_CASE_STEPS, then include the tcStepID in the step object.",
      "- For steps to be ADDED: omit tcStepID completely in the step object.",
      "- For steps to be REMOVED: add a full removeSteps object for each step to be deleted, matching the removeTestCaseStep interface.",
      "- CRITICAL WARNING - DO NOT ADD UNSOLICITED STEPS:",
      "  * ONLY add, edit, or remove steps that the user EXPLICITLY requested",
      "  * DO NOT invent, create, or add extra steps based on assumptions or best practices",
      "  * DO NOT add 'helpful' steps that the user did not ask for",
      "  * When user says 'remove step 1', the result should have (N-1) steps, not N steps with extras",
      "  * When user says 'add 1 step', ONLY add that 1 step, nothing more",
      "  * When user says 'update step 2', ONLY update step 2, do not add or modify other steps",
      "  * If unsure what user wants, ASK first rather than adding steps autonomously",
      "- WORKFLOW TO AVOID DUPLICATION:",
      "  1. Call FETCH_TEST_CASE_STEPS to get all existing steps with their tcStepID values",
      "  2. For steps you want to KEEP/UPDATE: Include them in steps[] WITH their original tcStepID",
      "  3. For steps you want to ADD: Include them in steps[] WITHOUT tcStepID (ONLY if user requested)",
      "  4. For steps you want to REMOVE: Include them in removeSteps[] with full details",
      "  5. Always set isStepUpdated: true if steps are added, updated, or removed",
      "  6. VERIFY your steps array matches user's explicit request (count and content)",
      "- Example: If user says 'Edit step 1 to say ...', FIRST fetch steps to get tcStepID for step 1, THEN include it in the steps array with updated fields and the ORIGINAL tcStepID.",
      "- Example: If user says 'Add a new step after step 2', add EXACTLY ONE new object to steps array with no tcStepID (not multiple steps).",
      "- Example: If user says 'Remove step 3', add the full step object to removeSteps array, including tcStepID and all required fields. Do NOT add replacement steps.",
      "- Example: If test case has 3 steps and user says 'remove step 1', result should have 2 steps (step 2 and step 3 with updated orderIds), NOT 3 steps with extras.",
      "- Example: If user says 'add one mock step', add EXACTLY ONE step (not 2 or 3 steps even if they seem related).",
      "- COMPLETE PAYLOAD EXAMPLE: { tcID: 123, tcVersionID: 456, steps: [{tcStepID: 1001, orderId: 1, description: 'Updated'}, {orderId: 2, description: 'New'}], removeSteps: [{tcStepID: 1002, orderId: 3, ...}], isStepUpdated: true }",
      "- If only metadata is updated (no steps), set updateOnlyMetadata: true and do not include steps/removeSteps.",
      "- Always preserve orderId sequence for proper step ordering.",
      "- If user prompt is ambiguous, ask for clarification or show a user-friendly error.",
      "- WARNING: Omitting tcStepID for existing steps will cause DUPLICATION - the API will create duplicates instead of updating!",
      "- FINAL VERIFICATION BEFORE SENDING REQUEST:",
      "  * Count steps in your payload vs what user requested",
      "  * If user said 'add 1 step', steps array should have (existing_count + 1) items total",
      "  * If user said 'remove 1 step', steps array should have (existing_count - 1) items total, removeSteps should have 1 item",
      "  * If user said 'update step X', steps array should have same count as before, with step X's tcStepID preserved",
      "  * NEVER include steps the user did not explicitly mention or request",
      "Steps are optional but recommended for manual test cases.",
      "If the user provides a prompt like 'update test case with steps as step 1 - Go to login page, step 2 - give credential, step 3 - go to test case page, step 4 - create test case', LLM should parse each step and convert it into the steps payload array, mapping each step to an object with orderId, description, and optionally inputData and expectedOutcome.",
      "Example mapping: 'step 1 - Go to login page' → { orderId: 1, description: 'Go to login page' }.",
      "LLM should increment orderId for each step, use the step text as description, and optionally infer inputData/expectedOutcome if provided in the prompt.",
      "Demo steps payload: steps: [ { orderId: 1, description: 'First Step', inputData: 'First Data', expectedOutcome: 'First Outcome', UDF: { customField1: 'Custom Field Data A', customField2: 'Custom Field Data B' } }, ... ]",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "All IDs (priority, owner, etc.) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
      "",
      "VERSION CREATION NOTES:",
      "- notruncurrent + notrunall: default true for regular version creation; use false only in TC.VERSION_NOT_SYNCED retry.",
      "- folderPath: string path or numeric ID; inherited from source version if omitted.",
      "- attachments: use ADD/REMOVE arrays to manage attachments on create or update.",
      "",
      "PITFALL: tcVersionID (numeric version identifier, stays same across creation) ≠ tcVersion (version number 1/2/3, only used when withVersion=true).",
      "",
      "TC.VERSION_NOT_SYNCED — AUTO-RETRY (transparent, no user confirmation needed):",
      "TRIGGER: Test case linked to test suites or has existing executions — direct step updates are blocked.",
      "ERROR CODE: TC.VERSION_NOT_SYNCED | MESSAGE: 'This Test Case has been associated. Create a new version to save modifications.'",
      "",
      "RETRY FLOW:",
      "  1. First attempt — normal update (no withVersion). If TC.VERSION_NOT_SYNCED → go to step 2. Different error → report and stop.",
      "  2. Fetch test case details to get LATEST tcVersion number.",
      "     CRITICAL: use the highest existing version (e.g. v2 exists → tcVersion=2, not 1). Wrong value triggers the error again.",
      "  3. Retry with SAME tcID, tcVersionID, steps[] PLUS these additional fields:",
      "     withVersion: true | tcVersion: <latest> | notrunall: false | notruncurrent: false | scope: 'project'",
      "     versionComment: 'Auto-created version due to test suite association'",
      "     NOTE: omit isStepUpdated when withVersion=true.",
      "  4. Verify new tcVersionID in response (different from source) and report new version details to user.",
      "",
      "tcVersion RULE: always equals the LATEST version in the system.",
      "  Only v1 exists → tcVersion:1 (creates v2) | v1+v2 exist → tcVersion:2 (creates v3) | etc.",
      "",
      "VERIFIED PAYLOAD SHAPE (retry attempt):",
      "  { tcID, tcVersionID, tcVersion:<latest>, withVersion:true, notrunall:false, notruncurrent:false,",
      "    scope:'project', versionComment:'...', steps:[...same as first attempt...] }",
      "",
      "executionMinutes time is in minutes (legacy field).",
      "estimatedTime is in seconds (preferred for version creation).",
      "Description and testingType are optional but recommended for clarity.",
      "",
      "UDF (User Defined Fields) WORKFLOW FOR UPDATE:",
      "1. Call 'Fetch UDF Layout' with entityType='TC', pageName='DETAIL' to get field names, fieldIDs (projectUserFieldID), and list option IDs.",
      "   IF listOptions[field.listName] is empty after Fetch UDF Layout, the tool already tried a metadata fallback. " +
        "   If STILL empty, ask the user to provide the option ID from the QMetry UI — do NOT guess numeric IDs.",
      "2. For LOOKUPLIST fields: pick one ID from listOptions[field.listName][].id.",
      "3. For MULTILOOKUPLIST fields: pick an array of IDs; also pass the alias flat key (e.g., fieldNameAlias: 'Option Label').",
      "4. For CASCADINGLIST fields: pick parent ID + fetch child with 'Fetch Cascade Child Values'. Pass { parent: parentId, child: childId }.",
      "5. Pass BOTH 'udfFields' (flat root values) AND 'UDF' wrapper (with fieldID) — both required for update.",
      "   Example: udfFields: { custom_text: 'new value' }, UDF: { custom_text: { fieldID: 1001, value: 'new value' } }",
      "6. Mandatory UDF fields (isMandatory=true) MUST be included.",
      "STEP UDFs for update: Use same step UDF field names from 'Fetch UDF Layout' stepFields. Pass in each step's 'UDF' object.",
      "For MULTILOOKUPLIST step UDFs in update: use { ADD: [id1, id2], REMOVE: [id3] } format.",
    ],
    outputDescription:
      "JSON object containing the test case ID, version ID, summary, update/creation metadata. " +
      "When withVersion=true (version creation), response includes new version number and version ID. " +
      "When withVersion=false/omitted (existing version update), response includes updated fields confirmation.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Cases",
    toolset: "Test Cases",
    summary:
      "Fetch QMetry test cases - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_TEST_CASES,
    inputSchema: TestCaseListArgsSchema,
    purpose:
      "Get LIST of test cases from QMetry for browsing and bulk operations. " +
      "CRITICAL: DO NOT use this tool with filters to fetch a single test case by ID or entityKey! " +
      "Using filters with this API will persist those filters in the production UI, causing only filtered records to be visible. " +
      "For fetching a SINGLE test case by ID or entityKey, ALWAYS use 'Fetch Test Case Details' tool instead. " +
      "System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all test cases in a project (without filters)",
      "Browse test cases in specific folders for bulk operations",
      "Get paginated test case results for reporting",
      "Export multiple test cases at once",
    ],
    examples: [
      {
        description:
          "Get all test cases from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of test cases from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all test cases from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of test cases from UT project using UT's specific TC viewId",
      },
      {
        description: "Get test cases by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Test cases associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test cases by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All test cases associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get test cases by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All test cases associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific test case by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TC-1684","field":"entityKeyId"}]',
        },
        expectedOutput: "Test cases matching the entity key criteria",
      },
      {
        description:
          "Search for multiple test cases by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TC-1684,MAC-TC-1685,MAC-TC-1686","field":"entityKeyId"}]',
        },
        expectedOutput: "Test cases matching any of the specified entity keys",
      },
    ],
    hints: [
      "CRITICAL - FILTER PERSISTENCE WARNING:",
      "DO NOT use this API with filters to fetch a single test case by ID, entityKey, or name!",
      "Filters applied to this API persist in the production UI and cause only filtered records to be visible to users.",
      "This creates a major UX problem where users see incomplete data in their QMetry portal.",
      "",
      "CORRECT APPROACH FOR SINGLE TEST CASE:",
      "When user asks to 'fetch test case VKMCP-TC-5' or 'get test case by ID 123' or 'find test case named X':",
      "1. Ask user for the numeric test case ID (tcID) if not provided",
      "2. Use 'Fetch Test Case Details' tool with the numeric tcID parameter",
      "3. NEVER use 'Fetch Test Cases' with entityKeyId filter for single test case lookup",
      "",
      "WHEN TO USE THIS TOOL:",
      "Only use this tool when user explicitly asks for:",
      "- 'List all test cases'",
      "- 'Show me test cases in folder X'",
      "- 'Get all test cases' (without specifying a single test case)",
      "- 'Export test cases' (for bulk operations)",
      "",
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and test case fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.TC.viewId",
      "Step 3: Use the SAME projectKey and the extracted TC viewId for fetching test cases",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and test case fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      "DEPRECATED: Do not use filter with entityKeyId for single test case - use 'Fetch Test Case Details' instead",
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: entityKeyId, priorityAlias, createdByAlias, updatedByAlias, testCaseStateAlias, testingTypeAlias, testCaseTypeAlias, componentAlias, owner, release, cycle",
      "SORT FIELDS: entityKey, name, associatedVersion, priorityAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, testCaseStateAlias, testingTypeAlias, executionMinutes",
      "For multiple entity keys, use comma-separated values in filter",
      "Use empty string '' as folderPath for root directory",
    ],
    outputDescription:
      "JSON object with 'data' array containing test cases and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Test Case Details",
    toolset: "Test Cases",
    summary:
      "Get detailed information for a specific QMetry test case by numeric ID - USE THIS for single test case lookup",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS,
    inputSchema: TestCaseDetailsArgsSchema,
    purpose:
      "PREFERRED TOOL for fetching a SINGLE test case by ID or entityKey. " +
      "Retrieve comprehensive test case information including metadata, status, and basic properties WITHOUT affecting UI filters. " +
      "This tool does NOT persist filters in the production UI, making it safe for single record lookups.",
    useCases: [
      "Get test case details by numeric ID (PREFERRED for single test case)",
      "Fetch test case when user provides entityKey (e.g., 'VKMCP-TC-5')",
      "Retrieve test case metadata for a specific test case",
      "Get test case summary and properties for display or editing",
      "Fetch test case details before accessing steps or version details",
      "Lookup test case by name or ID without affecting UI filters",
    ],
    examples: [
      {
        description: "Get test case details by numeric ID",
        parameters: { tcID: 4468020 },
        expectedOutput:
          "Detailed test case information including summary, description, status",
      },
    ],
    hints: [
      "USE THIS TOOL when user asks to 'fetch test case VKMCP-TC-5' or 'get test case by ID' or 'find test case X'",
      "This API requires a numeric tcID parameter",
      "CRITICAL: If user provides entityKey (e.g., MAC-TC-1684), you have TWO options:",
      "Option 1 (RECOMMENDED): Ask user for the numeric test case ID",
      "Option 2: If you must resolve entityKey, use FETCH_TEST_CASES with filter ONLY ONCE, then immediately use this tool",
      "After resolving entityKey → tcID, always use THIS tool (FETCH_TEST_CASE_DETAILS) for subsequent lookups",
      "This tool provides metadata and properties; use FETCH_TEST_CASE_STEPS for step-level details",
      "This tool does NOT persist filters in UI - safe for single test case lookups",
      "ALWAYS prefer this tool over FETCH_TEST_CASES with filters for single test case operations",
    ],
    outputDescription:
      "JSON object with test case details including ID, key, summary, description, and metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Version Details",
    toolset: "Test Cases",
    summary:
      "Get QMetry test case details for a specific version by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_VERSION_DETAILS,
    inputSchema: TestCaseVersionDetailsArgsSchema,
    purpose:
      "Retrieve version-specific information for a test case including history and changes",
    useCases: [
      "Get specific version details of a test case",
      "Compare different versions of a test case",
      "Retrieve version history information",
      "Audit changes made across test case versions",
    ],
    examples: [
      {
        description: "Get version 2 details for test case ID 123",
        parameters: { id: 123, version: 2 },
        expectedOutput: "Version 2 details for test case 123",
      },
    ],
    hints: [
      "Requires numeric ID, not entityKey",
      "If user provides entityKey (e.g., MAC-TC-1684), first resolve it to numeric ID using FETCH_TEST_CASES",
      "Version defaults to 1 if not specified",
      "Provides version-specific metadata and history",
    ],
    outputDescription: "JSON object with version-specific test case details",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Steps",
    toolset: "Test Cases",
    summary:
      "Get detailed test case steps for a specific test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_STEPS,
    inputSchema: TestCaseStepsArgsSchema,
    purpose:
      "Retrieve step-by-step instructions and expected results for manual execution of a test case",
    useCases: [
      "Get step-by-step instructions with expected results",
      "Retrieve test case execution procedure for manual runs",
      "Export or display detailed test steps for documentation",
      "Fetch steps before automation mapping",
    ],
    examples: [
      {
        description: "Get steps for test case ID 123",
        parameters: { id: 123 },
        expectedOutput:
          "Detailed steps with actions and expected results for test case 123",
      },
    ],
    hints: [
      "Requires numeric ID, not entityKey",
      "If user provides entityKey (e.g., MAC-TC-1684), resolve it first via FETCH_TEST_CASES to get the numeric ID",
      "Version defaults to 1 if not specified",
      "Use pagination for test cases with many steps",
    ],
    outputDescription:
      "JSON object with array of test steps including step description, expected result, and order",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Executions",
    toolset: "Test Cases",
    summary:
      "Get execution records for a specific test case by numeric ID, including Test Run UDF values. " +
      "ALWAYS present results as a unified table: Test Suite Key | Test Suite Name | Release | Cycle | Platform | Executed Version | Execution Status | <UDF Label columns…>. " +
      "NEVER show a separate type+value UDF breakdown — always combine identification fields and UDF values in one table per execution row.",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_EXECUTIONS,
    inputSchema: TestCaseExecutionsArgsSchema,
    purpose:
      "Retrieve execution history and results for a specific test case. " +
      "This tool provides detailed execution information including test suite names, platforms, " +
      "execution status, executed by, project, release, cycle, execution date, and test case versions. " +
      "IMPORTANT: Every execution record always contains key identification fields — " +
      "Test Suite Key (tsEntityKey), Test Suite Name (testsuiteName), Release (releaseName), Cycle (cycleName), " +
      "Platform (platform), Executed Version (executedVersion), and Test Run UDF values (testRunUdfs). " +
      "These MUST always be shown in the response so users can identify which test suite run each execution belongs to.",
    useCases: [
      "Get execution history for a specific test case",
      "Retrieve test case execution results for reporting",
      "Filter executions by test suite, platform, or execution status",
      "Get execution data for test case analysis",
      "Monitor test case execution trends over time",
      "Filter executions by release, cycle, or execution date",
      "Get execution details for specific test case versions",
      "Audit test execution history for compliance",
      "Analyze test case execution performance across different environments",
      "Track test execution by specific users or teams",
      "Fetch Test Run UDF values for a specific test case's execution records",
      "Inspect custom metadata captured during test execution via Test Run UDFs",
      "Check whether the project has Test Run UDFs configured (hasTcRunUdf flag)",
    ],
    examples: [
      {
        description: "Get all executions for test case ID 1223922",
        parameters: { tcid: 1223922 },
        expectedOutput:
          "Present as ONE unified table — never as a separate type+value UDF breakdown. Example:\n" +
          "| Test Suite Key | Test Suite Name  | Release | Cycle  | Platform | Executed Version | Execution Status | Tested By | Environments UDF     | Execution Type |\n" +
          "| MAC-TS-42      | Regression Suite | R1      | Sprint1| Chrome   | v1               | Passed           | varis     | chrome, edge, safari | Functional     |\n" +
          "| MAC-TS-42      | Regression Suite | R1      | Sprint1| Firefox  | v2               | Failed           | john      | firefox              | Regression     |\n" +
          "Columns in order: Test Suite Key (tsEntityKey) | Test Suite Name (testsuiteName) | Release (releaseName) | Cycle (cycleName) | Platform (platform) | Executed Version (executedVersion) | Execution Status | then one column per UDF label. " +
          "Use the UDF 'label' as column header. Show null UDF values as '-'.",
      },
      {
        description: "Get executions for specific test case version",
        parameters: { tcid: 1223922, tcversion: 2 },
        expectedOutput: "Execution records for version 2 of the test case",
      },
      {
        description: "Filter executions by test suite and platform",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":"Sample Test Suite","type":"string","field":"testSuiteName"},{"value":[12345],"type":"list","field":"platformID"}]',
        },
        expectedOutput:
          "Filtered execution records matching test suite and platform criteria",
      },
      {
        description: "Filter executions by execution status",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":["PASS"],"type":"list","field":"executionStatus"}]',
        },
        expectedOutput: "Execution records with PASS status only",
      },
      {
        description: "Filter executions by release and cycle",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Execution records filtered by specific release and cycle",
      },
      {
        description: "Filter executions by date range",
        parameters: {
          tcid: 1223922,
          filter:
            '[{"value":"2024-01-01","type":"date","field":"executedDate","comparison":"gt"},{"value":"2024-12-31","type":"date","field":"executedDate","comparison":"lt"}]',
        },
        expectedOutput: "Execution records within the specified date range",
      },
      {
        description: "Filter executions by user",
        parameters: {
          tcid: 1223922,
          filter: '[{"value":["john.doe"],"type":"list","field":"executedBy"}]',
        },
        expectedOutput: "Execution records executed by specific user",
      },
      {
        description:
          "Fetch Test Run UDF values for all executions of test case ID 41571999",
        parameters: { tcid: 41571999 },
        expectedOutput:
          "Present as ONE unified table combining identification fields and UDF values — never a separate type+value breakdown. Example:\n" +
          "| Test Suite Key | Test Suite Name | Release | Cycle   | Platform | Executed Version | Execution Status | Tested By | Environments UDF     | Execution Type | Country    |\n" +
          "| MAC-TS-42      | Login Suite     | R1      | Sprint1 | Chrome   | v1               | Passed           | varis     | chrome, edge, safari | Functional     | India > i3 |\n" +
          "UDF column headers use the UDF 'label' (not raw field key). Null values shown as '-'.",
      },
      {
        description:
          "Check if project has Test Run UDFs — response includes hasTcRunUdf flag",
        parameters: { tcid: 1223922 },
        expectedOutput:
          "Response contains hasTcRunUdf: true (UDFs present, testRunUdfs populated) or hasTcRunUdf: false (no UDFs configured, testRunUdfNote explains this)",
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
      "| MAC-TS-42      | Login Suite     | R1      | S1    | Chrome   | v1               | Passed           | varis         | chrome, edge  | ... |",
      "",
      "MANDATORY COLUMNS (always first, in this order):",
      "  1. Test Suite Key    → tsEntityKey    (e.g. 'MAC-TS-42')",
      "  2. Test Suite Name   → testsuiteName  (test suite display name)",
      "  3. Release           → releaseName",
      "  4. Cycle             → cycleName",
      "  5. Platform          → platform",
      "  6. Executed Version  → executedVersion",
      "  7. Execution Status  → executionStatus",
      "  8. Tested By         → testedBy/executedBy when present",
      "  9+. One column per UDF field — use testRunUdfs[i].label as header, testRunUdfs[i].value as cell.",
      "",
      "Null UDF values → show as '-'. If hasTcRunUdf is false, show columns 1-8 only.",
      "UDF DATA SOURCE — THIS TOOL IS SELF-CONTAINED:",
      "This tool automatically calls Test Run UDF metadata once (project-wide) and parses the udfjson field from each execution row.",
      "The 'testRunUdfs' array in every execution record already contains ALL configured UDF fields — including fields with no value (null).",
      "DO NOT call 'Fetch Test Run UDF Values' after this tool for test case executions — that tool uses GET_TESTCASE_RUNS_BY_TESTSUITE_RUN which is for test suite runs, not test case executions.",
      "NEVER chain 'Fetch Test Run UDF Values' when the user asks for UDF values of test case executions — use testRunUdfs from THIS response directly.",
      "=== END MANDATORY RESPONSE FORMAT ===",
      "",
      "This API requires a numeric tcid parameter, not entity key",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with filter on entityKeyId to resolve the tcid",
      "After resolving entityKey → tcid, call this tool with the resolved numeric tcid",
      "tcversion parameter is optional - omit to get executions for all versions",
      "",
      "CRITICAL WORKFLOW FOR LINKED ISSUES: When user asks 'fetch linked issues of test case [ID]' or 'linked issues of execution':",
      "YOU MUST FIRST get the execution data using this tool to extract tcRunID before fetching issues!",
      "",
      "COMPLETE WORKFLOW FOR TEST CASE → LINKED ISSUES:",
      "STEP 1: Resolve Test Case ID (if needed) - Use FETCH_TEST_CASES if user provides entity key",
      "STEP 2: Fetch Test Case Executions (THIS TOOL) - Input: tcid, Extract: data[].tcRunID values",
      "STEP 3: Fetch Linked Issues - Tool: FETCH_LINKED_ISSUES_BY_TESTCASE_RUN, Input: entityId = tcRunID",
      "",
      "ID MAPPING CRITICAL UNDERSTANDING:",
      "- tcid/tcID = Test Case ID (for getting execution data with this tool)",
      "- tcRunID = Test Case Run/Execution ID (THIS is entityId for linked issues API)",
      "- entityId = tcRunID (what the linked issues API actually needs)",
      "",
      "NEVER USE tcid DIRECTLY as entityId for linked issues!",
      "ALWAYS get tcRunID from executions and use THAT as entityId!",
      "",
      "EXAMPLE RESPONSE STRUCTURE FROM THIS TOOL:",
      '{ "data": [{ "tcRunID": 58312120, "testSuiteName": "Suite 1", "executionStatus": "PASS", "testRunUdfs": [...] }] }',
      "→ Use tcRunID (58312120) as entityId for linked issues API",
      "",
      "FILTER CAPABILITIES: Support extensive filtering by test suite, platform, status, user, release, cycle, dates, and archive status",
      "FILTER FIELDS: testSuiteName (string), platformID (list), executionStatus (list), executedBy (list), project (list), release (list), cycle (list), executedDate (date with comparison), isPlatformArchived (list), isTestSuiteArchived (list), executedVersion (numeric)",
      "DATE FILTERING: Use 'gt' (greater than) and 'lt' (less than) comparisons for executedDate field",
      "EXECUTION STATUS: Common values include 'PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED', 'WIP' (verify with your QMetry instance)",
      "PLATFORM/SUITE ARCHIVE: Use [1,0] for both archived and non-archived, [1] for archived only, [0] for active only",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large execution result sets (start, page, limit parameters)",
      "Get platform IDs from FETCH_PLATFORMS tool and release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool",
      "This tool is essential for test execution reporting, trend analysis, and compliance auditing",
      "Execution data includes timestamps, user information, environment details, and test results",
      "Use scope parameter to define retrieval context (project, folder, release, cycle)",
      "",
      "TEST RUN UDF SUPPORT:",
      "This tool automatically fetches UDF metadata (project-wide, one call for all executions) and enriches each execution record.",
      "ALL project-defined Test Run UDF fields are returned for every execution — including fields with no value (value: null).",
      "HTML is stripped from rich text (LARGETEXT) UDF field values for clean output.",
      "Each execution's 'testRunUdfs' is an array of objects:",
      "  testRunUdfs: [",
      '    { "name": "8260LUP", "label": "Lookup Field", "fieldID": 228563, "fieldType": "LOOKUPLIST", "value": "l1" },',
      '    { "name": "TRString", "label": "TR String", "fieldID": 229241, "fieldType": "STRING", "value": "dsf" },',
      '    { "name": "notes_run", "label": "Notes Run", "fieldID": 229242, "fieldType": "LARGETEXT", "value": null },',
      '    { "name": "cascade_vK", "label": "Cascade VK", "fieldID": 229426, "fieldType": "CASCADINGLIST", "value": { "child": "qq", "parent": "vkc" } }',
      "  ]",
      "Use 'fieldID' from testRunUdfs entries when calling 'Bulk Update Test Run UDFs'.",
      "",
      "hasTcRunUdf FLAG — IMPORTANT:",
      "The response contains a 'hasTcRunUdf' boolean flag at the top level.",
      "hasTcRunUdf: true  → Project has Test Run UDFs configured; each execution record includes 'testRunUdfs' array with all fields.",
      "hasTcRunUdf: false → Project has NO Test Run UDFs configured.",
      "  When hasTcRunUdf is false, the response includes a 'testRunUdfNote' field with a professional explanation.",
      "  Inform the user: 'No Test Run UDFs are configured for this project. Contact a project administrator to set up Test Run UDF fields.'",
      "NEVER attempt to read testRunUdfs from records when hasTcRunUdf is false — the field will not be present.",
    ],
    outputDescription:
      "JSON object with executions array. Each execution record ALWAYS contains these mandatory identification fields: " +
      "'tsEntityKey' (Test Suite Key, e.g. 'MAC-TS-42'), 'testsuiteName' (Test Suite Name), " +
      "'releaseName' (Release), 'cycleName' (Cycle), 'platform' (Platform/environment), " +
      "'executedVersion' (Executed Version of the test case), 'executionStatus' (Execution Status label), " +
      "'tcRunID' (numeric Test Run ID), " +
      "and 'testRunUdfs' (array of objects each with name, label, fieldID, fieldType, value — use 'label' for display headers, null if not set). " +
      "ALL project-defined UDF fields are always included, even those with no value. " +
      "Top-level 'hasTcRunUdf' flag indicates whether the project has Test Run UDFs configured. When false, a 'testRunUdfNote' field provides a professional explanation instead.",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Steps With UDF",
    toolset: "Test Cases",
    summary:
      "Fetch test case steps including UDF field values via viewColumns endpoint",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_STEPS_WITH_UDF,
    inputSchema: TestCaseStepsWithUdfArgsSchema,
    purpose:
      "Retrieve test case steps with full UDF data. Use this instead of 'Fetch Test Case Steps' when you need step-level UDF field values — the basic steps endpoint omits UDF data.",
    useCases: [
      "Get step UDF field values for a test case",
      "Retrieve steps with custom fields before updating step UDFs",
      "Inspect step-level UDF data for reporting",
    ],
    examples: [
      {
        description: "Fetch steps with UDF values for test case ID 112768054",
        parameters: { tcID: 112768054 },
        expectedOutput:
          "Steps with UDF object containing field values, ID_<field> arrays for lookup IDs, UDF_<field> prefixed values, filterTemplate with UDF field definitions",
      },
    ],
    hints: [
      "Response includes 'filterTemplate' array listing all UDF fields with their fieldType and udfmID",
      "UDF values in each step row: UDF_<fieldName> = display value, UDF_ID_<fieldName> = numeric IDs",
      "Step UDF object also has ID_<fieldName> for lookup IDs",
      "LOOKUPLIST: id = UDF_ID_<fieldName>, display = UDF_<fieldName>",
      "MULTILOOKUPLIST: ids = UDF_ID_<fieldName> (array), display = UDF_<fieldName>",
      "CASCADINGLIST: parent = UDF_ID_<fieldName>[0], child = UDF_ID_<fieldName>[1]",
      "viewId auto-resolved from project info if not provided",
    ],
    outputDescription:
      "JSON object with data array (steps with UDF values), filterTemplate (UDF field definitions), columns (visible/hidden column config), total count, and viewId",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Test Case to Issues",
    toolset: "Test Cases",
    summary:
      "Link one or more defects/issues to a test case by entityKey and issue IDs.",
    handler: QMetryToolsHandlers.LINK_TESTCASE_TO_ISSUES,
    inputSchema: LinkTestcaseToIssuesArgsSchema,
    purpose:
      "Link defects or issues to a test case using the test case entityKey and an array of numeric issue IDs. " +
      "This tool enables traceability and defect coverage mapping between issues and test cases.",
    useCases: [
      "Link defects/issues to a test case for traceability",
      "Bulk link multiple issues to a single test case",
      "Automate defect coverage mapping",
    ],
    examples: [
      {
        description: "Link issues to test case 8d7b-TC-63",
        parameters: {
          tcID: "8d7b-TC-63",
          dfIDs: [2039, 2038, 2037, 1528],
        },
        expectedOutput: "Issues linked to test case 8d7b-TC-63 successfully.",
      },
    ],
    hints: [
      "To get the tcID, call the 'Fetch Test Cases' tool and use data[<index>].entityKey.",
      "dfIDs must be an array of numeric issue/defect IDs — resolve them using the 'Fetch Defects or Issues' tool.",
      "If the user provides a test case entityKey (e.g., 8d7b-TC-63), use it directly as tcID.",
      "CRITICAL: the parameter name is 'tcID' — do NOT use 'testCaseId' or 'tcId'.",
      "CRITICAL: the parameter name is 'dfIDs' — do NOT use 'issueIds' or 'defectIds'.",
    ],
    outputDescription: "JSON object with success status and linkage details.",
    readOnly: false,
    idempotent: false,
  },
];
