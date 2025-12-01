import { QMetryToolsHandlers } from "../../config/constants.js";
import {
  BulkUpdateExecutionStatusArgsSchema,
  CreateTestSuiteArgsSchema,
  ExecutionsByTestSuiteArgsSchema,
  LinkPlatformsToTestSuiteArgsSchema,
  LinkTestCasesToTestSuiteArgsSchema,
  RequirementsLinkedTestCasesToTestSuiteArgsSchema,
  TestCaseRunsByTestSuiteRunArgsSchema,
  TestCasesByTestSuiteArgsSchema,
  TestSuiteListArgsSchema,
  TestSuitesForTestCaseArgsSchema,
  UpdateTestSuiteArgsSchema,
} from "../../types/common.js";
import type { QMetryToolParams } from "./types.js";

export const TESTSUITE_TOOLS: QMetryToolParams[] = [
  {
    title: "Create Test Suite",
    summary:
      "Create a new test suite in QMetry with metadata and release/cycle mapping.",
    handler: QMetryToolsHandlers.CREATE_TEST_SUITE,
    inputSchema: CreateTestSuiteArgsSchema,
    purpose:
      "Allows users to create a new test suite in QMetry, including metadata and release/cycle mapping. " +
      "Supports all major test suite fields. " +
      "For fields like testsuiteOwner, testSuiteState, etc., fetch their valid values using the project info tool. " +
      "If parentFolderId is not provided, it will be auto-resolved to the root test suite folder using project info.",

    useCases: [
      "Create a basic test suite with just a name and folder",
      "Add detailed metadata like description to a test suite",
      "Associate test suite with specific release/cycle for planning",
      "Set testsuiteOwner, testSuiteState, and other metadata using valid IDs from project info",
      "Create test suites for isAutomatedFlag true or false for automated or manual types, default is false",
      "Add test suite to a specific folder using parentFolderId",
      "Map test suite to multiple cycles/releases and build ID",
    ],
    examples: [
      {
        description: "Create a test suite in the root folder (auto-resolved)",
        parameters: {
          name: "Demo Test Suite",
        },
        expectedOutput:
          "Test suite created in the root test suite folder with ID and summary details",
      },
      {
        description: "Create a simple test suite in folder 102653",
        parameters: {
          parentFolderId: "102653",
          name: "Login Test Suite",
        },
        expectedOutput: "Test suite created with ID and summary details",
      },
      {
        description: "Create a test suite with some details and metadata",
        parameters: {
          parentFolderId: "113557",
          isAutomatedFlag: false,
          name: "Testsuite Summary",
          description: "desc",
          testsuiteOwner: 6963,
          testSuiteState: 505035,
          associateRelCyc: true,
          releaseCycleMapping: [
            {
              buildID: 18411,
              releaseId: 10286,
            },
          ],
        },
        expectedOutput:
          "Test suite created with details and metadata. Example uses: parentFolderId=113557 (MAC root TS folder from rootFolders.TS.id), testsuiteOwner=6963 (umang.savaliya from customListObjs.owner[index].id), testSuiteState=505035 (New from customListObjs.testSuiteState[index].id), releaseId=10286 (Air release from projects[index].releases[index].releaseID), buildID=18411 (Air Q1-19 cycle from projects[index].releases[index].builds[index].buildID)",
      },
    ],
    hints: [
      "If parentFolderId is not provided, it will be auto-resolved to the root test suite folder using project info (rootFolders.TS.id).",
      "To get valid values for testsuiteOwner, testSuiteState, etc., call the 'Admin/Get info Service' API (FETCH_PROJECT_INFO tool) and use the returned customListObjs IDs.",
      "CRITICAL: For testsuiteOwner mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.owner[<index>].id. Match the user by customListObjs.owner[<index>].name.",
      "If the user provides an owner name (testsuiteOwner), fetch project info, find the matching owner in customListObjs.owner[index].name or customListObjs.owner[index].uniqueLabel, and use its ID in the payload as testsuiteOwner. If the name is not found, skip the testsuiteOwner field (it is not required) and show a user-friendly message: 'Test suite created without owner, as given owner is not available in the current project.'",
      "CRITICAL: For testSuiteState mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.testSuiteState[<index>].id. Match the state by customListObjs.testSuiteState[<index>].name.",
      "If the user provides a test suite state name(testSuiteState), fetch project info, find the matching state in customListObjs.testSuiteState[index].name, and use its ID in the payload as testSuiteState. If the name is not found, skip the testSuiteState field (it is not required) and show a user-friendly message: 'Test suite created without test suite state, as given state is not available in the current project.'",
      "parentFolderId is required; use the root folder ID from project info (rootFolders.TS.id) or a specific folder.",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the test suite, set associateRelCyc: true in the payload.",
      "CRITICAL: For releaseCycleMapping.releaseId - Call API 'Release/List' (or use project info projects[<index>].releases[<index>].releaseID), from the response get value from data[<index>].releaseID or projects[<index>].releases[<index>].releaseID. Match the release by name.",
      "CRITICAL: For releaseCycleMapping.buildID - Call API 'Cycle/List' (or use project info projects[<index>].releases[<index>].builds[<index>].buildID), from the response get value from data[<index>].buildID or projects[<index>].releases[<index>].builds[<index>].buildID. Match the build/cycle by name.",
      "If the user provides a release name, map it to its ID from projects[<index>].releases[<index>].releaseID in the project info response, and use that ID as releaseId in releaseCycleMapping.",
      "If the user provides a build/cycle name, map it to its ID from projects[<index>].releases[<index>].builds[<index>].buildID in the project info response, and use that ID as buildID in releaseCycleMapping.",
      "Example payload: releaseCycleMapping: [ { releaseId: <releaseID>, buildID: <buildID> } ]",
      "Example: For 'Air' release and 'Air Q1-19' cycle in MAC project, use releaseId: 10286 and buildID: 18411",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Test suite created without release/cycle association, as given release/cycle is not available in the current project.'",
      "All IDs (testSuiteState from customListObjs.testSuiteState[index].id, testsuiteOwner from customListObjs.owner[index].id, releaseId from projects.releases[index].releaseID, buildID from projects.releases.builds[index].buildID) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
    ],
    outputDescription:
      "JSON object containing the new test suite ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Test Suite",
    summary:
      "Update an existing QMetry test suite by id(testsuite numeric id), with auto-resolution from entityKey.",
    handler: QMetryToolsHandlers.UPDATE_TEST_SUITE,
    inputSchema: UpdateTestSuiteArgsSchema,
    purpose:
      "Update a QMetry test suite's metadata, description, or other fields. " +
      "Requires id(testsuite numeric id),  which can be auto-resolved from the test suite entityKey using the test suite list tools. " +
      "Supports updating name, description, owner, state, and more. Only fields provided will be updated.",
    useCases: [
      "Update test suite summary (name)",
      "Change owner, or state of a test suite",
      "Bulk update using entityKey auto-resolution",
      "Modify test suite description",
    ],
    examples: [
      {
        description: "Update test suite summary (updated name)",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          name: "MAC Test11",
        },
        expectedOutput:
          "Test suite summary updated. Only 'name' field changed. Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved. from the project info. info on rootFolders.TS.id.",
      },
      {
        description: "Update state to Open and owner of the test suite",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          testSuiteState: 505036,
          testsuiteOwner: 6963,
        },
        expectedOutput:
          "State and owner updated. Example uses: testSuiteState=505036 (Open from customListObjs.testSuiteState[index].id), testsuiteOwner=6963 (umang.savaliya from customListObjs.owner[index].id). Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved from the project info rootFolders.TS.id.",
      },
      {
        description: "Update only description of the test suite",
        parameters: {
          id: 1505898,
          entityKey: "VT-TS-7",
          TsFolderID: 1644087,
          description: "Updated description for the test suite.",
        },
        expectedOutput:
          "description updated only. Field IDs auto-resolved from project info. id(test suite numeric id) resolved from entityKey. TsFolderID auto-resolved. from the project info. info on rootFolders.TS.id.",
      },
    ],
    hints: [
      "If user provides entityKey (e.g., MAC-TS-7), first call Fetch Test Suites with a filter on entityKeyId to resolve the id (test suite numeric id) and TsFolderID from rootFolders.TS.id.",
      "To get valid values for owner, state, etc., call the 'Admin/Get info Service' API (FETCH_PROJECT_INFO tool) and use the returned customListObjs IDs.",
      "CRITICAL: For testsuiteOwner mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.owner[<index>].id. Match the user by customListObjs.owner[<index>].name.",
      "If the user provides an owner name, fetch project info, find the matching user in customListObjs.owner[index].name, and use its ID in the payload as testsuiteOwner. If the name is not found, skip the testsuiteOwner field (it is not required) and show a user-friendly message: 'Test suite updated without owner, as given owner is not available in the current project.'",
      "CRITICAL: For testSuiteState mapping - Call API 'Admin/Get info Service', from the response get value from customListObjs.testSuiteState[<index>].id. Match the state by customListObjs.testSuiteState[<index>].name.",
      "If the user provides a test suite state name, fetch project info, find the matching state in customListObjs.testSuiteState[index].name, and use its ID in the payload as testSuiteState. If the name is not found, skip the testSuiteState field (it is not required) and show a user-friendly message: 'Test suite updated without test suite state, as given state is not available in the current project.'",
      "If either owner or state is not found in project info, the update for that field will be skipped and a user-friendly message will be shown to the user.",
      "UDF fields in steps must match your QMetry custom field configuration.",
      "All IDs (testSuiteState from customListObjs.testSuiteState[index].id, testsuiteOwner from customListObjs.owner[index].id) must be valid for your QMetry instance.",
      "If a custom field is mandatory, include it in the UDF object.",
    ],
    outputDescription:
      "JSON object containing the new test suite ID, summary, and creation metadata.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Suites",
    summary:
      "Fetch QMetry test suites - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_TEST_SUITES,
    inputSchema: TestSuiteListArgsSchema,
    purpose:
      "Get test suites from QMetry. System automatically gets correct viewId from project info if not provided.",
    useCases: [
      "List all test suites in a project",
      "Search for specific test suites using filters",
      "Browse test suites in specific folders",
      "Get paginated test suite results",
    ],
    examples: [
      {
        description:
          "Get all test suites from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of test suites from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all test suites from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of test suites from UT project using UT's specific TS viewId",
      },
      {
        description:
          "Get test suites with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 103097, folderPath: "" }, // This is an example viewId, must be resolved per project TS viewId
        expectedOutput: "Test suites using manually specified viewId 103097", // This is an example viewId, must be resolved per project TS viewId
      },
      {
        description:
          "List test suites from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId: "fetch specific project given projectKey Test Suite ViewId", // auto-resolved
          folderPath: "",
        },
        expectedOutput:
          "Test suites using manually specified viewId 103097 or projectKey", // This is an example viewId, must be resolved per project TS viewId
      },
      {
        description: "Get test suites by release/cycle filter",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Test suites associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test suites by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All test suites associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get test suites by cycle only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "All test suites associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Search for specific test suite by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TS-1684","field":"entityKeyId"}]',
        },
        expectedOutput: "Test suites matching the entity key criteria",
      },
      {
        description:
          "Search for multiple test suites by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-TS-1684,MAC-TS-1685,MAC-TS-1686","field":"entityKeyId"}]',
        },
        expectedOutput: "Test suites matching any of the specified entity keys",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and test suite fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.TS.viewId",
      "Step 3: Use the SAME projectKey and the extracted TS viewId for fetching test suites",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and test suite fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by test suite key (like MAC-TS-1684), use filter: \'[{"type":"string","value":"MAC-TS-1684","field":"entityKeyId"}]\'',
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs, not names, for filtering",
      'For release filter: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For cycle filter: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For combined release+cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "FILTER FIELDS: name, release, cycle, platform, isArchived, testsuiteStatus, createdByAlias, createdDate, entityKeyId, attachmentCount, linkedPlatformCount, linkedTcCount, updatedByAlias, updatedDate, owner, remExecutionTime, and totalExecutionTime",
      "SORT FIELDS: entityKey, name, testsuiteStatus, linkedPlatformCount, linkedTcCount, createdDate, createdByAlias, updatedDate, updatedByAlias, attachmentCount, remExecutionTime, and totalExecutionTime",
      "For multiple entity keys, use comma-separated values in filter",
      "Use empty string '' as folderPath for root directory",
    ],
    outputDescription:
      "JSON object with 'data' array containing test suites and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Test Suites for Test Case",
    summary:
      "Get test suites that can be linked to test cases in QMetry with automatic viewId resolution",
    handler: QMetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE,
    inputSchema: TestSuitesForTestCaseArgsSchema,
    purpose:
      "Retrieve test suites available for linking with test cases. " +
      "This tool helps organize test cases into test suites for better test management, " +
      "execution planning, and reporting. You can filter test suites by various criteria " +
      "to find the most appropriate suites for test case organization. " +
      "The tsFolderID parameter is required and represents the Test Suite folder ID. " +
      "The viewId parameter is automatically resolved from project info (latestViews.TSFS.viewId) " +
      "if not provided, making the tool easier to use.",
    useCases: [
      "Get test suites available for linking with test cases",
      "Find appropriate test suites for test case organization",
      "Browse test suites in specific folders for better management",
      "Filter test suites by release, cycle, or archive status",
      "Organize test execution by grouping test cases into test suites",
      "Plan test suite structure for comprehensive test coverage",
      "Manage test case categorization for reporting purposes",
      "Search for existing test suites before creating new ones",
      "Get root test suite folder contents using project info",
    ],
    examples: [
      {
        description:
          "Get test suites from root folder using auto-resolved viewId",
        parameters: { tsFolderID: 113557 },
        expectedOutput:
          "List of test suites available in the root test suite folder with auto-resolved viewId",
      },
      {
        description:
          "Get test suites with custom pagination and auto-resolved viewId",
        parameters: { tsFolderID: 113557, page: 1, limit: 25 },
        expectedOutput: "Paginated list of test suites with 20 items per page",
      },
      {
        description: "Filter test suites by release with auto-resolved viewId",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"type":"list","value":[55178],"field":"release"}]',
        },
        expectedOutput: "Test suites associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Filter test suites by cycle with auto-resolved viewId",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput: "Test suites associated with Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get only active (non-archived) test suites",
        parameters: {
          tsFolderID: 113557,
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of active test suites (not archived)",
      },
      {
        description: "Filter test suites by release and cycle",
        parameters: {
          tsFolderID: 113557,
          filter:
            '[{"type":"list","value":[55178],"field":"release"},{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput:
          "Test suites associated with both Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Get test suites with column information",
        parameters: { tsFolderID: 113557, getColumns: true },
        expectedOutput:
          "Test suites list with detailed column metadata for better interpretation",
      },
      {
        description:
          "Search test suites from specific sub-folder with manual viewId",
        parameters: { tsFolderID: 42, viewId: 104316 }, // This is an example viewId, must be resolved per project TS viewId
        expectedOutput:
          "Test suites available in specific folder ID 42 for test case linking",
      },
    ],
    hints: [
      "CRITICAL: tsFolderID is REQUIRED - Test Suite folder ID will be auto-resolved if not provided",
      "viewId will be AUTOMATICALLY RESOLVED from project info if not provided",
      "HOW TO GET tsFolderID:",
      "1. Call FETCH_PROJECT_INFO tool first to get project configuration",
      "2. From the response, use rootFolders.TS.id for the root test suite folder",
      "3. Example: rootFolders.TS.id = 113557 (MAC project root TS folder)",
      "4. If user doesn't specify tsFolderID, automatically use rootFolders.TS.id from project info",
      "VIEWID AUTO-RESOLUTION:",
      "1. System automatically fetches project info using the projectKey",
      "2. Extracts latestViews.TSFS.viewId automatically",
      "3. Example: latestViews.TSFS.viewId = 104316 (MAC project TSFS view)", // This is an example viewId, must be resolved per project TSFS viewId
      "4. Manual viewId only needed if you want to override the automatic resolution",
      "WORKFLOW: System automatically handles project info if tsFolderID or viewId is not provided",
      "PROJECT INFO STRUCTURE: clientData.rootFolders.TS.id contains the root test suite folder ID",
      "PROJECT INFO STRUCTURE: latestViews.TSFS.viewId contains the test suite folder view ID",
      "For sub-folders: Use specific folder IDs if you know them, or call folder listing APIs",
      "FILTER CAPABILITIES: Same as other QMetry list operations",
      "FILTER FIELDS: release, cycle, isArchived, name, status, priority",
      "RELEASE/CYCLE FILTERING: Use numeric IDs in list format (get from FETCH_RELEASES_AND_CYCLES)",
      "ARCHIVE FILTERING: 0=Active, 1=Archived",
      "getColumns=true provides additional metadata for result interpretation",
      "Multiple filter conditions are combined with AND logic",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "This tool helps organize test cases into logical test suites",
      "Essential for test execution planning and test case management",
      "Use this before creating new test suites to check existing ones",
    ],
    outputDescription:
      "JSON object with test suites array and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Test Cases to Test Suite",
    summary: "Link test cases to a test suite in QMetry.",
    handler: QMetryToolsHandlers.LINK_TESTCASES_TO_TESTSUITE,
    inputSchema: LinkTestCasesToTestSuiteArgsSchema,
    purpose:
      "Link one or more test cases to a test suite. " +
      "Requires tcvdIDs, which can be auto-resolved from the test case entityKey using the test case list and version detail tools. " +
      "Supports direct test case linkage.",
    useCases: [
      "Link test cases to a test suite by entity keys",
      "Bulk link multiple test cases to a suite",
      "Automate test suite composition from test cases",
    ],
    examples: [
      {
        description: "Link test cases to a test suite",
        parameters: {
          tsID: 8674,
          tcvdIDs: [5448504, 5448503],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases QTM-TC-32 and QTM-TC-35 linked to test suite 8674.",
      },
      {
        description:
          "Link test cases directly to test suites with test cases entityKeys VT-TC-9, VT-TC-10 to test suite id 1487397",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases VT-TC-9 and VT-TC-10 linked to test suite 1487397.",
      },
      {
        description:
          "Link test case VT-TC-4, VT-TC-1,VT-TC-101, VT-TC-22 to test suite VT-TS-3",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503, 5448505, 5448506],
          fromReqs: false,
        },
        expectedOutput:
          "Test cases VT-TC-4, VT-TC-1, VT-TC-101, and VT-TC-22 linked to test suite VT-TS-3.",
      },
    ],
    hints: [
      "To get the tsID, call the Fetch Test Suites for Test Case API with rootFolderId otherwise if given folderid so use that and from response get the id.",
      "To get the tcvdIDs by testcase entityKey, call the Testcase/Fetch Versions API and use data[<index>].tcVersionID.",
      "Set fromReqs to false to direct test case linkage.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Requirements Linked Test Cases to Test Suite",
    summary:
      "Link test cases (including those linked to requirements) to a test suite in QMetry.",
    handler: QMetryToolsHandlers.REQUIREMENTS_LINKED_TESTCASES_TO_TESTSUITE,
    inputSchema: RequirementsLinkedTestCasesToTestSuiteArgsSchema,
    purpose:
      "Link one or more test cases to a test suite. " +
      "Requires tcvdIDs, which can be auto-resolved from the Fetch Test Cases Linked to Requirement API by <requirementEntityKey> to fetch If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID and get the linked test cases version ids from the tools." +
      "Supports requirement-based test case linkage.",
    useCases: [
      "Link requirements linked test cases to a test suite",
      "Bulk link multiple requirements linked test cases to a suite",
      "Automate test suite composition from requirements linked test cases",
    ],
    examples: [
      {
        description: "VT-RQ-18 Requirements Linked test cases to a test suite",
        parameters: { tsID: 8674, tcvdIDs: [5448504, 5448503], fromReqs: true },
        expectedOutput:
          "Test cases QTM-TC-32 and QTM-TC-35 linked to test suite 8674.",
      },
      {
        description:
          "VT-RQ-19 Requirements Linked test cases to test suites id 1487397",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503],
          fromReqs: true,
        },
        expectedOutput:
          "Test cases VT-TC-9 and VT-TC-10 linked to test suite 1487397.",
      },
      {
        description:
          "VT-RQ-20 Requirements Linked test case to test suite VT-TS-3",
        parameters: {
          tsID: 1487397,
          tcvdIDs: [5448504, 5448503, 5448505, 5448506],
          fromReqs: true,
        },
        expectedOutput:
          "Test cases VT-TC-4, VT-TC-1, VT-TC-101, and VT-TC-22 linked to test suite VT-TS-3.",
      },
    ],
    hints: [
      "To get the tsID, call the Fetch Test Suites for Test Case API with rootFolderId otherwise if given folderid so use that and from response get the id.",
      "To get the requirement linked tcvdIDs by requirement entityKey, call the Fetch Test Cases Linked to Requirement API by <requirementEntityKey> to fetch If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID and get the linked test cases version ids.",
      "Set fromReqs to true to link requirements linked test cases instead of direct test case linkage.",
    ],
    outputDescription: "JSON object with linkage status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Link Platforms to Test Suite",
    summary: "Link one or more platforms to a QMetry Test Suite.",
    handler: QMetryToolsHandlers.LINK_PLATFORMS_TO_TESTSUITE,
    inputSchema: LinkPlatformsToTestSuiteArgsSchema,
    purpose:
      "Associate testing platforms (browsers, OS, devices, or environments) with a specific Test Suite. " +
      "This enables tracking which platforms a test suite should be executed on and helps organize test execution across different environments.",
    useCases: [
      "Link a single platform to a test suite",
      "Link multiple platforms to a test suite for cross-platform testing",
      "Define execution environments for a test suite",
      "Organize test suites by supported platforms",
      "Set up platform-specific test suite configurations",
    ],
    examples: [
      {
        description: "Link single platform to a test suite",
        parameters: {
          qmTsId: 1511970,
          qmPlatformId: "63004",
        },
        expectedOutput:
          "Platform 63004 linked to test suite 1511970 successfully.",
      },
      {
        description: "Link multiple platforms to a test suite",
        parameters: {
          qmTsId: 1511970,
          qmPlatformId: "63004,63005,63006",
        },
        expectedOutput:
          "Platforms 63004, 63005, 63006 linked to test suite 1511970 successfully.",
      },
    ],
    hints: [
      "CRITICAL: qmTsId and qmPlatformId are REQUIRED parameters",
      "To get the qmTsId (Test Suite ID):",
      "  1. Call 'Testsuite/Fetch Testsuite' API",
      "  2. From response, use data[<index>].id",
      "  3. Example: Test Suite 'Login Tests' might have ID 1511970",
      "To get the qmPlatformId (Platform ID):",
      "  1. Call 'Platform/List' API (Fetch Platforms tool)",
      "  2. From response, use data[<index>].platformID",
      "  3. Example: Platform 'Chrome' might have ID 63004",
      "qmPlatformId accepts comma-separated values for multiple platforms",
      "Format for multiple platforms: '63004,63005,63006'",
      "No spaces in the comma-separated list",
      "If test suite entity key (e.g., VT-TS-12) is provided, first fetch test suites to resolve numeric ID",
      "Platforms represent browsers, operating systems, devices, or custom environments",
      "This tool helps organize cross-platform test execution",
      "Essential for comprehensive platform coverage testing",
    ],
    outputDescription:
      "JSON object with linkage status, success message, and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Cases Linked to Test Suite",
    summary:
      "Get test cases that are linked (or not linked) to a specific test suite in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASES_BY_TESTSUITE,
    inputSchema: TestCasesByTestSuiteArgsSchema,
    purpose:
      "Retrieve test cases that are linked to a specific test suite. " +
      "This tool provides the ability to see which test cases belong to a test suite, " +
      "helping with test execution planning, suite management, and coverage analysis. " +
      "The tsID parameter represents the Test Suite ID obtained from test suite listings. " +
      "The getLinked parameter is optional and defaults to true for fetching linked test cases.",
    useCases: [
      "Get all test cases linked to a specific test suite for execution planning",
      "Find test cases that are NOT linked to a test suite (gap analysis)",
      "Analyze test suite composition and coverage",
      "Filter linked test cases by various criteria",
      "Plan test execution based on test suite structure",
      "Generate test suite reports and documentation",
      "Validate test suite contents before execution",
      "Manage test case organization within test suites",
      "Export test suite details for external reporting",
      "Verify test case assignments in test suites",
    ],
    examples: [
      {
        description:
          "Get all test cases linked to test suite ID 1497291 (default behavior)",
        parameters: { tsID: 1497291 },
        expectedOutput:
          "List of test cases linked to the test suite with test case details and metadata",
      },
      {
        description:
          "Get all test cases linked to test suite ID 1497291 (explicit)",
        parameters: { tsID: 1497291, getLinked: true },
        expectedOutput:
          "List of test cases linked to the test suite with test case details and metadata",
      },
      {
        description: "Get test cases NOT linked to test suite (gap analysis)",
        parameters: { tsID: 1497291, getLinked: false },
        expectedOutput:
          "List of test cases that are NOT linked to the test suite",
      },
      {
        description: "Get linked test cases with custom pagination",
        parameters: { tsID: 1497291, getLinked: true, page: 1, limit: 25 },
        expectedOutput:
          "Paginated list of linked test cases with 50 items per page",
      },
      {
        description:
          "Filter linked test cases by priority (using default getLinked=true)",
        parameters: {
          tsID: 1497291,
          filter: '[{"value":[1,2],"type":"list","field":"priorityAlias"}]',
        },
        expectedOutput:
          "High and medium priority test cases linked to the suite",
      },
      {
        description: "Filter linked test cases by status",
        parameters: {
          tsID: 1497291,
          getLinked: true,
          filter: '[{"value":[1],"type":"list","field":"testCaseStateAlias"}]',
        },
        expectedOutput: "Active test cases linked to the test suite",
      },
    ],
    hints: [
      "CRITICAL: tsID parameter is REQUIRED - this is the Test Suite numeric ID",
      "getLinked parameter is OPTIONAL - defaults to true if not provided",
      "HOW TO GET tsID:",
      "1. Call API 'Testsuite/Fetch Testsuite' to get available test suites",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite 'Regression Suite' might have ID 1497291",
      "tsID is NOT the same as tsFolderID - tsID refers to a specific test suite, not a folder",
      "getLinked=true (default): Returns test cases that ARE linked to the test suite",
      "getLinked=false: Returns test cases that are NOT linked to the test suite (useful for gap analysis)",
      "If getLinked is not specified, it defaults to true (linked test cases)",
      "FILTER CAPABILITIES: Support filtering by test case properties",
      "FILTER FIELDS: priorityAlias (list), testCaseStateAlias (list), testingTypeAlias (list), testCaseTypeAlias (list), componentAlias (list), owner (list)",
      "PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "STATUS IDs: Typically 1=Active, 2=Review, 3=Deprecated (verify with your QMetry instance)",
      "TESTING TYPE IDs: Typically 1=Manual, 2=Automated (verify with your QMetry instance)",
      "TYPE IDs: Typically 1=Functional, 2=Integration, 3=System (verify with your QMetry instance)",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for test suite management and execution planning",
      "Helps verify test suite composition before test runs",
      "Critical for understanding test coverage within specific suites",
      "Use for test suite analysis and optimization",
    ],
    outputDescription:
      "JSON object with test cases array containing test case details, properties, and suite linkage information",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Executions by Test Suite",
    summary: "Get executions for a given test suite in QMetry",
    handler: QMetryToolsHandlers.FETCH_EXECUTIONS_BY_TESTSUITE,
    inputSchema: ExecutionsByTestSuiteArgsSchema,
    purpose:
      "Retrieve test executions that belong to a specific test suite. " +
      "This tool provides comprehensive execution data including test results, " +
      "execution status, platforms, releases, cycles, and other execution metadata. " +
      "Essential for test execution reporting, trend analysis, and test suite performance monitoring.",
    useCases: [
      "Get all executions for a specific test suite for reporting purposes",
      "Analyze test execution results and trends within a test suite",
      "Filter executions by release, cycle, platform, or automation status",
      "Monitor test suite execution performance across different environments",
      "Generate execution reports for specific test suites",
      "Track execution history and patterns for test suite optimization",
      "Validate test suite execution coverage across releases and cycles",
      "Audit test execution data for compliance and quality assurance",
      "Export execution data for external reporting and analytics",
    ],
    examples: [
      {
        description: "Get all executions for test suite ID 194955",
        parameters: { tsID: 194955 },
        expectedOutput:
          "List of executions for the test suite with execution details, status, and metadata",
      },
      {
        description: "Get executions with test suite folder and view ID",
        parameters: {
          tsID: 194955,
          tsFolderID: 126554,
          viewId: 41799, // This is an example viewId, must be resolved per project TEL viewId
        },
        expectedOutput:
          "Executions filtered by test suite folder and specific view configuration",
      },
      {
        description: "Filter executions by release and cycle",
        parameters: {
          tsID: 194955,
          filter:
            '[{"type":"list","value":[55178],"field":"releaseID"},{"type":"list","value":[111577],"field":"cycleID"}]',
        },
        expectedOutput:
          "Executions filtered by specific release (55178) and cycle (111577)",
      },
      {
        description: "Filter executions by platform and automation status",
        parameters: {
          tsID: 194955,
          filter:
            '[{"type":"list","value":[12345],"field":"platformID"},{"type":"boolean","value":true,"field":"isAutomatedFlag"}]',
        },
        expectedOutput:
          "Automated executions filtered by specific platform (12345)",
      },
      {
        description: "Get only active (non-archived) executions",
        parameters: {
          tsID: 194955,
          filter: '[{"value":[0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "Active executions that are not archived",
      },
      {
        description: "Get executions with custom pagination and grid name",
        parameters: {
          tsID: 194955,
          gridName: "TESTEXECUTIONLIST",
          page: 1,
          limit: 25,
        },
        expectedOutput:
          "Paginated list of executions with 25 items per page using specific grid configuration",
      },
    ],
    hints: [
      "!MOST IMPORTANT HOW TO GET viewId:",
      "CRITICAL: Always resolve and use the correct test execution viewId for the current project when calling this tool.",
      "The viewId parameter must be fetched from the active project's info (latestViews.TEL.viewId).",
      "Each QMetry project may have a different test execution list viewId, so using a stale or incorrect viewId will result in incomplete or invalid executions list data by test suite id.",
      "Usage workflow:",
      "1. Fetch project info for the current project (Admin/Get info Service).",
      "2. Extract latestViews.TEL.viewId from the response.",
      "3. Use this viewId in the Fetch Test Case Runs by Test Suite Run API call.",
      "Example:",
      "   {",
      "     tsID: 1533730,",
      "     viewId: 94194,", // This is an example viewId, must be resolved per project TEL viewId
      "     gridName: 'TESTEXECUTIONLIST'",
      "   }",
      "CRITICAL: tsID parameter is REQUIRED - this is the Test Suite numeric ID",
      "HOW TO GET tsID:",
      "1. Call API 'Testsuite/Fetch Testsuite' to get available test suites",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite 'Regression Suite' might have ID 194955",
      "HOW TO GET tsFolderID (optional):",
      "1. Call API 'Testsuite/List of folders' to get test suite folders",
      "2. From the response, get value of following attribute -> data[<index>].id",
      "3. Example: Test Suite folder might have ID 126554",
      "FILTER CAPABILITIES: Extensive filtering by execution properties",
      "FILTER FIELDS: releaseID (list), cycleID (list), platformID (list), isAutomatedFlag (boolean), isArchived (list)",
      "RELEASE/CYCLE FILTERING: Use numeric IDs in list format (get from FETCH_RELEASES_AND_CYCLES)",
      "PLATFORM FILTERING: Use numeric platform IDs (get from FETCH_PLATFORMS)",
      "AUTOMATION STATUS: Use boolean true/false for isAutomatedFlag field",
      "ARCHIVE STATUS: 0=Active executions, 1=Archived executions",
      "GRID NAME: Default is 'TESTEXECUTIONLIST' - used for execution list display configuration",
      "VIEW ID: Optional numeric identifier for specific execution view configurations",
      "Multiple filter conditions are combined with AND logic",
      "Use pagination for large execution result sets (start, page, limit parameters)",
      "This tool is essential for test execution analysis and reporting",
      "Critical for monitoring test suite performance and execution trends",
      "Use for compliance reporting and execution audit trails",
      "Essential for test execution planning and resource optimization",
    ],
    outputDescription:
      "JSON object with executions array containing execution details, status, platforms, releases, and execution metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Test Case Runs by Test Suite Run",
    summary:
      "Get test case runs under a specific test suite run execution in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    inputSchema: TestCaseRunsByTestSuiteRunArgsSchema,
    purpose:
      "Retrieve detailed test case run information for a specific test suite run execution. " +
      "This tool provides comprehensive test case run data including execution status, " +
      "test results, tester information, execution dates, and other run metadata. " +
      "Essential for detailed execution analysis, test run reporting, and execution audit trails. " +
      "NOTE: Uses simplified payload structure with only essential parameters (start, page, limit, tsrunID, viewId).",
    useCases: [
      "Get all test case runs under a specific test suite run execution",
      "Analyze individual test case execution results and status",
      "Monitor test case run performance and execution trends",
      "Generate detailed test execution reports for specific runs",
      "Track test case run history and execution patterns",
      "Validate test case run coverage and execution completeness",
      "Audit test case run data for compliance and quality assurance",
      "Export detailed test case run data for external reporting",
      "Retrieve paginated test case run results for large test suite executions",
    ],
    examples: [
      {
        description: "Get all test case runs for test suite run ID '107021'",
        parameters: { tsrunID: "107021", viewId: 6887 }, // This is an example viewId, must be resolved per project TE viewId
        expectedOutput:
          "List of test case runs with execution details, status, and metadata",
      },
      {
        description: "Get test case runs with linked defects",
        parameters: {
          tsrunID: "107021",
          viewId: 6887, // This is an example viewId, must be resolved per project TE viewId
          page: 1,
          limit: 25,
        },
        expectedOutput:
          "Paginated list of test case runs with 25 items per page",
      },
      {
        description: "Get test case runs for test suite run ID '2362144'",
        parameters: {
          tsrunID: "2362144",
          viewId: 104123, // This is an example viewId, must be resolved per project TE viewId
          start: 0,
          page: 1,
          limit: 25,
        },
        expectedOutput:
          "Test case runs from the specified test suite run execution",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW FOR FETCHING ALL EXECUTIONS OF A TEST SUITE:",
      "When user asks to 'fetch all executions', 'get all test runs', 'fetch all tcRunIDs for test suite X', or 'update status for all executions of test suite X':",
      "STEP 1: First call FETCH_EXECUTIONS_BY_TESTSUITE tool with the test suite ID (tsID, not entityKey)",
      "  - This returns ALL execution records for that test suite (could be 3, 5, 9, or any number)",
      "  - Extract ALL tsRunID values from the response data array",
      "  - Example response: data: [{tsRunID: '2739237', ...}, {tsRunID: '2739236', ...}, {tsRunID: '2739235', ...}]",
      "STEP 2: For EACH tsRunID from Step 1, call this tool (FETCH_TEST_CASE_RUNS_BY_TESTSUITE_RUN)",
      "  - This returns all test case runs (tcRunID values) for that specific execution",
      "  - Repeat for ALL tsRunID values discovered in Step 1",
      "STEP 3: Collect all tcRunID values from all executions",
      "  - Now you have the complete list of test case runs across ALL executions",
      "  - Use these for bulk status updates or other operations",
      "CRITICAL ERROR TO AVOID:",
      "- NEVER assume or hard-code only 2-3 execution IDs",
      "- NEVER skip Step 1 - always discover ALL executions first",
      "- NEVER fetch tcRunIDs for only some executions - get ALL of them",
      "- If there are 9 executions, you must fetch tcRunIDs for all 9, not just 2",
      "EXAMPLE WORKFLOW:",
      "User: 'Fetch all test case runs for test suite VKMCP-TS-21'",
      "Step 1: Call FETCH_EXECUTIONS_BY_TESTSUITE with tsID (resolved from VKMCP-TS-21)",
      "  Result: Found 9 executions with tsRunIDs: 2739237, 2739236, 2739235, 2739234, 2739233, 2739232, 2739231, 2739230, 2739229",
      "Step 2: Call this tool 9 times (once for each tsRunID)",
      "  Call 1: tsrunID='2739237' -> returns 54 tcRunIDs",
      "  Call 2: tsrunID='2739236' -> returns 54 tcRunIDs",
      "  ... (repeat for all 9)",
      "Step 3: Total collected: 9 executions × 54 test cases = 486 total tcRunIDs",
      "",
      "PERFORMANCE CONSIDERATIONS FOR LARGE TEST RUNS:",
      "When dealing with large numbers of test case runs (500+, 1000+), follow these guidelines:",
      "1. ALWAYS inform the user about the scale BEFORE starting operations:",
      "   Example: 'Found 9 executions with approximately 486 test case runs. This will require fetching data from all 9 executions and may take a moment.'",
      "2. For bulk status updates on 1000+ test case runs:",
      "   - NEVER attempt to update all 1000+ in a single operation",
      "   - Break into smaller batches of 10-20 test case runs per update",
      "   - Inform user: 'Found 1000 test case runs. Will process in batches of 20 to ensure reliability and performance.'",
      "   - Show progress: 'Processing batch 1/50 (20 test runs)...', 'Batch 2/50...'",
      "3. Recommended batch sizes:",
      "   - For status updates: 10-20 test case runs per batch",
      "   - For fetching data: Can handle larger batches (50-100)",
      "   - Adjust based on API response times and timeout limits",
      "4. Always provide progress updates for long-running operations:",
      "   - Before: 'Processing 1000 test runs in 50 batches of 20...'",
      "   - During: 'Completed 200/1000 test runs (10 batches)...'",
      "   - After: 'Successfully updated all 1000 test case runs.'",
      "5. Error handling for batch operations:",
      "   - If a batch fails, report which batch and continue with remaining",
      "   - Provide summary at the end: 'Completed 48/50 batches. 2 batches failed (batch 23, 45).'",
      "   - Allow user to retry failed batches specifically",
      "EXAMPLE LARGE-SCALE WORKFLOW:",
      "User: 'Update status to Failed for all test runs in VKMCP-TS-21'",
      "Step 1: Discover all executions (9 found)",
      "Step 2: Fetch all tcRunIDs (486 total)",
      "Step 3: Inform user: 'Found 486 test case runs across 9 executions. Will update in 25 batches of 20 runs each.'",
      "Step 4: Process in batches with progress updates",
      "Step 5: Report completion: 'Successfully updated all 486 test case runs to Failed status.'",
      "",
      "CRITICAL: tsrunID and viewId parameters are REQUIRED",
      "tsrunID is a STRING identifier for the test suite run execution",
      "viewId is a NUMERIC identifier for the test execution view",
      "!MOST IMPORTANT HOW TO GET tsrunID:",
      "1. Call API 'Execution/Fetch Executions' (FETCH_EXECUTIONS_BY_TESTSUITE) to get ALL available executions",
      "2. From the response, get value of following attribute -> data[<index>].tsRunID for EVERY execution",
      "3. Example: Test Suite might have multiple executions with IDs '107021', '107022', '107023', etc.",
      "4. NEVER assume there are only 2-3 executions - always fetch to discover the actual count",
      "!MOST IMPORTANT HOW TO GET viewId:",
      "CRITICAL: Always resolve and use the correct test execution viewId for the current project when calling this tool.",
      "The viewId parameter must be fetched from the active project's info (latestViews.TE.viewId).",
      "Each QMetry project may have a different test execution viewId, so using a stale or incorrect viewId will result in incomplete or invalid test case run data.",
      "Usage workflow:",
      "1. Fetch project info for the current project (Admin/Get info Service).",
      "2. Extract latestViews.TE.viewId from the response.",
      "3. Use this viewId in the Fetch Test Case Runs by Test Suite Run API call.",
      "Example:",
      "   {",
      '     tsrunID: "2362144",',
      "     viewId: 104123,", // This is an example viewId, must be resolved per project TE viewId
      "     start: 0,",
      "     page: 1,",
      "     limit: 25",
      "   }",
      "This ensures the tool fetches the proper execution runs data for the selected project context.",
      "SIMPLIFIED PAYLOAD: API only accepts essential parameters",
      "SUPPORTED PARAMETERS: start, page, limit, tsrunID, viewId",
      "REMOVED PARAMETERS: filter, sort, showTcWithDefects, udfFilter (cause API errors)",
      "PAGINATION: Use start, page, and limit for result pagination",
      "API REQUIREMENT: Must use exact payload structure that works in Postman",
      'PAYLOAD FORMAT: {"start": 0, "page": 1, "limit": 10, "tsrunID": "2362144", "viewId": 104123}', // Example payload, must use resolved viewId per project TE viewId
      "Use pagination for large result sets (start, page, limit parameters)",
      "This tool is essential for detailed test execution analysis and reporting",
      "Critical for monitoring individual test case execution performance",
      "Use for compliance reporting and execution audit trails",
      "Essential for test execution quality assurance and trend analysis",
    ],
    outputDescription:
      "JSON object with test case runs array containing detailed execution information, status, tester details, and run metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Bulk Update Test Case Execution Status",
    summary:
      "Update execution status for individual or multiple test case runs in bulk",
    handler: QMetryToolsHandlers.BULK_UPDATE_EXECUTION_STATUS,
    inputSchema: BulkUpdateExecutionStatusArgsSchema,
    purpose:
      "Update the execution status (Pass, Fail, Blocked, Not Run, WIP, etc.) for one or more test case runs. " +
      "This tool enables both single and bulk status updates for test executions, providing flexibility for " +
      "manual test execution management, automated test result updates, and test execution tracking. " +
      "Essential for maintaining accurate test execution records and execution status reporting.",
    useCases: [
      "Update single test case run status to Pass, Fail, Blocked, or Not Run",
      "Bulk update multiple test case run statuses in a single operation",
      "Mark all selected test case runs as Not Run for re-execution",
      "Update execution status after manual test execution",
      "Set execution status based on automated test results",
      "Update test execution status across different test environments",
      "Track test execution progress and completion",
      "Manage test execution status for compliance and reporting",
    ],
    examples: [
      {
        description:
          "Update single test case run status to Failed (single execution)",
        parameters: {
          entityIDs: "66095087",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123266,
          isBulkOperation: false,
        },
        expectedOutput:
          "Test case run 66095087 status updated to Failed successfully",
      },
      {
        description:
          "Bulk update two test case runs to Pass status (bulk execution)",
        parameters: {
          entityIDs: "66095069,66095075",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123268,
          isBulkOperation: true,
          comments: "All test cases passed successfully",
        },
        expectedOutput:
          "Test case runs 66095069 and 66095075 updated to Pass status successfully",
      },
      {
        description:
          "Bulk update all selected test case runs to Not Run status",
        parameters: {
          entityIDs:
            "66095069,66095075,66095081,66095087,66095093,66095099,66095105",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123269,
          isBulkOperation: true,
        },
        expectedOutput:
          "7 test case runs updated to Not Run status successfully for re-execution",
      },
      {
        description: "Update test case run with build/drop information",
        parameters: {
          entityIDs: "66095087",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123266,
          dropID: 947,
          isBulkOperation: false,
        },
        expectedOutput:
          "Test case run updated with execution status and build information",
      },
      {
        description:
          "Update automated test execution status with automation flag",
        parameters: {
          entityIDs: "66095069,66095075",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123268,
          isAutoExecuted: "1",
          isBulkOperation: true,
          comments: "Automated test execution completed",
        },
        expectedOutput:
          "Automated test case runs updated to Pass status with automation flag",
      },
      {
        description:
          "Update test case run status with Part 11 Compliance authentication",
        parameters: {
          entityIDs: "66095087",
          entityType: "TCR",
          qmTsRunId: "2720260",
          runStatusID: 123266,
          username: "dhaval.mistry",
          password: "Ispl123#",
          isBulkOperation: false,
        },
        expectedOutput:
          "Test case run status updated with Part 11 Compliance authentication",
      },
      {
        description:
          "Update ALL executions of test suite VKMC-TS-20 to Failed (MULTI-CALL OPERATION)",
        parameters: {
          entityIDs: "66341841,66342887,66342893,66342899",
          entityType: "TCR",
          qmTsRunId: "2733104",
          runStatusID: 123269,
          isBulkOperation: true,
        },
        expectedOutput:
          "Execution 1/4 updated. The MCP Agent will automatically repeat this operation for executions 2733205, 2733306, and 2733407 using their corresponding entityIDs.",
      },
    ],
    hints: [
      "CRITICAL: entityIDs, entityType, qmTsRunId, and runStatusID are REQUIRED parameters",
      "",
      "⚠️ CRITICAL - ALWAYS FETCH STATUS IDs FROM PROJECT INFO:",
      "NEVER use hardcoded or memorized status IDs. Status IDs are PROJECT-SPECIFIC and must be fetched dynamically.",
      "MANDATORY WORKFLOW BEFORE USING runStatusID:",
      "1. Call mcp_smartbear_qmetry_fetch_qmetry_project_info with the current projectKey",
      "2. Extract the 'allstatus' array from the response",
      "3. Match the desired status NAME to find its corresponding ID",
      "4. Use the fetched ID in the runStatusID parameter",
      "",
      "EXAMPLE STATUS ID RESOLUTION:",
      "User says: 'Update status to Failed'",
      "Step 1: Call FETCH_PROJECT_INFO → Get allstatus array",
      "Step 2: Find status where name='Failed' → Extract its id property",
      "Step 3: Use that id as runStatusID (e.g., 123269 for 'Failed')",
      "",
      "COMMON STATUS NAMES (IDs vary by project - MUST VALIDATE):",
      "- 'Passed' / 'Pass' - Test case executed successfully",
      "- 'Failed' / 'Fail' - Test case failed with errors",
      "- 'Blocked' - Test case cannot be executed due to blockers",
      "- 'Not Run' - Test case not yet executed or needs re-execution",
      "- 'WIP' / 'Work In Progress' - Test case execution in progress",
      "- 'Not Applicable' - Test case not applicable for this execution",
      "",
      "WHY THIS IS CRITICAL:",
      "- Status IDs are assigned per QMetry project and are NOT universal",
      "- Using wrong status ID will update tests with incorrect status",
      "- Example: ID 123268 might be 'Blocked' in one project but 'Passed' in another",
      "- The allstatus array is the AUTHORITATIVE source for all status mappings",
      "",
      "HOW TO GET entityIDs (Test Case Run IDs):",
      "1. Call API 'Execution/Fetch Testcase Run ID' (FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN tool)",
      "2. From the response, get value of following attribute -> data[<index>].tcRunID",
      "3. Example: Single ID '66095087' or Multiple IDs '66095069,66095075,66095081'",
      "4. For bulk operations, provide comma-separated IDs without spaces",
      "HOW TO GET qmTsRunId (Test Suite Run ID):",
      "1. Call API 'Execution/Fetch Executions' (FETCH_EXECUTIONS_BY_TESTSUITE tool)",
      "2. From the response, get value of following attribute -> data[<index>].tsRunID",
      "3. Example: Test Suite Run ID might be '2720260'",
      "HOW TO GET runStatusID (Execution Status ID) - DETAILED PROCESS:",
      "1. Call API 'Admin/Get info Service' (FETCH_PROJECT_INFO tool) with projectKey",
      "2. From the response, locate the 'allstatus' array",
      "3. Search for the status object where name matches your desired status (case-insensitive)",
      "4. Extract the 'id' property from the matching status object",
      "5. NEVER use example IDs from documentation - they are project-specific",
      "",
      "EXAMPLE allstatus ARRAY STRUCTURE:",
      "allstatus: [",
      "  { name: 'Passed', defaultName: 'passed', id: 123266, color: '#14892C|#FFFFFF' },",
      "  { name: 'Failed', defaultName: 'failed', id: 123269, color: '#FF6666|#FFFFFF' },",
      "  { name: 'Blocked', defaultName: 'blocked', id: 123268, color: '#CCCCCC|#FFFFFF' },",
      "  { name: 'Not Run', defaultName: 'notrun', id: 123270, color: '#205081|#FFFFFF', isdefault: true },",
      "  { name: 'Not Applicable', defaultName: 'empty', id: 123267, color: '#59AFE1|#FFFFFF' }",
      "]",
      "Note: Above IDs are EXAMPLES ONLY - fetch actual IDs from your project",
      "HOW TO GET dropID (Build/Drop ID) - OPTIONAL:",
      "1. Call API 'Build/List' (FETCH_BUILDS tool)",
      "2. From the response, get value of following attribute -> data[<index>].dropID",
      "3. Example: Build/Drop ID might be 947",
      "ENTITY TYPES:",
      "- 'TCR' = Test Case Run (most common use case)",
      "- 'TCSR' = Test Case Step Run (for step-level execution updates)",
      "BULK OPERATION FLAG:",
      "- isBulkOperation=false: Single test case run update (one entityID)",
      "- isBulkOperation=true: Multiple test case runs update (comma-separated entityIDs)",
      "- Auto-detected: If entityIDs contains comma, defaults to true; otherwise false",
      "AUTOMATION FLAG (isAutoExecuted) - OPTIONAL:",
      "- '1' = Automated execution (test run by automation framework)",
      "- '0' = Manual execution (test run by human tester)",
      "- Used for execution tracking and reporting purposes",
      "PART 11 COMPLIANCE (username & password) - CONDITIONAL:",
      "- Required ONLY if Part 11 Compliance is active in your QMetry instance",
      "- Used for regulatory compliance and audit trail purposes",
      "- Not needed for standard QMetry installations",
      "COMMENTS FIELD - OPTIONAL:",
      "- Add execution notes, failure reasons, or status change context",
      "- Useful for tracking why status was changed",
      "- Appears in execution history and audit logs",
      "COMMON EXECUTION STATUS NAMES:",
      "- Pass: Test case executed successfully",
      "- Fail: Test case failed with errors",
      "- Blocked: Test case cannot be executed due to blockers",
      "- Not Run: Test case not yet executed or needs re-execution",
      "- WIP: Work In Progress - test case execution in progress",
      "WORKFLOW FOR USER PROMPTS:",
      "1. If user says 'execute test case run by id to failed' or 'update status to fail':",
      "   - Fetch test case runs to get tcRunID (entityIDs)",
      "   - Fetch project info to get 'Fail' status ID (runStatusID)",
      "   - Set isBulkOperation=false for single ID",
      "2. If user says 'bulk update test case run status to pass' or 'update all to passed':",
      "   - Fetch test case runs to get multiple tcRunIDs",
      "   - Fetch project info to get 'Pass' status ID",
      "   - Set isBulkOperation=true",
      "   - Join multiple IDs with commas (no spaces)",
      "3. If user says 'execute status to not run of given test case run ids':",
      "   - Use provided IDs or fetch if needed",
      "   - Fetch project info to get 'Not Run' status ID",
      "   - Set isBulkOperation based on ID count",
      "4. If the user requests updating status for ALL executions of a test suite, the agent must:",
      "   1. Call FETCH_EXECUTIONS_BY_TESTSUITE to get all qmTsRunIds.",
      "   2. For each qmTsRunId:",
      "      - Call FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN to get tcRunID (entityIDs)",
      "      - Fetch project info to get 'Fail' status ID (runStatusID)",
      "      - Call BULK_UPDATE_EXECUTION_STATUS with the corresponding qmTsRunId + tcRunID + desired runStatusID",
      "   3. Repeat until all executions are updated.",
      "   This tool is intended to be invoked multiple times in sequence for multi-execution updates.",
      "FIELD MAPPING CRITICAL NOTES:",
      "- entityIDs must be comma-separated STRING (e.g., '66095069,66095075')",
      "- qmTsRunId must be STRING format (e.g., '2720260')",
      "- runStatusID must be NUMERIC (e.g., 123268)",
      "- dropID can be numeric or string (flexible)",
      "API ENDPOINT: PUT /rest/execution/runstatus/bulkupdate",
      "This tool is essential for test execution management and status tracking",
      "Critical for maintaining accurate test execution records and reporting",
      "Use for manual test execution updates and automated test result integration",
      "Essential for test execution audit trails and compliance requirements",
    ],
    outputDescription:
      "JSON object with success status, updated execution details, and confirmation message",
    readOnly: false,
    idempotent: false,
  },
];
