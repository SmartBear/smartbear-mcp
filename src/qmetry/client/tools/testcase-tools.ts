import { QMetryToolsHandlers } from "../../config/constants";
import {
  CreateTestCaseArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseExecutionsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseStepsArgsSchema,
  TestCaseVersionDetailsArgsSchema,
  UpdateTestCaseArgsSchema,
} from "../../types/common";
import type { QMetryToolParams } from "./types";

export const TESTCASE_TOOLS: QMetryToolParams[] = [
  {
    title: "Create Test Case",
    summary:
      "Create a new test case in QMetry with steps, metadata, and release/cycle mapping.",
    handler: QMetryToolsHandlers.CREATE_TEST_CASE,
    inputSchema: CreateTestCaseArgsSchema,
    purpose:
      "Allows users to create a new test case in QMetry, including steps, custom fields, and release/cycle mapping. " +
      "Supports all major test case fields and step-level UDFs. " +
      "For fields like priority, owner, component, etc., fetch their valid values using the project info tool. " +
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info.",

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
        description: "Create a test case in the root folder (auto-resolved)",
        parameters: {
          name: "Login Test Case",
        },
        expectedOutput:
          "Test case created in the root test case folder with ID and summary details",
      },
      {
        description: "Create a simple test case in folder 102653",
        parameters: {
          tcFolderID: "102653",
          name: "Login Test Case",
        },
        expectedOutput: "Test case created with ID and summary details",
      },
      {
        description: "Create a test case with steps and metadata",
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
        expectedOutput: "Test case created with steps and metadata",
      },
    ],
    hints: [
      "If tcFolderID is not provided, it will be auto-resolved to the root test case folder using project info (rootFolders.TC.id).",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found, skip the priority field (it is not required) and show a user-friendly message: 'Test case created without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case created without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case created without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case created without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case created without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case created without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Create test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the create payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case created without priority, as given priority is not available in the current project.'",
      "tcFolderID is required; use the root folder ID from project info or a specific folder.",
      "Steps are optional but recommended for manual test cases.",
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
      "Estimated time is in minutes.",
      "Description and testingType are optional but recommended for clarity.",
    ],
    outputDescription:
      "JSON object containing the new test case ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Test Case",
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
          isStepUpdated: false,
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
    ],
    hints: [
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
      "- User says 'create new version' → MODE 1 (withVersion=true)",
      "- User says 'create version 2' → MODE 1 (withVersion=true)",
      "- User says 'update test case with new version' → MODE 1 (withVersion=true)",
      "- User says 'update test case VKMCP-TC-10 summary' → MODE 2 (no withVersion, update existing version)",
      "- User says 'update version 2 summary' → MODE 2 (no withVersion, update existing version 2)",
      "- User says 'change priority of version 1' → MODE 2 (no withVersion, update version 1)",
      "- If ambiguous, ask user: 'Do you want to create a new version or update the existing version?'",
      "",
      "VERSION CREATION WORKFLOW (withVersion=true):",
      "Step 1: Fetch test case details to get current tcID, tcVersionID, and tcVersion",
      "Step 2: Optionally fetch current steps if they need to be preserved/modified",
      "Step 3: Prepare payload with:",
      "  - tcID (test case ID)",
      "  - tcVersionID (source version ID to create from)",
      "  - tcVersion (current version number)",
      "  - withVersion: true (CRITICAL flag)",
      "  - versionComment (recommended: describe what changed)",
      "  - Updated fields (name, description, priority, steps, etc.)",
      "  - notruncurrent: true (recommended)",
      "  - notrunall: true (recommended)",
      "Step 4: Call update API - a new version will be created with incremented version number",
      "Step 5: New version inherits all fields from source version, with your specified updates applied",
      "",
      "EXISTING VERSION UPDATE WORKFLOW (no withVersion):",
      "Step 1: Fetch test case details to get tcID and tcVersionID of the version to update",
      "Step 2: Prepare payload with:",
      "  - tcID (test case ID)",
      "  - tcVersionID (version ID to update)",
      "  - DO NOT include withVersion, versionComment, or tcVersion",
      "  - Only include fields you want to change",
      "Step 3: Call update API - specified version is updated in-place",
      "Step 4: No new version is created, only specified fields are modified",
      "",
      "FIELD MAPPING FOR VERSION CREATION:",
      "When creating a new version, include ALL fields you want the new version to have:",
      "- name: Test case summary (required if different from source)",
      "- description: Test case description (required if different from source)",
      "- priority: Priority ID (get from project info customListObjs.priority[index].id)",
      "- testcaseOwner: Owner ID (get from project info customListObjs.owner[index].id)",
      "- testCaseState: State ID (get from project info customListObjs.testCaseState[index].id)",
      "- testCaseType: Type ID (get from project info customListObjs.testCaseType[index].id)",
      "- testingType: Testing type ID (get from project info customListObjs.testingType[index].id)",
      "- component: Array of component IDs (get from project info customListObjs.component[index].id)",
      "- estimatedTime: Time in seconds (e.g., 7200 for 2 hours)",
      "- steps: Array of step objects (include tcStepID from source version to preserve steps)",
      "- folderPath: Folder path or folder ID",
      "- scope: Usually 'project'",
      "",
      "STEPS HANDLING IN VERSION CREATION:",
      "When creating a new version WITH steps:",
      "- To PRESERVE existing steps: Include them with their original tcStepID values",
      "- To ADD new steps: Include them WITHOUT tcStepID",
      "- To MODIFY steps: Include them with tcStepID and updated description/data",
      "- To REMOVE steps: Include them in removeSteps array",
      "- Set isStepUpdated: true if any steps are modified, added, or removed",
      "- If no steps are included, new version may inherit steps from source (verify with QMetry docs)",
      "",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID and tcVersionID.",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found, skip the priority field (it is not required) and show a user-friendly message: 'Test case updated without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case updated without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case updated without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case updated without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case updated without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case updated without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Update test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the update payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case updated without priority, as given priority is not available in the current project.'",
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
      "ADDITIONAL VERSION CREATION GUIDANCE:",
      "- versionComment field: STRONGLY RECOMMENDED when withVersion=true. Helps track why version was created.",
      "  Example comments: 'Updated for Sprint 5 requirements', 'Fixed test steps based on code review', 'Version 2 for production environment'",
      "- notruncurrent and notrunall flags: Control execution behavior when creating versions. Set both to true as best practice.",
      "- folderPath: Can be string path or numeric folder ID. Usually inherited from source version if not specified.",
      "- attachments: Use ADD/REMOVE arrays to manage attachments when creating new version or updating existing version.",
      "- estimatedTime vs executionMinutes: Use estimatedTime (in seconds) for version creation. executionMinutes (in minutes) is legacy field.",
      "",
      "REAL-WORLD VERSION CREATION EXAMPLES:",
      "Example 1: User says 'create a new version of test case VKMCP-TC-10 with summary = \"Facebook Login Validation Failed update from MCP V2\", description = used existing description by at last add V2 text, release = default, cycle = default'",
      "→ Workflow:",
      "  1. Fetch VKMCP-TC-10 details to get tcID, tcVersionID, tcVersion, current description",
      "  2. Fetch project info to get default release ID and cycle ID",
      "  3. Append ' V2' to current description",
      "  4. Send payload with: tcID, tcVersionID (source), tcVersion (current), withVersion=true, name='...V2', description='...V2', versionComment='Created version 2', release/cycle IDs",
      "→ Result: New incremental version created (e.g., version 1 → version 2) with updated summary, modified description, associated with default release/cycle",
      "",
      "Example 2: User says 'update version 2 summary, release, cycle, priority'",
      "→ Workflow:",
      "  1. Fetch test case details to get version 2's tcVersionID",
      "  2. Fetch project info to get priority, release, cycle IDs",
      "  3. Send payload with: tcID, tcVersionID (of version 2), WITHOUT withVersion flag, with updated summary, release, cycle, priority",
      "→ Result: Version 2 updated in-place. No new version created. Only specified fields modified.",
      "",
      "COMMON PITFALLS TO AVOID:",
      "- Pitfall 1: Setting withVersion=true when user wants to update existing version → Creates unwanted new version",
      "- Pitfall 2: Omitting versionComment when creating new version → Lost tracking of why version was created",
      "- Pitfall 3: Not fetching current tcVersionID before update → Updating wrong version or causing error",
      "- Pitfall 4: Using tcVersion for normal updates → tcVersion only needed when withVersion=true",
      "- Pitfall 5: Not including tcStepID for steps when creating version → Steps may duplicate instead of preserving",
      "- Pitfall 6: Confusing tcVersionID (version identifier) with tcVersion (version number) → Wrong API payload",
      "",
      "executionMinutes time is in minutes (legacy field).",
      "estimatedTime is in seconds (preferred for version creation).",
      "Description and testingType are optional but recommended for clarity.",
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
        description: "Get test cases with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 167136, folderPath: "" }, // This is an example viewId, must be resolved per project Test Case ViewId
        expectedOutput: "Test cases using manually specified viewId 167136",
      },
      {
        description:
          "List test cases from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId: "fetch specific project given projectKey Test Case ViewId", // This is an example viewId, must be resolved per project Test Case ViewId
          folderPath: "",
        },
        expectedOutput:
          "Test cases using manually specified viewId 167136 or projectKey",
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
    summary: "Get execution records for a specific test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_EXECUTIONS,
    inputSchema: TestCaseExecutionsArgsSchema,
    purpose:
      "Retrieve execution history and results for a specific test case. " +
      "This tool provides detailed execution information including test suite names, platforms, " +
      "execution status, executed by, project, release, cycle, execution date, and test case versions.",
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
    ],
    examples: [
      {
        description: "Get all executions for test case ID 1223922",
        parameters: { tcid: 1223922 },
        expectedOutput:
          "List of execution records for test case with execution details, status, and metadata",
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
    ],
    hints: [
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
      '{ "data": [{ "tcRunID": 58312120, "testSuiteName": "Suite 1", "executionStatus": "PASS" }] }',
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
    ],
    outputDescription:
      "JSON object with executions array containing execution records, status, timestamps, and metadata",
    readOnly: true,
    idempotent: true,
  },
];
