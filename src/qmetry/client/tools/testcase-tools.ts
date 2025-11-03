import { QMetryToolsHandlers } from "../../config/constants.js";
import {
  CreateTestCaseArgsSchema,
  TestCaseDetailsArgsSchema,
  TestCaseExecutionsArgsSchema,
  TestCaseListArgsSchema,
  TestCaseStepsArgsSchema,
  TestCaseVersionDetailsArgsSchema,
  UpdateTestCaseArgsSchema,
} from "../../types/common.js";
import type { QMetryToolParams } from "./types.js";

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
      "Update an existing QMetry test case by tcID and tcVersionID, with auto-resolution from entityKey.",
    handler: QMetryToolsHandlers.UPDATE_TEST_CASE,
    inputSchema: UpdateTestCaseArgsSchema,
    purpose:
      "Update a QMetry test case's metadata, steps, or other fields. " +
      "Requires tcID and tcVersionID, which can be auto-resolved from the test case entityKey using the test case list and version detail tools. " +
      "Supports updating summary, priority, owner, component, state, type, description, steps, and more. Only fields provided will be updated.",
    useCases: [
      "Update test case summary (name)",
      "Change priority, owner, or state of a test case",
      "Edit, add, or remove test steps",
      "Update only metadata (no steps)",
      "Bulk update using entityKey auto-resolution",
      "Modify test case description or estimated time",
      "Change test case type or component",
      "Update testing type or custom fields",
      "Update, add and remove test case steps",
    ],
    examples: [
      {
        description: "Update test case summary (updated name)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          name: "MAC Test11",
        },
        expectedOutput:
          "Test case summary updated. tcID and tcVersionID auto-resolved from entityKey. Only 'name' field changed.",
      },
      {
        description: "Update priority to High and owner to john.doe",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          priority: 505015,
          testcaseOwner: 6963,
        },
        expectedOutput:
          "Priority and owner updated. Field IDs auto-resolved from project info. tcID/tcVersionID resolved from entityKey.",
      },
      {
        description: "Update steps (edit, add, remove)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          steps: [
            {
              orderId: 1,
              description: "Step 22",
              inputData: "Input 22",
              expectedOutcome: "Outcome 22",
              tcStepID: 3014032,
            },
            {
              orderId: 2,
              description: "Step3",
              inputData: "Input 3",
              expectedOutcome: "Outcome 3",
            },
          ],
          removeSteps: [
            { tcStepID: 3014031, description: "Step 1", orderId: 1 },
          ],
          isStepUpdated: true,
        },
        expectedOutput:
          "Steps updated: Step 22 edited, Step3 added, Step 1 removed. tcID/tcVersionID auto-resolved.",
      },
      {
        description: "Update only metadata (no steps)",
        parameters: {
          tcID: 4519260,
          tcVersionID: 5448492,
          updateOnlyMetadata: true,
          name: "New Name",
        },
        expectedOutput:
          "Metadata updated only. Steps unchanged. tcID/tcVersionID auto-resolved.",
      },
    ],
    hints: [
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID and tcVersionID.",
      "To get valid values for priority, owner, component, etc., call the project info tool and use the returned customListObjs IDs.",
      "If the user provides a priority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.priority[index].name, and use its ID in the payload. If the name is not found, skip the priority field (it is not required) and show a user-friendly message: 'Test case updated without priority, as given priority is not available in the current project.'",
      "If the user provides a component name, fetch project info, find the matching component in customListObjs.component[index].name, and use its ID in the payload. If the name is not found, skip the component field (it is not required) and show a user-friendly message: 'Test case updated without component, as given component is not available in the current project.'",
      "If the user provides an owner name, fetch project info, find the matching owner in customListObjs.owner[index].name, and use its ID in the payload as testcaseOwner. If the name is not found, skip the testcaseOwner field (it is not required) and show a user-friendly message: 'Test case updated without owner, as given owner is not available in the current project.'",
      "If the user provides a test case state name, fetch project info, find the matching state in customListObjs.testCaseState[index].name, and use its ID in the payload as testCaseState. If the name is not found, skip the testCaseState field (it is not required) and show a user-friendly message: 'Test case updated without test case state, as given state is not available in the current project.'",
      "If the user provides a test case type name, fetch project info, find the matching type in customListObjs.testCaseType[index].name, and use its ID in the payload as testCaseType. If the name is not found, skip the testCaseType field (it is not required) and show a user-friendly message: 'Test case updated without test case type, as given type is not available in the current project.'",
      "If the user provides a testing type name, fetch project info, find the matching type in customListObjs.testingType[index].name, and use its ID in the payload as testingType. If the name is not found, skip the testingType field (it is not required) and show a user-friendly message: 'Test case updated without testing type, as given testing type is not available in the current project.'",
      "Example: If user says 'Update test case with title \"High priority test case\" and set priority to \"Blocker\"', first call project info, map 'Blocker' to its ID, and use that ID for the priority field in the update payload. If user says 'set priority to \"Urgent\"' and 'Urgent' is not found, skip the priority field and show: 'Test case updated without priority, as given priority is not available in the current project.'",
      "To update test case steps, use the following rules:",
      "- For steps to be added: omit tcStepID in the step object.",
      "- For steps to be updated: include tcStepID (from the existing step) in the step object.",
      "- For steps to be removed: add a full removeSteps object for each step to be deleted, matching the removeTestCaseStep interface.",
      "- Always set isStepUpdated: true if steps are added, updated, or removed.",
      "- Example: If user says 'Edit step 1 to say ...', find the tcStepID for step 1 and include it in the steps array with updated fields.",
      "- Example: If user says 'Add a new step after step 2', add a new object to steps array with no tcStepID.",
      "- Example: If user says 'Remove step 3', add the full step object to removeSteps array, including tcStepID and all required fields.",
      "- The payload should look like: { steps: [...], removeSteps: [...], isStepUpdated: true }.",
      "- If only metadata is updated (no steps), set updateOnlyMetadata: true and do not include steps/removeSteps.",
      "- Always increment orderId for new steps and preserve order for updates.",
      "- If user prompt is ambiguous, ask for clarification or show a user-friendly error.",
      "Steps are optional but recommended for manual test cases.",
      "If the user provides a prompt like 'update test case with steps as step 1 - Go to login page, step 2 - give credential, step 3 - go to test case page, step 4 - create test case', LLM should parse each step and convert it into the steps payload array, mapping each step to an object with orderId, description, and optionally inputData and expectedOutcome.",
      "Example mapping: 'step 1 - Go to login page' → { orderId: 1, description: 'Go to login page' }.",
      "LLM should increment orderId for each step, use the step text as description, and optionally infer inputData/expectedOutcome if provided in the prompt.",
      "Demo steps payload: steps: [ { orderId: 1, description: 'First Step', inputData: 'First Data', expectedOutcome: 'First Outcome', UDF: { customField1: 'Custom Field Data A', customField2: 'Custom Field Data B' } }, ... ]",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "All IDs (priority, owner, etc.) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
      "executionMinutes time is in minutes.",
      "Description and testingType are optional but recommended for clarity.",
    ],
    outputDescription:
      "JSON object containing the new test case ID, summary, and creation metadata.",
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
      "Get test cases from QMetry. System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all test cases in a project",
      "Search for specific test cases using filters",
      "Browse test cases in specific folders",
      "Get paginated test case results",
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
        parameters: { projectKey: "MAC", viewId: 167136, folderPath: "" },
        expectedOutput: "Test cases using manually specified viewId 167136",
      },
      {
        description:
          "List test cases from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId: "fetch specific project given projectKey Test Case ViewId",
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
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and test case fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.TC.viewId",
      "Step 3: Use the SAME projectKey and the extracted TC viewId for fetching test cases",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and test case fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by test case key (like MAC-TC-1684), use filter: \'[{"type":"string","value":"MAC-TC-1684","field":"entityKeyId"}]\'',
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
      "Get detailed information for a specific QMetry test case by numeric ID",
    handler: QMetryToolsHandlers.FETCH_TEST_CASE_DETAILS,
    inputSchema: TestCaseDetailsArgsSchema,
    purpose:
      "Retrieve comprehensive test case information including metadata, status, and basic properties",
    useCases: [
      "Get test case details by numeric ID",
      "Retrieve test case metadata for reporting",
      "Get test case summary and properties",
      "Fetch test case details before accessing steps or version details",
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
      "This API requires a numeric tcID parameter",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with a filter on entityKeyId to resolve the tcID",
      "After resolving entityKey → tcID, call this tool with the resolved numeric tcID",
      "This tool provides metadata and properties; use FETCH_TEST_CASE_STEPS for step-level details",
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
