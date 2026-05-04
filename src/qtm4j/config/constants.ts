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

  /** Common attributes endpoint (priority, statuses) */
  COMMON_ATTRIBUTES: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/common-attributes`,

  /** Labels search endpoint */
  LABELS: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/labels`,

  /** Components search endpoint */
  COMPONENTS: (projectId: number) =>
    `${API_CONFIG.API_VERSION}/projects/${projectId}/mcp/components`,
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
  DEFAULT_MAX_RESULTS_TEST_CASES: 20,

  /** Maximum allowed results per request */
  MAX_ALLOWED_RESULTS: 100,

  /** Minimum allowed results per request */
  MIN_ALLOWED_RESULTS: 1,
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
} as const;

/**
 * Configuration Keys
 */
export const CONFIG_KEYS = {
  /** API key configuration key */
  API_KEY: "api_key",

  /** Base URL configuration key */
  BASE_URL: "base_url",
} as const;

/**
 * Zod Schema Descriptions
 */
export const SCHEMA_DESCRIPTIONS = {
  /** API key description */
  API_KEY: "QTM4J API key for authentication",

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
} as const;

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
