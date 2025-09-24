/**
 * TypeScript type definitions for Zephyr Cloud API responses and configuration.
 *
 * This module provides interface definitions for Zephyr API data structures,
 * configuration objects, and error handling types used throughout the Zephyr
 * MCP integration.
 */

export interface ZephyrConfig {
    /**
     * Configuration interface for ZephyrClient initialization.
     *
     * Properties
     * ----------
     * accessToken : string
     *     JWT access token for API authentication
     * projectKey : string, optional
     *     Default project key for scoped operations
     * baseUrl : string, optional
     *     Custom API base URL, defaults to production endpoint
     */
    accessToken: string;
    projectKey?: string;
    baseUrl?: string;
}

export interface ApiError {
    /**
     * Standard error response structure from Zephyr API.
     *
     * Properties
     * ----------
     * message : string
     *     Human-readable error description
     * code : string, optional
     *     Error code identifier
     * details : any, optional
     *     Additional error context
     */
    message: string;
    code?: string;
    details?: any;
}

export interface BaseEntity {
    /**
     * Base interface for Zephyr entities with common properties.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * key : string
     *     Human-readable key (e.g., PROJECT-T123)
     * name : string
     *     Display name
     */
    id: number;
    key: string;
    name: string;
}

export interface Priority {
    /**
     * Priority level for test cases.
     *
     * Properties
     * ----------
     * id : number
     *     Unique priority identifier
     * name : string
     *     Priority name (e.g., "High", "Medium", "Low")
     * description : string, optional
     *     Priority description
     * color : string, optional
     *     Display color code
     * order : number, optional
     *     Sort order for display
     */
    id: number;
    name: string;
    description?: string;
    color?: string;
    order?: number;
}

export interface Status {
    /**
     * Status option for test cases and executions.
     *
     * Properties
     * ----------
     * id : number
     *     Unique status identifier
     * name : string
     *     Status name (e.g., "Pass", "Fail", "Blocked")
     * description : string, optional
     *     Status description
     * color : string, optional
     *     Display color code
     * type : string, optional
     *     Status type (e.g., "TEST_CASE", "EXECUTION")
     */
    id: number;
    name: string;
    description?: string;
    color?: string;
    type?: string;
}

// STUB: MCP tool definition structure
export interface ToolDefinition {
    /**
     * MCP tool definition interface stub.
     *
     * Properties
     * ----------
     * name : string
     *     Tool name
     * description : string
     *     Tool description
     * inputSchema : any
     *     Input parameter schema
     */
    name: string;
    description: string;
    inputSchema: any;
}

export interface TestCase extends BaseEntity {
    /**
     * Test case entity with complete metadata matching API specification.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * key : string
     *     Human-readable key (e.g., PROJECT-T123) - pattern: .+-T[0-9]+
     * name : string
     *     Test case name/title
     * project : ProjectLink
     *     Project link object
     * createdOn : string
     *     ISO timestamp of creation
     * objective : string, optional
     *     Test case objective description
     * precondition : string, optional
     *     Test case preconditions
     * estimatedTime : number, optional
     *     Estimated duration in milliseconds
     * labels : string[], optional
     *     Array of labels
     * component : JiraComponent, optional
     *     Jira component link
     * priority : PriorityLink
     *     Priority link object
     * status : StatusLink
     *     Status link object
     * folder : FolderLink, optional
     *     Folder organization link
     * owner : JiraUserLink, optional
     *     Owner user link
     * testScript : TestCaseTestScriptLink, optional
     *     Test script link
     * customFields : Record<string, any>, optional
     *     Custom field values
     * links : TestCaseLinkList, optional
     *     Test case links (issues, weblinks)
     */
    key: string;
    project: ProjectLink;
    createdOn: string;
    objective?: string;
    precondition?: string;
    estimatedTime?: number;
    labels?: string[];
    component?: JiraComponent;
    priority: PriorityLink;
    status: StatusLink;
    folder?: FolderLink;
    owner?: JiraUserLink;
    testScript?: TestCaseTestScriptLink;
    customFields?: Record<string, any>;
    links?: TestCaseLinkList;
}

// Link types matching API specification
export interface Link {
    self: string;
}

export interface ResourceId {
    id: number;
}

export interface ProjectLink extends ResourceId, Link {}

export interface PriorityLink extends ResourceId, Link {}

export interface StatusLink extends ResourceId, Link {}

export interface FolderLink extends ResourceId, Link {}

export interface JiraUserLink extends ResourceId, Link {}

export interface JiraComponent extends ResourceId, Link {}

export interface TestCaseTestScriptLink extends Link {}

export interface TestCaseLinkList extends Link {
    issues?: IssueLinkList;
    webLinks?: WebLinkList;
}

export interface IssueLinkList {
    values?: IssueLink[];
}

export interface WebLinkList {
    values?: WebLink[];
}

export interface IssueLink {
    id: string;
    key: string;
    type: string;
}

export interface WebLink {
    id: number;
    url: string;
    description?: string;
}

export interface TestCaseVersionLink extends ResourceId, Link {
    key?: string;
    version?: number;
}

export interface EnvironmentLink extends ResourceId, Link {
    name?: string;
}

export interface JiraProjectVersion extends ResourceId, Link {
    name?: string;
}

export interface TestCycleLink extends ResourceId, Link {
    key?: string;
}

export interface TestExecutionLinkList extends Link {
    issues?: IssueLinkList;
}

export interface TestPlanLinkList extends Link {
    webLinks?: WebLinkList;
    issues?: IssueLinkList;
    testCycles?: TestPlanCycleLinkList;
}

export interface TestPlanCycleLinkList {
    values?: TestPlanTestCycleLink[];
}

export interface TestPlanTestCycleLink extends ResourceId, Link {
    testCycleId: number;
    type: "COVERAGE" | "BLOCKS" | "RELATED";
    target: string;
}

export interface TestCycleLinkList extends Link {
    issues?: IssueLinkList;
    webLinks?: WebLinkList;
    testPlans?: TestCycleTestPlanLinkList;
}

export interface TestCycleTestPlanLinkList {
    values?: TestCycleTestPlanLink[];
}

export interface TestCycleTestPlanLink extends ResourceId, Link {
    testPlanId: number;
    type: "COVERAGE" | "BLOCKS" | "RELATED";
    target: string;
}

export interface CreateTestCaseRequest {
    /**
     * Request structure for creating new test cases.
     *
     * Properties
     * ----------
     * name : string
     *     Test case name (required)
     * projectKey : string
     *     Project to create test case in (required)
     * objective : string, optional
     *     Test case objective description
     * precondition : string, optional
     *     Test case preconditions
     * estimatedTime : number, optional
     *     Estimated duration in milliseconds
     * componentId : number, optional
     *     ID of a component from Jira
     * priorityName : string, optional
     *     Priority name (not ID)
     * statusName : string, optional
     *     Initial status name (not ID)
     * folderId : number, optional
     *     Folder to organize test case in
     * ownerId : string, optional
     *     Jira user account ID
     * labels : string[], optional
     *     Array of labels
     * customFields : object, optional
     *     Custom field values
     */
    name: string;
    projectKey: string;
    objective?: string;
    precondition?: string;
    estimatedTime?: number;
    componentId?: number;
    priorityName?: string;
    statusName?: string;
    folderId?: number;
    ownerId?: string;
    labels?: string[];
    customFields?: Record<string, any>;
}

export interface UpdateTestCaseRequest {
    /**
     * Request structure for updating existing test cases.
     *
     * All fields are optional - only specified fields will be updated.
     *
     * Properties
     * ----------
     * name : string, optional
     *     Updated test case name
     * objective : string, optional
     *     Updated test case objective
     * precondition : string, optional
     *     Updated test case preconditions
     * estimatedTime : number, optional
     *     Updated estimated duration in milliseconds
     * componentId : number, optional
     *     Updated component ID from Jira
     * priorityName : string, optional
     *     Updated priority name (not ID)
     * statusName : string, optional
     *     Updated status name (not ID)
     * folderId : number, optional
     *     New folder assignment
     * ownerId : string, optional
     *     Updated owner Jira user account ID
     * labels : string[], optional
     *     Updated array of labels
     * customFields : object, optional
     *     Updated custom field values
     */
    name?: string;
    objective?: string;
    precondition?: string;
    estimatedTime?: number;
    componentId?: number;
    priorityName?: string;
    statusName?: string;
    folderId?: number;
    ownerId?: string;
    labels?: string[];
    customFields?: Record<string, any>;
}

export interface TestScript extends BaseEntity {
    /**
     * Test script attached to a test case.
     *
     * Properties
     * ----------
     * id : number
     *     Unique script identifier
     * text : string
     *     Script content or instructions
     * type : string
     *     Script type (e.g., "PLAIN_TEXT", "AUTOMATION")
     * testCaseId : number
     *     Parent test case ID
     */
    text: string;
    type: string;
    testCaseId: number;
}

export interface CreateTestScriptRequest {
    /**
     * Request structure for creating test scripts.
     *
     * Properties
     * ----------
     * text : string
     *     Script content or detailed instructions
     * type : string
     *     Script type: "plain" or "bdd" (required)
     */
    text: string;
    type: "plain" | "bdd";
}

export interface TestStep extends BaseEntity {
    /**
     * Individual step within a test case.
     *
     * Properties
     * ----------
     * id : number
     *     Unique step identifier
     * description : string
     *     Step action description
     * expectedResult : string
     *     Expected outcome
     * testData : string, optional
     *     Test data for this step
     * order : number
     *     Step execution order
     * testCaseId : number
     *     Parent test case ID
     */
    description: string;
    expectedResult: string;
    testData?: string;
    order: number;
    testCaseId: number;
}

export interface CreateTestStepsRequest {
    /**
     * Request structure for creating test steps.
     *
     * Properties
     * ----------
     * steps : TestStepInput[]
     *     Array of steps to create
     */
    steps: TestStepInput[];
}

export interface TestStepInput {
    /**
     * Input structure for individual test step creation.
     *
     * Properties
     * ----------
     * description : string
     *     What action to perform
     * expectedResult : string
     *     Expected outcome of the action
     * testData : string, optional
     *     Test data needed for this step
     */
    description: string;
    expectedResult: string;
    testData?: string;
}

export interface TestPlan extends BaseEntity {
    /**
     * Test plan entity for organizing test activities.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * key : string
     *     Human-readable key (e.g., PROJECT-P123) - pattern: .+-P[0-9]+
     * name : string
     *     Test plan name/title
     * objective : string, optional
     *     Detailed test plan objective
     * project : ProjectLink
     *     Project link object
     * status : StatusLink
     *     Current plan status link
     * folder : FolderLink, optional
     *     Folder organization link
     * owner : JiraUserLink, optional
     *     Owner user link
     * customFields : Record<string, any>, optional
     *     Custom field values
     * labels : string[], optional
     *     Array of labels
     * links : TestPlanLinkList, optional
     *     Test plan links (webLinks, issues, testCycles)
     */
    key: string;
    objective?: string;
    project: ProjectLink;
    status: StatusLink;
    folder?: FolderLink;
    owner?: JiraUserLink;
    customFields?: Record<string, any>;
    labels?: string[];
    links?: TestPlanLinkList;
}

export interface CreateTestPlanRequest {
    /**
     * Request structure for creating test plans.
     *
     * Properties
     * ----------
     * name : string
     *     Test plan name (required)
     * projectKey : string
     *     Project to create test plan in (required)
     * objective : string, optional
     *     Test plan objective
     * folderId : number, optional
     *     Folder ID for organization
     * statusName : string, optional
     *     Initial status name
     * ownerId : string, optional
     *     Owner Jira user account ID
     * labels : string[], optional
     *     Array of labels
     * customFields : object, optional
     *     Custom field values
     */
    name: string;
    projectKey: string;
    objective?: string;
    folderId?: number;
    statusName?: string;
    ownerId?: string;
    labels?: string[];
    customFields?: Record<string, any>;
}

export interface TestCycle extends BaseEntity {
    /**
     * Test cycle entity for execution organization.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * key : string
     *     Human-readable key (e.g., PROJECT-R123) - pattern: .+-[R|C][0-9]+
     * name : string
     *     Test cycle name/title
     * project : ProjectLink
     *     Project link object
     * jiraProjectVersion : JiraProjectVersion, optional
     *     Jira project version link
     * status : StatusLink
     *     Current cycle status link
     * folder : FolderLink, optional
     *     Folder organization link
     * description : string, optional
     *     Detailed test cycle description
     * plannedStartDate : string, optional
     *     ISO timestamp of planned start
     * plannedEndDate : string, optional
     *     ISO timestamp of planned end
     * owner : JiraUserLink, optional
     *     Owner user link
     * customFields : Record<string, any>, optional
     *     Custom field values
     * links : TestCycleLinkList, optional
     *     Test cycle links (issues, webLinks, testPlans)
     */
    key: string;
    project: ProjectLink;
    jiraProjectVersion?: JiraProjectVersion;
    status: StatusLink;
    folder?: FolderLink;
    description?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    owner?: JiraUserLink;
    customFields?: Record<string, any>;
    links?: TestCycleLinkList;
}

export interface CreateTestCycleRequest {
    /**
     * Request structure for creating test cycles.
     *
     * Properties
     * ----------
     * name : string
     *     Test cycle name (required)
     * projectKey : string
     *     Project to create test cycle in (required)
     * description : string, optional
     *     Detailed description
     * plannedStartDate : string, optional
     *     Planned start date in ISO format
     * plannedEndDate : string, optional
     *     Planned end date in ISO format
     * jiraProjectVersion : number, optional
     *     Jira project version ID
     * statusName : string, optional
     *     Initial status name
     * folderId : number, optional
     *     Folder ID for organization
     * ownerId : string, optional
     *     Owner Jira user account ID
     * customFields : object, optional
     *     Custom field values
     */
    name: string;
    projectKey: string;
    description?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    jiraProjectVersion?: number;
    statusName?: string;
    folderId?: number;
    ownerId?: string;
    customFields?: Record<string, any>;
}

export interface TestExecution extends BaseEntity {
    /**
     * Test execution record linking test case to cycle with results.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * key : string, optional
     *     Test execution key (e.g., PROJECT-E123) - pattern: .+-E[0-9]+
     * project : ProjectLink
     *     Project link object
     * testCase : TestCaseVersionLink
     *     Test case version link
     * environment : EnvironmentLink, optional
     *     Environment link
     * jiraProjectVersion : JiraProjectVersion, optional
     *     Jira project version
     * testExecutionStatus : StatusLink
     *     Execution status link
     * actualEndDate : string, optional
     *     ISO timestamp of execution end
     * estimatedTime : number, optional
     *     Estimated duration in milliseconds
     * executionTime : number, optional
     *     Actual test execution time in milliseconds
     * executedById : string, optional
     *     Jira user account ID who executed the test
     * assignedToId : string, optional
     *     Jira user account ID assigned to the execution
     * comment : string, optional
     *     Execution comments or notes
     * automated : boolean, optional
     *     Indicates if the test execution was done manually or not
     * testCycle : TestCycleLink, optional
     *     Test cycle link
     * customFields : Record<string, any>, optional
     *     Custom field values
     * links : TestExecutionLinkList, optional
     *     Test execution links
     */
    key?: string;
    project: ProjectLink;
    testCase: TestCaseVersionLink;
    environment?: EnvironmentLink;
    jiraProjectVersion?: JiraProjectVersion;
    testExecutionStatus: StatusLink;
    actualEndDate?: string;
    estimatedTime?: number;
    executionTime?: number;
    executedById?: string;
    assignedToId?: string;
    comment?: string;
    automated?: boolean;
    testCycle?: TestCycleLink;
    customFields?: Record<string, any>;
    links?: TestExecutionLinkList;
}

export interface CreateTestExecutionRequest {
    /**
     * Request structure for creating test executions.
     *
     * Properties
     * ----------
     * projectKey : string
     *     Project key (required)
     * testCaseKey : string
     *     Test case key to execute
     * testCycleKey : string
     *     Test cycle key for organization
     * statusName : string
     *     Execution status name (e.g., \"Pass\", \"Fail\", \"Blocked\")
     * testScriptResults : TestScriptResultInput[], optional
     *     Test script results
     * environmentName : string, optional
     *     Environment name where test was executed
     * actualEndDate : string, optional
     *     Execution timestamp in ISO format
     * executionTime : number, optional
     *     Actual test execution time in milliseconds
     * executedById : string, optional
     *     Jira user account ID who executed the test
     * assignedToId : string, optional
     *     Jira user account ID assigned to the execution
     * comment : string, optional
     *     Execution comments or failure details
     * customFields : object, optional
     *     Custom field values
     */
    projectKey: string;
    testCaseKey: string;
    testCycleKey: string;
    statusName: string;
    testScriptResults?: TestScriptResultInput[];
    environmentName?: string;
    actualEndDate?: string;
    executionTime?: number;
    executedById?: string;
    assignedToId?: string;
    comment?: string;
    customFields?: Record<string, any>;
}

export interface UpdateTestExecutionRequest {
    /**
     * Request structure for updating test executions.
     *
     * All fields are optional - only specified fields will be updated.
     *
     * Properties
     * ----------
     * statusName : string, optional
     *     Updated execution status
     * comment : string, optional
     *     Updated comments
     * environmentName : string, optional
     *     Updated environment name (matches API field name)
     * actualEndDate : string, optional
     *     Updated execution timestamp in ISO format (matches API field name)
     */
    statusName?: string;
    comment?: string;
    environmentName?: string;
    actualEndDate?: string;
}

export interface Folder extends BaseEntity {
    /**
     * Folder entity for test case organization.
     *
     * Properties
     * ----------
     * id : number
     *     Unique identifier
     * name : string
     *     Folder name
     * description : string, optional
     *     Folder description
     * projectKey : string
     *     Project this folder belongs to
     * parentFolderId : number, optional
     *     Parent folder ID for hierarchy
     * path : string, optional
     *     Full folder path for display
     * testCaseCount : number, optional
     *     Number of test cases in this folder
     * createdOn : string
     *     ISO timestamp of creation
     * updatedOn : string
     *     ISO timestamp of last update
     */
    description?: string;
    projectKey: string;
    parentFolderId?: number;
    path?: string;
    testCaseCount?: number;
    createdOn: string;
    updatedOn: string;
}

export interface CreateFolderRequest {
    /**
     * Request structure for creating folders.
     *
     * Properties
     * ----------
     * name : string
     *     Folder name (required)
     * folderType : string
     *     Folder type (required): TEST_CASE, TEST_PLAN, or TEST_CYCLE
     * projectKey : string
     *     Project to create folder in
     * parentId : number, optional
     *     Parent folder for hierarchy
     */
    name: string;
    folderType: string;
    projectKey: string;
    parentId?: number | null;
}

export interface Environment {
    /**
     * Testing environment configuration.
     *
     * Properties
     * ----------
     * id : number
     *     Unique environment identifier
     * name : string
     *     Environment name (e.g., "Production", "Staging", "Development")
     * description : string, optional
     *     Environment description
     * url : string, optional
     *     Environment URL
     * active : boolean, optional
     *     Whether environment is currently active
     */
    id: number;
    name: string;
    description?: string;
    url?: string;
    active?: boolean;
}

export interface TestScriptResultInput {
    /**
     * Input structure for test script result.
     *
     * Properties
     * ----------
     * statusName : string
     *     Status name for the script result (required)
     * actualEndDate : string, optional
     *     Execution timestamp in ISO format
     * actualResult : string, optional
     *     Free text field for step execution result
     */
    statusName: string;
    actualEndDate?: string;
    actualResult?: string;
}