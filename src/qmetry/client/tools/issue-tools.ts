import { QMetryToolsHandlers } from "../../config/constants.js";
import {
  CreateIssueArgsSchema,
  IssuesLinkedToTestCaseArgsSchema,
  IssuesListArgsSchema,
  LinkedIssuesByTestCaseRunArgsSchema,
  LinkIssuesToTestcaseRunArgsSchema,
  UpdateIssueArgsSchema,
} from "../../types/common.js";
import type { QMetryToolParams } from "./types.js";

export const ISSUE_TOOLS: QMetryToolParams[] = [
  {
    title: "Create Defect or Issue",
    summary: "Create a new defect/issue internally in QMetry.",
    handler: QMetryToolsHandlers.CREATE_ISSUE,
    inputSchema: CreateIssueArgsSchema,
    purpose:
      "Allows users to create a new defect/issue in QMetry, including issueType, issuePriority, issueOwner and summary. " +
      "Supports all major defect/issue fields. " +
      "For fields like sync_with, issueType, issuePriority, issueOwner, component, affectedRelease etc., fetch their valid values using the project info tool. " +
      "If tcRunID is not provided, it will be auto-resolved to the fetch test case run id but it's optional field.",

    useCases: [
      "Create a basic defect/issue with just a summary",
      "Set issueType, issueOwner, component, and affectedRelease using valid IDs from project info",
      "Create defects/issues for automation or manual testing types",
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
          "Create a an issue with Major priority and Bug type to Bug with summary 'Login Issue'",
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
          "Create a an issue with summary 'Login Issue' and set issueOwner to 'John Doe'",
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
          "Create a an issue with summary 'Login Issue' and link it to test case run ID 567890",
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
          "Create a an issue with summary 'Login Issue' and set description to 'User is unable to login' and owner to 'John Doe' and link it to test case run ID 567890",
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
          "Create a an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycles and owner to 'John Doe'",
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
          "Create a an issue with summary 'Login Issue' and set release to 'Release 1.0' and its associated all cycle 'Cycle 1.0.1', 'Cycle 1.0.2'",
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
      "CRITICAL: name (summary), issueType, issuePriority are REQUIRED fields to create an issue",
      "OPTIONAL: issueOwner, component, affectedRelease, description, tcRunID can also be provided",
      "To get valid values for sync_with (igConfigurationID or internalTrackerId), issueType, issuePriority, issueOwner, component, affectedRelease, and tcRunID, call the 'project get info tools' use the following mappings:",
      "- sync_with: customListObjs.component[<index>].igConfigurationID or internalTrackerId",
      "- issueType: customListObjs.issueType[<index>].id",
      "- issuePriority: customListObjs.issuePriority[<index>].id",
      "- issueOwner: customListObjs.users[<index>].id",
      "- affectedRelease: data[<index>].releaseID",
      "- tcRunID: data[<index>].tcRunID (from 'Execution/Fetch Testcase Run ID')",
      "If the user provides a issuePriority name (e.g. 'Blocker'), fetch project info, find the matching priority in customListObjs.issuePriority[index].name, and use its ID in the payload. If the name is not found, skip the issuePriority field and show a user-friendly message: 'Defect/issue created without issuePriority, as given issuePriority is not available in the current project.'",
      "If the user provides an issueOwner name, fetch project info, find the matching issueOwner in customListObjs.users[index].name, and use its ID in the payload as issueOwner. If the name is not found, skip the issueOwner field and show a user-friendly message: 'Defect/issue created without issueOwner, as given issueOwner is not available in the current project.'",
      "If the user provides an issue type name, fetch project info, find the matching type in customListObjs.issueType[index].name, and use its ID in the payload as issueType. If the name is not found, skip the issueType field and show a user-friendly message: 'Defect/issue created without issue type, as given type is not available in the current project.'",
      "Release/cycle mapping is optional but useful for planning.",
      "If the user wants to link or associate a release and cycle to the issue, follow these rules:",
      "If the user provides a release ID, map it from projects.releases[index].releaseID in the project info response, and use that ID in affectedRelease as an array of numeric IDs.",
      "If the user provides both release and cycle IDs, validate both against the current project's releases and cycles; if valid, use them in affectedCycles and affectedRelease as arrays of numeric IDs respectively.",
      "If the user provides a release name, map it to its ID from project info; if a cycle name is provided, map it to its ID and use it in payload as value of field affectedRelease and affectedCycles.",
      "LLM should ensure that provided release/cycle names or IDs exist in the current project before using them in the payload. If not found, skip and show a user-friendly message: 'Issue created without release/cycle association, as given release/cycle is not available in the current project.'",
      "Ensure all IDs used are valid for the current QMetry project context",
      "This tool is essential for defect management and test execution linkage",
      "Helps maintain traceability between test executions and reported issues",
      "Critical for quality assurance and defect lifecycle management",
      "Use for creating issues directly from test execution contexts",
    ],
    outputDescription:
      "JSON object containing the new create issue with id, dfid(defectID).",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Update Issue",
    summary: "Update an existing QMetry issue by DefectId and/or entityKey.",
    handler: QMetryToolsHandlers.UPDATE_ISSUE,
    inputSchema: UpdateIssueArgsSchema,
    purpose:
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
      "To get the DefectId, call the Issue/Fetch issue tool and use data[<index>].id from the response.",
      "if you have pass issue key (VT-IS-5, MAC-IS-10 etc.) then first fetch issue by issue key to get issue id.",
      "Along with DefectId, pass only those fields which are to be updated.",
      "Refer to the Create Issue tool for valid field mappings and values.",
      "You can update summary, priority, type, affectedRelease, affectedCycles, description, sync_with, issueOwner, component, environment, tcRunID, etc.",
      "If you provide entityKey, it will be used for additional validation but DefectId is required.",
    ],
    outputDescription: "JSON object with update status and details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Defects or Issues",
    summary:
      "Fetch QMetry defects or issues - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_ISSUES,
    inputSchema: IssuesListArgsSchema,
    purpose:
      "Get defects or issues from QMetry. System automatically gets correct viewId from project info if not provided.",
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
        description: "Get issues with manual viewId (skip auto-resolution)",
        parameters: { projectKey: "MAC", viewId: 166065 },
        expectedOutput: "Issues using manually specified viewId 166065",
      },
      {
        description:
          "List issues from specific project (ex: project key can be anything (VT, UT, PROJ1, TEST9)",
        parameters: {
          projectKey: "use specific given project key",
          viewId:
            "fetch specific project given projectKey defects or issues ViewId",
        },
        expectedOutput:
          "Issues using manually specified viewId 103097 or projectKey",
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
      "JSON object with 'data' array containing issues and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Linked Issues of Test Case Run",
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
    title: "Fetch Issues Linked to Test Case",
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
];
