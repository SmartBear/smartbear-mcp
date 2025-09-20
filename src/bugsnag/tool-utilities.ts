/**
 * Base tool implementation utilities for Bugsnag tools
 *
 * This module provides common utilities for parameter validation, error handling,
 * and response formatting that all Bugsnag tools should use for consistency.
 */

import { z } from "zod";
import { ParameterDefinition } from "./types.js";
import { FilterObjectSchema } from "./client/api/filters.js";
import { ToolError } from "../common/types.js";
import { ApiResponse } from "./client/api/base.js";

export const DEFAULT_FILTERS = {
  "event.since": [{ type: "eq", value: "30d" }],
  "error.status": [{ type: "eq", value: "open" }]
};

/**
 * Common parameter schemas used across multiple tools
 */
export const CommonParameterSchemas = {
  // Project ID
  projectId: z.string().min(1, "Project ID cannot be empty"),

  // Error ID
  errorId: z.string().min(1, "Error ID cannot be empty"),

  // Event ID
  eventId: z.string().min(1, "Event ID cannot be empty"),

  // Build ID
  buildId: z.string().min(1, "Build ID cannot be empty"),

  // Release ID
  releaseId: z.string().min(1, "Release ID cannot be empty"),

  // Pagination parameters
  pageSize: z.number().int().min(1).max(100),
  page: z.number().int().min(1),
  perPage: z.number().int().min(1).max(100),

  // Sorting parameters
  sort: z.string().min(1),
  direction: z.enum(["asc", "desc"]),

  // URL parameters
  nextUrl: z.string().url(),
  dashboardUrl: z.string().url(),

  // Filter parameters
  filters: FilterObjectSchema,

  // Time-related parameters
  since: z.string().min(1),
  before: z.string().min(1),

  // Release stage
  releaseStage: z.string().min(1),

  // Update operations
  updateOperation: z.enum([
    "override_severity",
    "open",
    "fix",
    "ignore",
    "discard",
    "undiscard"
  ]),

  // Severity levels
  severity: z.enum(["error", "warning", "info"]),

  // Boolean flags
  fullReports: z.boolean(),

  // Generic string parameters
  nonEmptyString: z.string().min(1),
  optionalString: z.string().optional(),
} as const;

/**
 * Common parameter definitions that can be reused across tools
 */
export const CommonParameterDefinitions = {
  projectId: (required: boolean = true): ParameterDefinition => ({
    name: "projectId",
    type: CommonParameterSchemas.projectId,
    required,
    description: "ID of the project to query",
    examples: ["515fb9337c1074f6fd000003"],
  }),

  errorId: (): ParameterDefinition => ({
    name: "errorId",
    type: CommonParameterSchemas.errorId,
    required: true,
    description: "Unique identifier of the error",
    examples: ["6863e2af8c857c0a5023b411"],
  }),

  eventId: (): ParameterDefinition => ({
    name: "eventId",
    type: CommonParameterSchemas.eventId,
    required: true,
    description: "Unique identifier of the event",
    examples: ["6863e2af012caf1d5c320000"],
  }),

  buildId: (): ParameterDefinition => ({
    name: "buildId",
    type: CommonParameterSchemas.buildId,
    required: true,
    description: "Unique identifier of the build",
    examples: ["build-123"],
  }),

  releaseId: (): ParameterDefinition => ({
    name: "releaseId",
    type: CommonParameterSchemas.releaseId,
    required: true,
    description: "Unique identifier of the release",
    examples: ["release-456"],
  }),

  filters: (required: boolean = false, defaultValue?: any): ParameterDefinition => ({
    name: "filters",
    type: defaultValue ? CommonParameterSchemas.filters.default(defaultValue) : CommonParameterSchemas.filters,
    required,
    description: "Apply filters to narrow down results. Use the List Project Event Filters tool to discover available filter fields",
    examples: [
      '{"error.status": [{"type": "eq", "value": "open"}]}',
      '{"event.since": [{"type": "eq", "value": "7d"}]}',
      '{"user.email": [{"type": "eq", "value": "user@example.com"}]}'
    ],
    constraints: [
      "Time filters support ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h)",
      "ISO 8601 times must be in UTC and use extended format",
      "Relative time periods: h (hours), d (days)"
    ]
  }),

  sort: (validValues: string[], defaultValue?: string): ParameterDefinition => ({
    name: "sort",
    type: defaultValue ? z.enum(validValues as [string, ...string[]]).default(defaultValue) : z.enum(validValues as [string, ...string[]]),
    required: false,
    description: "Field to sort results by",
    examples: validValues,
  }),

  direction: (defaultValue: "asc" | "desc" = "desc"): ParameterDefinition => ({
    name: "direction",
    type: CommonParameterSchemas.direction.default(defaultValue),
    required: false,
    description: "Sort direction for ordering results",
    examples: ["desc", "asc"],
  }),

  perPage: (defaultValue: number = 30): ParameterDefinition => ({
    name: "per_page",
    type: CommonParameterSchemas.perPage.default(defaultValue),
    required: false,
    description: "Number of results to return per page",
    examples: ["30", "50", "100"],
  }),

  pageSize: (defaultValue: number = 10): ParameterDefinition => ({
    name: "page_size",
    type: CommonParameterSchemas.pageSize.default(defaultValue),
    required: false,
    description: "Number of results to return per page for pagination",
    examples: ["10", "25", "50"],
  }),

  page: (): ParameterDefinition => ({
    name: "page",
    type: CommonParameterSchemas.page,
    required: false,
    description: "Page number to return (starts from 1)",
    examples: ["1", "2", "3"],
  }),

  nextUrl: (): ParameterDefinition => ({
    name: "next",
    type: CommonParameterSchemas.nextUrl,
    required: false,
    description: "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available.",
    examples: ["https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?offset=30&per_page=30&sort=last_seen"],
    constraints: ["Only values provided in the output from this tool can be used. Do not attempt to construct it manually."]
  }),

  dashboardUrl: (): ParameterDefinition => ({
    name: "link",
    type: CommonParameterSchemas.dashboardUrl,
    required: true,
    description: "Full URL to the dashboard page in the BugSnag dashboard (web interface)",
    examples: ["https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"],
    constraints: ["Must be a valid dashboard URL containing required parameters"]
  }),

  releaseStage: (): ParameterDefinition => ({
    name: "releaseStage",
    type: CommonParameterSchemas.releaseStage,
    required: false,
    description: "Filter by release stage (e.g. production, staging)",
    examples: ["production", "staging", "development"],
  }),

  updateOperation: (): ParameterDefinition => ({
    name: "operation",
    type: CommonParameterSchemas.updateOperation,
    required: true,
    description: "The operation to perform on the error",
    examples: ["fix", "ignore", "open", "override_severity"],
  }),

  severity: (): ParameterDefinition => ({
    name: "severity",
    type: CommonParameterSchemas.severity,
    required: false,
    description: "New severity level (required when operation is override_severity)",
    examples: ["error", "warning", "info"],
  }),
} as const;

/**
 * Validates tool arguments against parameter definitions
 *
 * @param args The arguments to validate
 * @param parameters The parameter definitions to validate against
 * @param toolName The name of the tool (for error messages)
 * @throws BugsnagToolError if validation fails
 */
export function validateToolArgs(
  args: any,
  parameters: ParameterDefinition[],
  toolName: string
): void {
  for (const param of parameters) {
    const value = args[param.name];

    // Check required parameters
    if (param.required && (value === undefined || value === null)) {
      throw new ToolError(
        `Required parameter '${param.name}' is missing`,
        toolName
      );
    }

    // Validate parameter type if value is provided
    if (value !== undefined && value !== null) {
      try {
        param.type.parse(value);
      } catch (error) {
        const zodError = error as z.ZodError;
        const errorMessage = zodError.errors.map(e => e.message).join(", ");
        throw new ToolError(
          `Invalid value for parameter '${param.name}': ${errorMessage}`,
          toolName,
          error as Error
        );
      }
    }
  }
}

/**
 * Formats paginated results with consistent structure
 *
 * @param response The API response containing paginated data
 * @returns Formatted result object
 */
export function formatPaginatedResult(response: ApiResponse<any>): any {
  const result: any = {
    data: response.body || [],
    count: (response.body || []).length
  };

  const totalCount = response.headers.get('X-Total-Count');
  if (totalCount) {
    result.total = parseInt(totalCount, undefined);
  }

  if (response.headers.get('Link')) {
    const linkHeader = response.headers.get('Link');
    const nextUrl = linkHeader?.match(/<([^>]+)>/)?.[1] || null;
    if (nextUrl) {
      result.next = nextUrl;
    }
  }

  return result;
}

/**
 * Formats a simple list result
 *
 * @param data The array of data items
 * @param count The number of items
 * @returns Formatted result object
 */
export function formatListResult(data: any[], count: number): any {
  return {
    data,
    count
  };
}

/**
 * Extracts project slug from a dashboard URL
 *
 * @param url The dashboard URL
 * @returns The project slug
 * @throws BugsnagToolError if URL format is invalid
 */
export function extractProjectSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    if (pathParts.length < 3) {
      throw new Error("URL path too short");
    }

    const projectSlug = pathParts[2];
    if (!projectSlug) {
      throw new Error("Project slug not found in URL");
    }

    return projectSlug;
  } catch (error) {
    throw new ToolError(
      `Invalid dashboard URL format: ${error instanceof Error ? error.message : String(error)}`,
      "UrlExtraction"
    );
  }
}

/**
 * Extracts event ID from a dashboard URL query parameters
 *
 * @param url The dashboard URL
 * @returns The event ID
 * @throws BugsnagToolError if event ID is not found
 */
export function extractEventIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const eventId = urlObj.searchParams.get("event_id");

    if (!eventId) {
      throw new Error("event_id parameter not found in URL");
    }

    return eventId;
  } catch (error) {
    throw new ToolError(
      `Cannot extract event ID from URL: ${error instanceof Error ? error.message : String(error)}`,
      "UrlExtraction"
    );
  }
}