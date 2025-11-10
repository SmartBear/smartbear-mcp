import { QMetryToolsHandlers } from "../../config/constants.js";
import {
  LinkRequirementToTestCaseArgsSchema,
  RequirementDetailsArgsSchema,
  RequirementListArgsSchema,
  RequirementsLinkedToTestCaseArgsSchema,
  TestCasesLinkedToRequirementArgsSchema,
} from "../../types/common.js";
import type { QMetryToolParams } from "./types.js";

export const REQUIREMENT_TOOLS: QMetryToolParams[] = [
  {
    title: "Fetch Requirements",
    summary:
      "Fetch QMetry requirements - automatically handles viewId resolution based on project",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS,
    inputSchema: RequirementListArgsSchema,
    purpose:
      "Get requirements from QMetry. System automatically gets correct requirement viewId from project info if not provided.",
    useCases: [
      "List all requirements in a project",
      "Search for specific requirements using filters",
      "Browse requirements in specific folders",
      "Get paginated requirement results",
      "Filter requirements by name or properties",
      "Get requirement metadata for test planning",
    ],
    examples: [
      {
        description:
          "Get all requirements from default project - system will auto-fetch viewId",
        parameters: {},
        expectedOutput:
          "List of requirements from default project with auto-resolved viewId",
      },
      {
        description:
          "Get all requirements from UT project - system will auto-fetch UT project's viewId",
        parameters: { projectKey: "UT" },
        expectedOutput:
          "List of requirements from UT project using UT's specific RQ viewId",
      },
      {
        description:
          "Get requirements with manual viewId (skip auto-resolution)",
        parameters: {
          projectKey: "MAC",
          viewId: 7397,
          folderPath: "/APIARY 88",
        },
        expectedOutput: "Requirements using manually specified viewId 7397",
      },
      {
        description: "Search for specific requirements by entity key",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-RQ-123","field":"entityKeyId"}]',
        },
        expectedOutput:
          "Filtered requirements matching the entity key criteria",
      },
      {
        description:
          "Search for multiple requirements by comma-separated entity keys",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"MAC-RQ-123,MAC-RQ-456,MAC-RQ-789","field":"entityKeyId"}]',
        },
        expectedOutput:
          "Requirements matching any of the specified entity keys",
      },
      {
        description: "Filter requirements by state (e.g., Open, Approved)",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"Open","field":"requirementStateAlias"}]',
        },
        expectedOutput: "Requirements with 'Open' state",
      },
      {
        description: "Filter requirements by priority",
        parameters: {
          projectKey: "MAC",
          filter: '[{"type":"string","value":"High","field":"priorityAlias"}]',
        },
        expectedOutput: "Requirements with 'High' priority",
      },
      {
        description: "Filter requirements by archive status",
        parameters: {
          filter: '[{"value":[1,0],"type":"list","field":"isArchived"}]',
        },
        expectedOutput:
          "List of requirements filtered by archive status (archived and non-archived)",
      },
      {
        description: "Get only archived requirements",
        parameters: {
          filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
        },
        expectedOutput: "List of only archived requirements",
      },
      {
        description: "Sort requirements by name in ascending order",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"name","direction":"ASC"}]',
        },
        expectedOutput: "Requirements sorted alphabetically by name",
      },
      {
        description: "Sort requirements by creation date (newest first)",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"createdDate","direction":"DESC"}]',
        },
        expectedOutput: "Requirements sorted by creation date, newest first",
      },
      {
        description: "Sort requirements by entity key",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"entityKey","direction":"ASC"}]',
        },
        expectedOutput:
          "Requirements sorted by entity key (MAC-RQ-1, MAC-RQ-2, etc.)",
      },
      {
        description: "Sort requirements by linked test case count",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"linkedTcCount","direction":"DESC"}]',
        },
        expectedOutput:
          "Requirements sorted by number of linked test cases, highest first",
      },
      {
        description:
          "Complex filter: Requirements by owner with specific state",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"type":"string","value":"john.doe","field":"owner"},{"type":"string","value":"Approved","field":"requirementStateAlias"}]',
        },
        expectedOutput: "Requirements owned by john.doe with 'Approved' state",
      },
      {
        description: "Multi-field sort: Priority first, then creation date",
        parameters: {
          projectKey: "MAC",
          sort: '[{"property":"priorityAlias","direction":"DESC"},{"property":"createdDate","direction":"ASC"}]',
        },
        expectedOutput:
          "Requirements sorted by priority (High to Low), then by creation date (oldest first)",
      },
      {
        description: "Filter requirements by specific release and cycle",
        parameters: {
          projectKey: "MAC",
          filter:
            '[{"value":[55178],"type":"list","field":"release"},{"value":[111577],"type":"list","field":"cycle"}]',
        },
        expectedOutput:
          "Requirements associated with Release 8.12 (ID: 55178) and Cycle 8.12.1 (ID: 111577)",
      },
      {
        description: "Filter requirements by release only",
        parameters: {
          projectKey: "MAC",
          filter: '[{"value":[55178],"type":"list","field":"release"}]',
        },
        expectedOutput:
          "All requirements associated with Release 8.12 (ID: 55178)",
      },
    ],
    hints: [
      "CRITICAL WORKFLOW: Always use the SAME projectKey for both project info and requirement fetching",
      "Step 1: If user specifies projectKey (like 'UT', 'MAC'), use that EXACT projectKey for project info",
      "Step 2: Get project info using that projectKey, extract latestViews.RQ.viewId",
      "Step 3: Use the SAME projectKey and the extracted RQ viewId for fetching requirements",
      "Step 4: If user doesn't specify projectKey, use 'default' for both project info and requirement fetching",
      "NEVER mix project keys - if user says 'MAC project', use projectKey='MAC' for everything",
      'For search by requirement key (like MAC-RQ-123), use filter: \'[{"type":"string","value":"MAC-RQ-123","field":"entityKeyId"}]\'',
      'For multiple entity keys, use comma-separated values: \'[{"type":"string","value":"MAC-RQ-123,MAC-RQ-456","field":"entityKeyId"}]\'',
      "Use empty string '' as folderPath for root directory",
      "Filter supports QMETRY and JIRA types - default is QMETRY",
      "FILTER FIELDS: entityKeyId, name, requirementStateAlias, priorityAlias, owner, createdByAlias, updatedByAlias, createdSystem",
      "SORT FIELDS: name, entityKey, associatedVersion, priorityAlias, createdDate, createdByAlias, updatedDate, updatedByAlias, requirementStateAlias, linkedTcCount, linkedDfCount, attachmentCount, createdSystem, owner",
      "SORT DIRECTIONS: ASC (ascending), DESC (descending)",
      "Multiple filters: Use array with multiple objects for AND conditions",
      "Multiple sort criteria: Use array with multiple objects, first takes priority",
      "Filter format: [{'type':'string','value':'filterValue','field':'fieldName'}]",
      "Sort format: [{'property':'fieldName','direction':'ASC|DESC'}]",
      "RELEASE/CYCLE FILTERING: Use release and cycle IDs from fetch_releases_and_cycles tool",
      'For specific release: \'[{"value":[releaseId],"type":"list","field":"release"}]\'',
      'For specific cycle: \'[{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      'For release AND cycle: \'[{"value":[releaseId],"type":"list","field":"release"},{"value":[cycleId],"type":"list","field":"cycle"}]\'',
      "Example: Release 8.12 (ID: 55178) + Cycle 8.12.1 (ID: 111577) = filter with both IDs",
    ],
    outputDescription:
      "JSON object with 'data' array containing requirements and pagination info",
    readOnly: true,
    idempotent: true,
    openWorld: false,
  },
  {
    title: "Fetch Requirement Details",
    summary:
      "Get detailed information for a specific QMetry requirement by numeric ID",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENT_DETAILS,
    inputSchema: RequirementDetailsArgsSchema,
    purpose:
      "Retrieve comprehensive requirement information including metadata, status, and all fields for a specific requirement",
    useCases: [
      "Get requirement details by numeric ID",
      "Retrieve requirement metadata for reporting",
      "Get requirement summary and properties",
      "Fetch requirement details before linking or updating",
      "Access requirement field values and custom fields",
      "Get requirement version-specific information",
    ],
    examples: [
      {
        description: "Get requirement details by numeric ID",
        parameters: { id: 4791316, version: 1 },
        expectedOutput:
          "Detailed requirement information including summary, description, status, and all fields",
      },
    ],
    hints: [
      "This API requires a numeric ID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-RQ-730), first call FETCH_REQUIREMENTS with a filter on entityKeyId to resolve the numeric ID",
      "After resolving entityKey → numeric ID, call this tool with the resolved numeric ID",
      "Version parameter is required - use 1 for the latest version unless user specifies otherwise",
      "This tool provides complete requirement information including all custom fields",
      "Use this tool to get detailed requirement information that's not available in the list view",
    ],
    outputDescription:
      "JSON object with requirement details including ID, key, summary, description, status, and all metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Link Requirements to Testcase",
    summary:
      "Link one or more requirements to a test case by entityKey and version IDs.",
    handler: QMetryToolsHandlers.LINK_REQUIREMENT_TO_TESTCASE,
    inputSchema: LinkRequirementToTestCaseArgsSchema,
    purpose:
      "Link requirements to a test case using the test case entityKey, version ID, and requirement version IDs. " +
      "This tool enables traceability and coverage mapping between requirements and test cases.",
    useCases: [
      "Link requirements to a test case for traceability",
      "Bulk link multiple requirements to a single test case",
      "Automate requirement coverage mapping",
    ],
    examples: [
      {
        description: "Link requirements to test case VT-TC-26",
        parameters: {
          tcID: "VT-TC-26",
          tcVersionId: 5448515,
          rqVersionIds: "5009939,5009937,4970699",
        },
        expectedOutput:
          "Requirements linked to test case VT-TC-26 successfully.",
      },
    ],
    hints: [
      "To get the tcID, call the Testcase/Fetch List for Bulk Operation API and use data[<index>].entityKey.",
      "To get the tcVersionId, call the Testcase/Fetch Versions API and use data[<index>].tcVersionID.",
      "To get the rqVersionIds, call the requirement/List Versions API and use data[<index>].rqVersionID.",
      "If user provides requirement entityKey (e.g., VT-RQ-18), first call requirements list with a filter on entityKeyId to resolve the rqVersionIds",
      "If user provides testcase entityKey (e.g., VT-TC-26), first call testcase list with a filter on entityKeyId to resolve the tcVersionId and tcID.",
      "rqVersionIds must be a comma-separated string of requirement version IDs.",
    ],
    outputDescription: "JSON object with success status and linkage details.",
    readOnly: false,
    idempotent: false,
  },
  {
    title: "Fetch Test Cases Linked to Requirement",
    summary:
      "Get test cases that are linked (or not linked) to a specific requirement in QMetry",
    handler: QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT,
    inputSchema: TestCasesLinkedToRequirementArgsSchema,
    purpose:
      "Retrieve test cases that have traceability links to a specific requirement. " +
      "This tool is essential for requirement traceability analysis, coverage verification, " +
      "and impact analysis when requirements change. You can get linked or unlinked test cases, " +
      "filter by release/cycle, and apply various other filters for comprehensive traceability reporting.",
    useCases: [
      "Get all test cases linked to a specific requirement for traceability analysis",
      "Find test cases that are NOT linked to a requirement (gap analysis)",
      "Verify requirement coverage by checking linked test cases",
      "Impact analysis - see which test cases are affected when a requirement changes",
      "Generate traceability matrix between requirements and test cases",
      "Filter linked test cases by release, cycle, or other criteria",
      "Audit requirement-test case relationships for compliance",
      "Identify orphaned test cases or requirements without proper links",
      "Plan test execution based on requirement-test case associations",
      "Quality assurance - ensure all requirements have adequate test coverage",
    ],
    examples: [
      {
        description: "Get all test cases linked to requirement ID 4791316",
        parameters: { rqID: 4791316 },
        expectedOutput:
          "List of test cases that are linked to requirement MAC-RQ-1011",
      },
      {
        description: "Get test cases NOT linked to requirement (gap analysis)",
        parameters: { rqID: 4791316, getLinked: false },
        expectedOutput:
          "List of test cases that are NOT linked to requirement MAC-RQ-1011",
      },
      {
        description: "Get linked test cases filtered by specific release",
        parameters: { rqID: 4791316, releaseID: "55178" },
        expectedOutput:
          "Linked test cases associated with Release 8.12 (ID: 55178)",
      },
      {
        description: "Get linked test cases filtered by release and cycle",
        parameters: {
          rqID: 4791316,
          releaseID: "55178",
          cycleID: "111577",
          showEntityWithReleaseCycle: true,
        },
        expectedOutput: "Linked test cases in Release 8.12 and Cycle 8.12.1",
      },
      {
        description: "Get linked test cases from specific folder",
        parameters: {
          rqID: 4791316,
          tcFolderPath: "/Sample Template",
        },
        expectedOutput:
          "Linked test cases located in the '/Sample Template' folder",
      },
      {
        description: "Search linked test cases by entity key",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"string","value":"MAC-TC-1684,MAC-TC-1685","field":"entityKeyId"}]',
        },
        expectedOutput: "Linked test cases matching specific entity keys",
      },
      {
        description: "Filter linked test cases by priority",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1,2],"field":"priorityAlias"}]',
        },
        expectedOutput: "Linked test cases with High or Medium priority",
      },
      {
        description: "Filter linked test cases by status",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"list","value":[1,2],"field":"testCaseStateAlias"}]',
        },
        expectedOutput: "Linked test cases with Active or Review status",
      },
      {
        description: "Filter linked test cases by test case type",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1],"field":"testCaseTypeAlias"}]',
        },
        expectedOutput: "Linked functional test cases",
      },
      {
        description: "Filter linked test cases by testing type (automation)",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[2],"field":"testingTypeAlias"}]',
        },
        expectedOutput: "Linked automated test cases",
      },
      {
        description: "Get only parameterized linked test cases",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[1],"field":"isParameterized"}]',
        },
        expectedOutput:
          "Linked test cases that are parameterized (data-driven)",
      },
      {
        description: "Filter linked test cases by archive status",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"list","value":[0],"field":"isArchived"}]',
        },
        expectedOutput: "Active (non-archived) linked test cases",
      },
      {
        description: "Search linked test cases by summary content",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"string","value":"login","field":"summary"}]',
        },
        expectedOutput: "Linked test cases with 'login' in their summary",
      },
      {
        description: "Filter linked test cases by requirement version",
        parameters: {
          rqID: 4791316,
          filter: '[{"type":"string","value":"1","field":"rqVersion"}]',
        },
        expectedOutput: "Test cases linked to version 1 of the requirement",
      },
      {
        description:
          "Complex filter: Active, high priority, automated test cases",
        parameters: {
          rqID: 4791316,
          filter:
            '[{"type":"list","value":[0],"field":"isArchived"},{"type":"list","value":[1],"field":"priorityAlias"},{"type":"list","value":[2],"field":"testingTypeAlias"}]',
        },
        expectedOutput:
          "Active, high priority, automated test cases linked to requirement",
      },
    ],
    hints: [
      "This API requires a numeric rqID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-RQ-1011), first call FETCH_REQUIREMENTS with filter on entityKeyId to resolve the numeric rqID",
      "After resolving entityKey → rqID, call this tool with the resolved numeric rqID",
      "TRACEABILITY WORKFLOW: Use this tool to establish requirement-test case traceability matrix",
      "getLinked=true (default): Returns test cases that ARE linked to the requirement",
      "getLinked=false: Returns test cases that are NOT linked to the requirement (useful for gap analysis)",
      "showEntityWithReleaseCycle=true: Only show test cases that have the specified release and cycle",
      "showEntityWithReleaseCycle=false (default): Show all test cases regardless of release/cycle",
      "RELEASE/CYCLE FILTERING: Use string IDs, not numeric (e.g., releaseID: '55178', cycleID: '111577')",
      "Get release/cycle IDs from FETCH_RELEASES_AND_CYCLES tool before filtering",
      "tcFolderPath: Use empty string '' for root folder or specific path like '/Sample Template'",
      "FILTER CAPABILITIES: Support same filters as regular test case listing",
      "FILTER FIELDS: summary, rqVersion, priorityAlias, testCaseStateAlias, createdByAlias, testCaseTypeAlias, testingTypeAlias, release, cycle, isArchived, isParameterized, componentAlias, entityKeyId",
      "PRIORITY IDs: Typically 1=High, 2=Medium, 3=Low (verify with your QMetry instance)",
      "STATUS IDs: Typically 1=Active, 2=Review, 3=Deprecated (verify with your QMetry instance)",
      "TYPE IDs: Typically 1=Functional, 2=Integration, 3=System (verify with your QMetry instance)",
      "TESTING TYPE IDs: Typically 1=Manual, 2=Automated (verify with your QMetry instance)",
      "PARAMETERIZED: 1=Yes (parameterized), 0=No (non-parameterized)",
      "ARCHIVED: 1=Archived, 0=Active (non-archived)",
      "Multiple filter conditions are combined with AND logic",
      "For entity key search, use comma-separated values: 'MAC-TC-1,MAC-TC-2,MAC-TC-3'",
      "This tool is crucial for compliance, traceability audits, and impact analysis",
      "Use getColumns=true to get column metadata for better result interpretation",
      "Pagination supported for large result sets (start, page, limit parameters)",
    ],
    outputDescription:
      "JSON object with test cases array, traceability information, and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
  {
    title: "Fetch Requirements Linked to Test Case",
    summary:
      "Get requirements that are linked (or not linked) to a specific test case in QMetry",
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS_LINKED_TO_TESTCASE,
    inputSchema: RequirementsLinkedToTestCaseArgsSchema,
    purpose:
      "Retrieve requirements that have traceability links to a specific test case. " +
      "This tool is essential for test case traceability analysis, coverage verification, " +
      "and impact analysis when test cases change. You can get linked or unlinked requirements, " +
      "filter by various criteria for comprehensive traceability reporting.",
    useCases: [
      "Get all requirements linked to a specific test case for traceability analysis",
      "Find requirements that are NOT linked to a test case (gap analysis)",
      "Verify test case coverage by checking linked requirements",
      "Impact analysis - see which requirements are affected when a test case changes",
      "Generate traceability matrix between test cases and requirements",
      "Filter linked requirements by various criteria",
      "Audit test case-requirement relationships for compliance",
      "Identify orphaned requirements or test cases without proper links",
      "Plan requirement validation based on test case-requirement associations",
      "Quality assurance - ensure all test cases have proper requirement coverage",
    ],
    examples: [
      {
        description: "Get all requirements linked to test case ID 594294",
        parameters: { tcID: 594294 },
        expectedOutput:
          "List of requirements that are linked to test case MAC-TC-1684",
      },
      {
        description: "Get requirements NOT linked to test case (gap analysis)",
        parameters: { tcID: 594294, getLinked: false },
        expectedOutput:
          "List of requirements that are NOT linked to test case MAC-TC-1684",
      },
      {
        description: "Get linked requirements from specific folder",
        parameters: {
          tcID: 594294,
          rqFolderPath: "/CodeSnippets",
        },
        expectedOutput:
          "Linked requirements located in the '/CodeSnippets' folder",
      },
      {
        description: "Search linked requirements by entity key",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"string","value":"MAC-RQ-730,MAC-RQ-731","field":"entityKeyId"}]',
        },
        expectedOutput: "Linked requirements matching specific entity keys",
      },
      {
        description: "Filter linked requirements by status",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"list","value":[1,2],"field":"requirementStateAlias"}]',
        },
        expectedOutput: "Linked requirements with Open or Approved status",
      },
      {
        description: "Filter linked requirements by priority",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"list","value":[1],"field":"priorityAlias"}]',
        },
        expectedOutput: "Linked requirements with High priority",
      },
      {
        description: "Filter linked requirements by archive status",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"list","value":[0],"field":"isArchived"}]',
        },
        expectedOutput: "Active (non-archived) linked requirements",
      },
      {
        description: "Search linked requirements by name content",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"string","value":"authentication","field":"name"}]',
        },
        expectedOutput:
          "Linked requirements with 'authentication' in their name",
      },
      {
        description: "Filter linked requirements by test case version",
        parameters: {
          tcID: 594294,
          filter: '[{"type":"string","value":"1","field":"tcVersion"}]',
        },
        expectedOutput: "Requirements linked to version 1 of the test case",
      },
      {
        description: "Filter linked requirements by release and cycle",
        parameters: {
          tcID: 594294,
          filter:
            '[{"type":"list","value":[55178],"field":"release"},{"type":"list","value":[111577],"field":"cycle"}]',
        },
        expectedOutput: "Linked requirements in Release 8.12 and Cycle 8.12.1",
      },
    ],
    hints: [
      "This API requires a numeric tcID parameter, not entity key",
      "If user provides entityKey (e.g., MAC-TC-1684), first call FETCH_TEST_CASES with filter on entityKeyId to resolve the numeric tcID",
      "After resolving entityKey → tcID, call this tool with the resolved numeric tcID",
      "TRACEABILITY WORKFLOW: Use this tool to establish test case-requirement traceability matrix",
      "getLinked=true (default): Returns requirements that ARE linked to the test case",
      "getLinked=false: Returns requirements that are NOT linked to the test case (useful for gap analysis)",
      "rqFolderPath: Use empty string '' for root folder or specific path like '/CodeSnippets'",
      "FILTER CAPABILITIES: Support same filters as regular requirement listing",
      "FILTER FIELDS: name, entityKeyId, requirementStateAlias, priorityAlias, createdByAlias, tcVersion, release, cycle, isArchived, componentAlias",
      "Multiple filter conditions are combined with AND logic",
      "For entity key search, use comma-separated values: 'MAC-RQ-1,MAC-RQ-2,MAC-RQ-3'",
      "This tool is crucial for compliance, traceability audits, and impact analysis",
      "Pagination supported for large result sets (start, page, limit parameters)",
      "Use this tool to verify that test cases properly cover requirements",
      "Essential for requirement validation and test case completeness analysis",
    ],
    outputDescription:
      "JSON object with requirements array, traceability information, and pagination metadata",
    readOnly: true,
    idempotent: true,
  },
];
