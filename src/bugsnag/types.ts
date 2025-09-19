import { z } from "zod";
import * as NodeCache from "node-cache";
import { GetInputFunction } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI } from "./client/index.js";
import { Organization, Project } from "./client/api/CurrentUser.js";
import {
  ProjectAPI,
  EventField,
  ListBuildsOptions,
  BuildResponse,
  BuildSummaryResponse,
  StabilityData,
  ListReleasesOptions,
  ReleaseResponse,
  ReleaseSummaryResponse,
  ProjectStabilityTargets,
  BuildResponseAny,
  ReleaseResponseAny
} from "./client/api/Project.js";

/**
 * Core interface that all Bugsnag tools must implement
 */
export interface BugsnagTool {
  readonly name: string;
  readonly definition: ToolDefinition;
  execute(args: any, context: ToolExecutionContext): Promise<ToolResult>;
}

/**
 * Context provided to tools during execution
 */
export interface ToolExecutionContext {
  services: SharedServices;
  getInput: GetInputFunction;
}

/**
 * Result returned by tool execution
 * Matches the MCP SDK expected return type
 */
export interface ToolResult {
  [x: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Complete tool definition including metadata and parameters
 */
export interface ToolDefinition {
  title: string;
  summary: string;
  purpose: string;
  useCases: string[];
  parameters: ParameterDefinition[];
  examples: ToolExample[];
  hints: string[];
  outputFormat?: string;
}

/**
 * Parameter definition for tool inputs
 */
export interface ParameterDefinition {
  name: string;
  type: z.ZodType<any>;
  required: boolean;
  description: string;
  examples: string[];
  constraints?: string[];
}

/**
 * Example usage of a tool
 */
export interface ToolExample {
  description: string;
  parameters: Record<string, any>;
  expectedOutput: string;
}

/**
 * Shared services interface providing common functionality to all tools
 */
export interface SharedServices {
  // Project management
  getProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  getCurrentProject(): Promise<Project | null>;
  getInputProject(projectId?: string): Promise<Project>;

  // API clients
  getCurrentUserApi(): CurrentUserAPI;
  getErrorsApi(): ErrorAPI;
  getProjectApi(): ProjectAPI;

  // Caching
  getCache(): NodeCache;

  // URL generation
  getDashboardUrl(project: Project): Promise<string>;
  getErrorUrl(project: Project, errorId: string, queryString?: string): Promise<string>;

  // Configuration
  getProjectApiKey(): string | undefined;
  hasProjectApiKey(): boolean;

  // Organization
  getOrganization(): Promise<Organization>;

  // Event filters
  getProjectEventFilters(project: Project): Promise<EventField[]>;

  // Event operations
  getEvent(eventId: string, projectId?: string): Promise<any>;
  updateError(projectId: string, errorId: string, operation: string, options?: any): Promise<boolean>;

  // Build operations
  listBuilds(projectId: string, opts: ListBuildsOptions): Promise<{ builds: (BuildSummaryResponse & StabilityData)[], nextUrl: string | null }>;
  getBuild(projectId: string, buildId: string): Promise<BuildResponse & StabilityData>;

  // Release operations
  listReleases(projectId: string, opts: ListReleasesOptions): Promise<{ releases: (ReleaseSummaryResponse & StabilityData)[], nextUrl: string | null }>;
  getRelease(projectId: string, releaseId: string): Promise<ReleaseResponse & StabilityData>;
  listBuildsInRelease(releaseId: string): Promise<BuildResponse[]>;

  // Stability operations
  getProjectStabilityTargets(projectId: string): Promise<ProjectStabilityTargets>;
  addStabilityData<T extends BuildResponseAny | ReleaseResponseAny>(source: T, stabilityTargets: ProjectStabilityTargets): T & StabilityData;
}

/**
 * Error class for tool-specific errors
 */
export class BugsnagToolError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "BugsnagToolError";
  }
}

/**
 * Registry for managing tool discovery and registration
 */
export interface ToolRegistry {
  registerTool(tool: BugsnagTool): void;
  getTool(name: string): BugsnagTool | undefined;
  getAllTools(): BugsnagTool[];
  discoverTools(): BugsnagTool[];
  registerAllTools(register: any, context: ToolExecutionContext): void;
}

/**
 * Base class for implementing tools with common functionality
 */
export abstract class BaseBugsnagTool implements BugsnagTool {
  abstract readonly name: string;
  abstract readonly definition: ToolDefinition;

  abstract execute(args: any, context: ToolExecutionContext): Promise<ToolResult>;

  /**
   * Validate tool arguments using the parameter definitions
   */
  protected validateArgs(args: any): void {
    for (const param of this.definition.parameters) {
      if (param.required && (args[param.name] === undefined || args[param.name] === null)) {
        throw new BugsnagToolError(
          `Required parameter '${param.name}' is missing`,
          this.name
        );
      }

      if (args[param.name] !== undefined) {
        try {
          param.type.parse(args[param.name]);
        } catch (error) {
          throw new BugsnagToolError(
            `Invalid value for parameter '${param.name}': ${error}`,
            this.name,
            error as Error
          );
        }
      }
    }
  }

  /**
   * Create a successful tool result
   */
  protected createResult(data: any): ToolResult {
    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }

  /**
   * Create an error tool result
   */
  protected createErrorResult(message: string, _error?: Error): ToolResult {
    return {
      content: [{ type: "text", text: message }],
      isError: true
    };
  }
}

/**
 * Type definitions for common tool arguments
 */
export interface ProjectArgs {
  projectId?: string;
}

export interface ErrorArgs extends ProjectArgs {
  errorId: string;
}

export interface PaginationArgs {
  page_size?: number;
  page?: number;
  per_page?: number;
  next?: string;
}

export interface SortingArgs {
  sort?: string;
  direction?: "asc" | "desc";
}

/**
 * Constants for tool configuration
 */
export const TOOL_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100,
  DEFAULT_CACHE_TTL: 24 * 60 * 60, // 24 hours in seconds
  SHORT_CACHE_TTL: 5 * 60, // 5 minutes in seconds
} as const;
