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
  readonly hasProjectIdParameter: boolean;
  readonly enableInSingleProjectMode: boolean;
  execute(args: any, context: ToolExecutionContext): Promise<object>;
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