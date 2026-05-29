/**
 * QTM4J Constants
 *
 * Centralized constants for the QTM4J integration module.
 * This file contains all static strings, URLs, headers, error messages,
 * and other constant values used throughout the QTM4J module.
 */

/**
 * API Configuration Constants
 */
export const API_CONFIG = {
  /** Default base URL for QTM4J Cloud */
  DEFAULT_BASE_URL: "https://qtmcloud.qmetry.com",

  /** API version prefix */
  API_VERSION: "/rest/api/latest",
} as const;

/**
 * API Endpoints
 */
export const ENDPOINTS = {
  /** Projects endpoint */
  PROJECTS: `${API_CONFIG.API_VERSION}/projects`,

  /** Create test case endpoint */
  CREATE_TEST_CASE: `${API_CONFIG.API_VERSION}/testcases`,

  /** Search test cases endpoint */
  SEARCH_TEST_CASES: `${API_CONFIG.API_VERSION}/testcases/search`,

  /** Resolve test case keys → internal UIDs for a given project */
  RESOLVE_TEST_CASE_IDS: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/testcases/resolve-ids`,

  /** Update test cycle endpoint */
  UPDATE_TEST_CYCLE: (id: string) =>
    `${API_CONFIG.API_VERSION}/testcycles/${id}`,

  /** Create test cycle endpoint */
  CREATE_TEST_CYCLE: `${API_CONFIG.API_VERSION}/testcycles`,

  /** Search test cycles endpoint */
  SEARCH_TEST_CYCLES: `${API_CONFIG.API_VERSION}/testcycles/search`,

  /** Update test case endpoint */
  UPDATE_TEST_CASE: (id: string, versionNo: number) =>
    `${API_CONFIG.API_VERSION}/testcases/${id}/versions/${versionNo}`,

  /** Test steps search endpoint */
  TEST_STEPS: (id: string, versionNo: number) =>
    `${API_CONFIG.API_VERSION}/testcases/${id}/versions/${versionNo}/teststeps/search`,

  /** Common attributes endpoint (priority, statuses) */
  COMMON_ATTRIBUTES: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/common-attributes`,

  /** Labels search endpoint */
  LABELS: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/labels`,

  /** Components search endpoint */
  COMPONENTS: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/components`,

  /** Automation: initiate result file import — returns pre-signed S3 upload URL + trackingId */
  AUTOMATION_IMPORT: "/rest/api/automation/importresult",

  /** Automation: poll import progress by trackingId */
  AUTOMATION_IMPORT_TRACK: "/rest/api/automation/importresult/track",

  /** Automation: paginated history of past automation result uploads */
  AUTOMATION_HISTORY: "/rest/api/automation/importresult/history",
} as const;

/**
 * HTTP Headers
 */
export const HTTP_HEADERS = {
  /** API key header name */
  API_KEY: "apiKey",

  /** Content type header */
  CONTENT_TYPE: "Content-Type",

  /** User agent header */
  USER_AGENT: "User-Agent",

  /** Accept header */
  ACCEPT: "Accept",

  /** Content length header */
  CONTENT_LENGTH: "content-length",
} as const;

/**
 * Content Type Values
 */
export const CONTENT_TYPES = {
  /** JSON content type */
  JSON: "application/json",

  /** Multipart form-data content type (used for S3 automation file uploads) */
  MULTIPART: "multipart/form-data",
} as const;

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  /** No content status code */
  NO_CONTENT: 204,
} as const;

/**
 * Client Configuration
 */
export const CLIENT_CONFIG = {
  /** Client name */
  NAME: "QTM4J",

  /** Tool prefix for all QTM4J tools */
  TOOL_PREFIX: "qtm4j",

  /** Configuration prefix */
  CONFIG_PREFIX: "Qtm4j",
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  /** Default starting position for pagination */
  DEFAULT_START_AT: 0,

  /** Default maximum results for projects */
  DEFAULT_MAX_RESULTS_PROJECTS: 100,

  /** Default maximum results for test cases */
  DEFAULT_MAX_RESULTS_TEST_CASES: 50,

  /** Maximum allowed results per request */
  MAX_ALLOWED_RESULTS: 100,

  /** Maximum allowed results per request for test cases (backend enforced) */
  MAX_ALLOWED_RESULTS_TEST_CASES: 50,

  /** Default maximum results for test steps */
  DEFAULT_MAX_RESULTS_TEST_STEPS: 50,

  /** Maximum allowed results per request for test steps */
  MAX_ALLOWED_RESULTS_TEST_STEPS: 100,

  /** Default maximum results for test cycles */
  DEFAULT_MAX_RESULTS_TEST_CYCLES: 20,

  /** Maximum allowed results per request for test cycles */
  MAX_ALLOWED_RESULTS_TEST_CYCLES: 100,

  /** Minimum allowed results per request */
  MIN_ALLOWED_RESULTS: 1,
} as const;

/**
 * Automation Upload Limits
 */
export const AUTOMATION_LIMITS = {
  /** Maximum allowed upload file size in bytes (10 MB) */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  /** Client not configured error */
  CLIENT_NOT_CONFIGURED: "QTM4J client not configured. Please set API key.",

  /** Request failed template */
  REQUEST_FAILED: (status: number, errorText: string) =>
    `Request failed with status ${status}: ${errorText}`,

  /** Automation API key not configured */
  AUTOMATION_API_KEY_NOT_CONFIGURED:
    "QTM4J Automation API key not configured. Set the QTM4J_AUTOMATION_API_KEY environment variable or pass the Qtm4j-Automation-Api-Key header.",
} as const;

/**
 * Tool Names and Titles
 */
export const TOOL_NAMES = {
  /** Get Projects tool */
  GET_PROJECTS: {
    TITLE: "Get Projects",
    SUMMARY: "Get all projects from QTM4J with optional filtering",
  },

  /** Set Project Context tool */
  SET_PROJECT_CONTEXT: {
    TITLE: "Set Project Context",
    SUMMARY:
      "Set the active QTM4J project for the current session. Must be called before any project-specific operation. " +
      "Pre-loads priority and status values so you can map user-provided names to valid options via NLP.",
  },

  /** Create Test Case tool */
  CREATE_TEST_CASE: {
    TITLE: "Create Test Case",
    SUMMARY:
      "Create a new test case in a QTM4J project. Supports auto-resolving human-readable names for priority, status, labels, and components.",
  },

  /** Search Test Cases tool */
  SEARCH_TEST_CASES: {
    TITLE: "Search Test Cases",
    SUMMARY:
      "Search and filter test cases in a QTM4J project with support for pagination, field selection, and sorting.",
  },

  /** Get Test Steps tool */
  GET_TEST_STEPS: {
    TITLE: "Get Test Steps",
    SUMMARY:
      "Get test steps for a test case by its key and version. Accepts the human-readable key (e.g. 'SCRUM-TC-145') and resolves it to the internal ID automatically.",
  },

  /** Update Test Case tool */
  UPDATE_TEST_CASE: {
    TITLE: "Update Test Case",
    SUMMARY:
      "Update an existing test case in QTM4J. Supports auto-resolving human-readable names for priority, status, labels, and components. Labels and components support add/delete operations.",
  },

  /** Upload Automation Result tool */
  UPLOAD_AUTOMATION_RESULT: {
    TITLE: "Upload Automation Result",
    SUMMARY:
      "Upload an automation result file to QTM4J and map the results to a test cycle. Supports JUnit XML, TestNG XML, Cucumber JSON, QAF, HP UFT, and SpecFlow formats.",
  },

  /** Get Automation History tool */
  GET_AUTOMATION_HISTORY: {
    TITLE: "Get Automation History",
    SUMMARY:
      "Retrieve a paginated history of past automation result uploads for a QTM4J project.",
  },

  /** Search Test Cycles tool */
  SEARCH_TEST_CYCLES: {
    TITLE: "Search Test Cycles",
    SUMMARY:
      "Search for test cycles in a QTM4J project by status, owner, folder, date range, or keyword. " +
      "projectId is injected automatically from the active project context.",
  },

  /** Create Test Cycle tool */
  CREATE_TEST_CYCLE: {
    TITLE: "Create Test Cycle",
    SUMMARY:
      "Create a new test cycle in a QTM4J project. Supports auto-resolving human-readable names for priority and status. Always creates in the 'MCP Generated' folder. projectId is injected automatically from the active project context.",
  },

  /** Update Test Cycle tool */
  UPDATE_TEST_CYCLE: {
    TITLE: "Update Test Cycle",
    SUMMARY:
      "Update an existing test cycle in QTM4J by its human-readable key (e.g. 'SCRUM-TR-101'). " +
      "Supports auto-resolving human-readable names for status and priority. " +
      "Labels and components support add/delete operations. " +
      "Only the fields you provide are changed — omitted fields are left as-is. " +
      "projectId is injected automatically from the active project context.",
  },
} as const;

/**
 * Toolsets
 */
export const TOOLSETS = {
  /** Test Automation toolset */
  TEST_AUTOMATION: "Test Automation",
  /** Test Cases toolset */
  TEST_CASES: "Test Cases",
  /** Test Cycle Management toolset */
  TEST_CYCLES: "Test Cycles",
  /** Projects toolset */
  PROJECTS: "Projects",
} as const;

/**
 * Configuration Keys
 */
export const CONFIG_KEYS = {
  /** API key configuration key */
  API_KEY: "api_key",

  /** Automation API key configuration key */
  AUTOMATION_API_KEY: "automation_api_key",

  /** Base URL configuration key */
  BASE_URL: "base_url",
} as const;

/**
 * Zod Schema Descriptions
 */
export const SCHEMA_DESCRIPTIONS = {
  /** API key description */
  API_KEY: "QTM4J API key for authentication",

  /** Automation API key description */
  AUTOMATION_API_KEY:
    "QTM4J Automation API key for uploading automation result files. This is a separate key from the regular API key and can be found in QTM4J under Automation settings.",

  /** Base URL description */
  BASE_URL:
    "QTM4J base URL (default: https://qtmcloud.qmetry.com). Can be customized for on-premise installations.",

  /** Project ID description */
  PROJECT_ID: "Numeric project ID (e.g., 10000)",

  /** Fields description */
  FIELDS:
    "List of fields to return in response. If not specified, all fields are returned.",

  /** Filter description */
  FILTER: "Filter criteria for searching test cases",

  /** Start at description */
  START_AT: "Zero-indexed starting position for pagination",

  /** Max results description */
  MAX_RESULTS: "Maximum number of results to return (1-100)",

  /** Max results projects description */
  MAX_RESULTS_PROJECTS: "Maximum number of results per page (1-100)",

  /** Order by description */
  ORDER_BY: "List of fields to order results by",

  /** Search text description */
  SEARCH_TEXT: "Search text for project key or project name",

  /** QMetry enabled description */
  QMETRY_ENABLED: "Filter by QMetry enabled status",

  /** Text search description */
  TEXT_SEARCH: "Text to search in test case name and description",

  /** Project ID filter description */
  PROJECT_ID_FILTER: "Numeric project ID to filter by",

  /** Project keys filter description */
  PROJECT_KEYS: "List of project keys to filter by",

  /** Folder IDs description */
  FOLDER_IDS: "List of folder IDs to filter by",

  /** Labels description */
  LABELS: "List of labels to filter by",

  /** Priority IDs description */
  PRIORITY_IDS: "List of priority IDs to filter by",

  /** Status IDs description */
  STATUS_IDS: "List of status IDs to filter by",

  /** Component IDs description */
  COMPONENT_IDS: "List of component IDs to filter by",

  /** Owner IDs description */
  OWNER_IDS: "List of owner user IDs to filter by",

  /** Created by description */
  CREATED_BY: "List of creator user IDs to filter by",

  /** Updated by description */
  UPDATED_BY: "List of updater user IDs to filter by",

  /** Created date from description */
  CREATED_DATE_FROM:
    "Filter test cases created after this date (ISO 8601 format)",

  /** Created date to description */
  CREATED_DATE_TO:
    "Filter test cases created before this date (ISO 8601 format)",

  /** Updated date from description */
  UPDATED_DATE_FROM:
    "Filter test cases updated after this date (ISO 8601 format)",

  /** Updated date to description */
  UPDATED_DATE_TO:
    "Filter test cases updated before this date (ISO 8601 format)",

  /** Field name for ordering */
  ORDER_FIELD: "Field name to order by (e.g., 'name', 'createdDate')",

  /** Sort order description */
  SORT_ORDER: "Sort order: ASC (ascending) or DESC (descending)",

  /** Project object description */
  PROJECT_OBJECT: "Project object",

  /** Status object description */
  STATUS_OBJECT: "Status object",

  /** Test case object description */
  TEST_CASE_OBJECT: "Test case object",

  /** Automation result file path */
  AUTOMATION_FILE_PATH:
    "Path to the automation result file on disk. Filesystem contents can change between turns — always resolve this from a fresh scan, never from a previously seen path. Supported extensions: .xml, .json, .zip",

  /** Automation result format */
  AUTOMATION_FORMAT:
    "Format of the result file. Supported values: cucumber, testng, junit, qaf, hpuft, specflow",

  /** Test cycle to reuse */
  AUTOMATION_TEST_CYCLE_TO_REUSE:
    "Work key of an existing test cycle to reuse (e.g. 'TR-PRJ-1'). If omitted, a new test cycle is created.",

  /** Automation environment */
  AUTOMATION_ENVIRONMENT:
    "Name of the environment on which the test cycle was executed (e.g. 'Chrome', 'Staging'). Defaults to 'No Environment'.",

  /** Automation build */
  AUTOMATION_BUILD:
    "Build name or version for the test cycle execution (e.g. '1.0.0-beta'). Defaults to blank.",

  /** isZip flag */
  AUTOMATION_IS_ZIP:
    "Set to true when uploading a ZIP archive containing result files. Required for QAF format.",

  /** attachFile flag */
  AUTOMATION_ATTACH_FILE:
    "Set to true to upload attachments referenced in execution results.",

  /** matchTestSteps flag */
  AUTOMATION_MATCH_TEST_STEPS:
    "true — match test cases by summary AND test steps. false — match by summary or key only.",

  /** appendTestName flag */
  AUTOMATION_APPEND_TEST_NAME:
    "Applicable to JUnit/TestNG only. Appends suite/test name to method name in test case summary.",

  /** fields object */
  AUTOMATION_FIELDS:
    "Additional fields to set on the test cycle, test case, and/or test case execution created during import.",

  /** getAutomationHistory — pagination */
  AUTOMATION_HISTORY_START_AT:
    "Zero-indexed starting position for pagination (default: 0).",
  AUTOMATION_HISTORY_MAX_RESULTS:
    "Maximum number of records to return per page (default: 20, max: 100).",
} as const;

/**
 * Default directories to search for automation result files when the user
 * does not provide an explicit file path. Add entries here to support
 * additional build tools or CI output locations.
 */
export const AUTOMATION_RESULT_DIRS = [
  "target/surefire-reports",
  "target/failsafe-reports",
  "build/reports/tests",
  "build/test-results",
  "test-results",
  "reports",
  "cucumber-reports",
] as const;

/**
 * Response Field Names
 */
export const RESPONSE_FIELDS = {
  /** Start at field */
  START_AT: "startAt",

  /** Max results field */
  MAX_RESULTS: "maxResults",

  /** Total field */
  TOTAL: "total",

  /** Is last field */
  IS_LAST: "isLast",

  /** Values field */
  VALUES: "values",

  /** Data field */
  DATA: "data",

  FIELDS: "fields",

  SORT: "sort",
} as const;

/**
 * Sort Defaults
 */
export const SORT_DEFAULTS = {
  /** Default sort expression for test cycle search */
  TEST_CYCLES: "key:asc",
} as const;

/**
 * Empty Values
 */
export const EMPTY_VALUES = {
  /** Empty object */
  OBJECT: {},

  /** Empty array */
  ARRAY: [],

  /** Empty string */
  STRING: "",

  /** Zero value */
  ZERO: 0,
} as const;
