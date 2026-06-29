import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import {
  ENDPOINTS,
  RESPONSE_FIELDS,
  TOOL_NAMES,
  TOOLSETS,
} from "../../config/constants";
import {
  GetProjectsBody,
  GetProjectsResponse,
  type GetProjectsResponseType,
} from "../../schema/project.schema";

/**
 * GetProjects Tool
 *
 * Retrieves all projects from QTM4J with optional filtering.
 */
export class GetProjects extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_PROJECTS.TITLE,
    toolset: TOOLSETS.PROJECTS,
    summary: TOOL_NAMES.GET_PROJECTS.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetProjectsBody,
    outputSchema: GetProjectsResponse,
    purpose:
      "Retrieve project information including IDs, keys, and names from QTM4J. " +
      "Useful for discovering available projects, validating project access, and getting project metadata.",
    useCases: [
      "Discover all projects available in QTM4J instance",
      "Get project IDs and keys for reference in other operations",
      "Find specific projects by ID",
      "Search projects by text in project key or name",
      "Filter projects by QMetry integration status",
      "List projects with pagination for large QTM4J instances",
      "Retrieve complete project details (ID, key, name, avatarUrl, projectTypeKey, qmetryEnabled, favorite)",
      "Validate project access and permissions",
      "Browse available projects before performing other operations",
    ],
    examples: [
      {
        description: "Get all projects (default pagination - first 100)",
        parameters: {},
        expectedOutput:
          "List of all projects with IDs, keys, and names (first 100 projects)",
      },
      {
        description: "Get the first 10 projects",
        parameters: {
          maxResults: 10,
        },
        expectedOutput: "List of first 10 projects with their details",
      },
      {
        description: "Get a specific project by ID",
        parameters: {
          projectId: 10000,
        },
        expectedOutput:
          "Single project with ID 10000 including key, name, and QMetry status",
      },
      {
        description: "Search projects by text in project key or name",
        parameters: {
          search: "SCRUM",
        },
        expectedOutput:
          "Projects matching 'SCRUM' search text in their project keys or names",
      },
      {
        description: "Get only QMetry-enabled projects",
        parameters: {
          qmetryEnabled: true,
        },
        expectedOutput: "List of projects that have QMetry integration enabled",
      },
      {
        description: "Get projects with custom pagination (page 2)",
        parameters: {
          startAt: 50,
          maxResults: 50,
        },
        expectedOutput:
          "Second page of projects (items 51-100) with their details",
      },
      {
        description: "Search QMetry-enabled projects by text",
        parameters: {
          search: "TEST",
          qmetryEnabled: true,
        },
        expectedOutput:
          "QMetry-enabled projects containing 'TEST' in their project keys",
      },
    ],
    hints: [
      "Project IDs are numeric (e.g., 10000), project keys are strings (e.g., 'SCRUM')",
      "Use 'projectId' parameter to filter by a specific project ID",
      "Use 'search' parameter to search by text in project key or project name",
      "Use 'qmetryEnabled' parameter to filter projects by QMetry integration status",
      "Response contains complete project details: id, key, name, favorite, avatarUrl, projectTypeKey, qmetryEnabled",
      "Pagination: startAt is zero-indexed, maxResults max is 100, default is 100",
      "Default (no parameters) returns first 100 projects",
      "Use 'isLast' in response to check if more pages are available",
      "To get next page: increment startAt by maxResults (0 → 100 → 200)",
      "Use 'total' in response for total count of matching projects",
    ],
    outputDescription:
      "JSON object containing paginated list of projects with IDs, keys, names, and QMetry status, along with pagination metadata",
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const input = GetProjectsBody.parse(args);

    // Build request body with pagination and optional filters
    const body = {
      [RESPONSE_FIELDS.START_AT]: input.startAt,
      [RESPONSE_FIELDS.MAX_RESULTS]: input.maxResults,
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.search && { search: input.search }),
      ...(input.qmetryEnabled !== undefined && {
        qmetryEnabled: input.qmetryEnabled,
      }),
    };

    // Make API request and validate response
    const apiClient = this.client.getApiClient();
    const response = await apiClient
      .skipAnalytics()
      .post(ENDPOINTS.PROJECTS, body);
    const validatedResponse: GetProjectsResponseType =
      GetProjectsResponse.parse(response);

    return {
      structuredContent: validatedResponse,
      content: [],
    };
  };
}
