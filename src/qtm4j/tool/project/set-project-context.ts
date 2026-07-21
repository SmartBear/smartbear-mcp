import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import {
  ENDPOINTS,
  PAGINATION,
  RESPONSE_FIELDS,
  TOOL_NAMES,
  TOOLSETS,
} from "../../config/constants";
import {
  GetProjectsResponse,
  SetProjectContextBody,
  SetProjectContextResponse,
} from "../../schema/project.schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_SEARCH_MAX_RESULTS = 10;

const ERRORS = {
  PROJECT_NOT_FOUND: (key: string) =>
    `Project with key '${key}' not found. Use the get_projects tool to list available projects.`,
  NO_EXACT_MATCH: (key: string, candidates: string[]) =>
    `No exact match for project key '${key}'. Did you mean one of: ${candidates.join(", ")}? ` +
    "Please provide the exact project key.",
} as const;

// ─── Tool ────────────────────────────────────────────────────────────────────

/**
 * SetProjectContext Tool
 *
 * Sets the active QTM4J project for the current session.
 * Must be called before any project-specific operation.
 *
 * Flow:
 * 1. Resolves projectKey → projectId via the projects API.
 * 2. Validates exact key match.
 * 3. Stores project context on the client.
 * 4. Clears any stale cache for the project.
 */
export class SetProjectContext extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.SET_PROJECT_CONTEXT.TITLE,
    toolset: TOOLSETS.PROJECTS,
    summary: TOOL_NAMES.SET_PROJECT_CONTEXT.SUMMARY,
    readOnly: false,
    idempotent: true,
    inputSchema: SetProjectContextBody,
    outputSchema: SetProjectContextResponse,
    purpose:
      "Set the active QTM4J project for the current session. " +
      "This tool MUST be called before performing ANY project-specific operation. " +
      "NEVER auto-select a project — if the user has not specified a project key, " +
      "call get_projects first, show the list to the user, and ask them to choose.",
    useCases: [
      "Set the active project at the start of a new conversation",
      "Switch to a different project mid-conversation",
      "Validate that a project key exists before performing operations",
      "Establish project context required by all project-specific tools",
    ],
    examples: [
      {
        description: "Set SCRUM project as active",
        parameters: { projectKey: "SCRUM" },
        expectedOutput: "Project context set to SCRUM (ID: 10000)",
      },
      {
        description: "Switch to AD project",
        parameters: { projectKey: "AD" },
        expectedOutput: "Project context switched to AD",
      },
    ],
    hints: [
      "CRITICAL: This tool MUST be called before ANY project-specific tool.",
      "NEVER auto-select a project. If the user does not specify a project key, call get_projects first, " +
        "present the list to the user and ask them to choose. Do NOT pick one on their behalf.",
      "The project key must be an exact match (e.g., 'SCRUM', not 'scrum project').",
      "After calling this tool, use the availableFields in the response to map user input via NLP " +
        "(e.g. user says 'Major' → send 'High', user says 'Critical' → send 'Blocker').",
      "Switching projects clears the cached field metadata of the previous project only.",
      "If this tool is called again in the same session, it resets the context to the new project.",
    ],
    outputDescription:
      "JSON object with projectId, projectKey, projectName, confirmation message, and availableFields. " +
      "availableFields contains priority and status options for NLP mapping in subsequent tool calls.",
  };

  handle: ToolCallback<ZodRawShape> = async (rawArgs) => {
    const { projectKey } = SetProjectContextBody.parse(rawArgs);
    const apiClient = this.client.getApiClient();

    // Step 1: Search for the project by key
    const body = {
      [RESPONSE_FIELDS.START_AT]: PAGINATION.DEFAULT_START_AT,
      [RESPONSE_FIELDS.MAX_RESULTS]: PROJECT_SEARCH_MAX_RESULTS,
      search: projectKey,
    };

    const response = await apiClient
      .skipAnalytics()
      .post(ENDPOINTS.PROJECTS, body);
    const parsed = GetProjectsResponse.parse(response);

    if (parsed.data.length === 0) {
      throw new ToolError(ERRORS.PROJECT_NOT_FOUND(projectKey));
    }

    // Step 2: Require exact case-insensitive match
    const exactMatch = parsed.data.find(
      (p) => p.key.toLowerCase() === projectKey.toLowerCase(),
    );

    if (!exactMatch) {
      const candidates = parsed.data.map((p) => `${p.key} (${p.name})`);
      throw new ToolError(ERRORS.NO_EXACT_MATCH(projectKey, candidates));
    }

    // Step 3: Store project context in the field resolver
    const fieldResolver = this.client.getResolverRegistry();

    // If switching to a different project, clear the old project's stale cache
    try {
      const previousContext = fieldResolver.requireProjectContext();
      if (previousContext.projectKey !== exactMatch.key) {
        fieldResolver.clearProjectCache(previousContext.projectKey);
      }
    } catch {
      // No previous context set — nothing to clear
    }

    fieldResolver.setProjectContext({
      projectId: exactMatch.id,
      projectKey: exactMatch.key,
      projectName: exactMatch.name,
    });

    // Step 4: Eagerly load all common attribute fields (priority, statuses) so the LLM
    // can map user-friendly names to IDs in subsequent tool calls without a round-trip.
    let availableFields: Record<string, Record<string, string>> = {};
    try {
      availableFields = await fieldResolver
        .getCommonAttributeResolver()
        .preload(exactMatch.key, exactMatch.id);
    } catch {
      // Silently ignore — fields will be fetched on demand when needed
    }

    // Step 5: Return confirmation with available field values for LLM NLP mapping
    const result = {
      projectId: exactMatch.id,
      projectKey: exactMatch.key,
      projectName: exactMatch.name,
      message:
        `Project context set to '${exactMatch.key}' (${exactMatch.name}, ID: ${exactMatch.id}). ` +
        "You can now perform project-specific operations.",
      availableFields,
    };

    return {
      structuredContent: SetProjectContextResponse.parse(result),
      content: [],
    };
  };
}
