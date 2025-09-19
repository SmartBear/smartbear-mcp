import * as NodeCache from "node-cache";
import { SharedServices, BugsnagToolError } from "./types.js";
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
import { getNextUrlPathFromHeader } from "./client/api/base.js";


/**
 * Cache keys used throughout the application
 */
const CACHE_KEYS = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  CURRENT_PROJECT: "bugsnag_current_project",
  CURRENT_PROJECT_EVENT_FILTERS: "bugsnag_current_project_event_filters",
  BUILD: "bugsnag_build", // + buildId
  RELEASE: "bugsnag_release", // + releaseId
  BUILDS_IN_RELEASE: "bugsnag_builds_in_release", // + releaseId
  STABILITY_TARGETS: "bugsnag_stability_targets", // + projectId
  PROJECT_LOOKUP: "bugsnag_project_lookup" // + projectId for fast project lookups
} as const;

/**
 * Cache TTL values in seconds
 */
const CACHE_TTL = {
  DEFAULT: 24 * 60 * 60, // 24 hours
  SHORT: 5 * 60, // 5 minutes for frequently changing data
  MEDIUM: 60 * 60, // 1 hour for moderately changing data
  LONG: 7 * 24 * 60 * 60 // 7 days for rarely changing data
} as const;

/**
 * Event fields to exclude from project event filters
 */
const EXCLUDED_EVENT_FIELDS = new Set([
  "search" // This searches multiple fields and is more a convenience for humans
]);

/**
 * Implementation of SharedServices that provides common functionality to all tools
 */
export class BugsnagSharedServices implements SharedServices {
  private currentUserApi: CurrentUserAPI;
  private errorsApi: ErrorAPI;
  private projectApi: ProjectAPI;
  private cache: NodeCache;
  private projectApiKey?: string;
  private appEndpoint: string;
  private apiEndpoint: string;

  constructor(
    currentUserApi: CurrentUserAPI,
    errorsApi: ErrorAPI,
    projectApi: ProjectAPI,
    cache: NodeCache,
    appEndpoint: string,
    apiEndpoint: string,
    projectApiKey?: string
  ) {
    this.currentUserApi = currentUserApi;
    this.errorsApi = errorsApi;
    this.projectApi = projectApi;
    this.cache = cache;
    this.appEndpoint = appEndpoint;
    this.apiEndpoint = apiEndpoint;
    this.projectApiKey = projectApiKey;
  }

  // Project management methods
  async getProjects(): Promise<Project[]> {
    let projects = this.cache.get<Project[]>(CACHE_KEYS.PROJECTS);
    if (!projects) {
      const org = await this.getOrganization();
      const response = await this.currentUserApi.getOrganizationProjects(org.id);
      projects = response.body || [];
      this.cache.set(CACHE_KEYS.PROJECTS, projects, CACHE_TTL.MEDIUM);

      // Create individual project lookups for faster access
      for (const project of projects) {
        this.cache.set(`${CACHE_KEYS.PROJECT_LOOKUP}_${project.id}`, project, CACHE_TTL.MEDIUM);
      }
    }
    return projects;
  }

  async getProject(projectId: string): Promise<Project | null> {
    // Try individual project lookup first for better performance
    let project: Project | null = this.cache.get<Project>(`${CACHE_KEYS.PROJECT_LOOKUP}_${projectId}`) || null;
    if (project) {
      return project;
    }

    // Fallback to full projects list
    const projects = await this.getProjects();
    project = projects.find((p) => p.id === projectId) || null;

    // Cache the individual project for future lookups
    if (project) {
      this.cache.set(`${CACHE_KEYS.PROJECT_LOOKUP}_${projectId}`, project, CACHE_TTL.MEDIUM);
    }

    return project;
  }

  async getCurrentProject(): Promise<Project | null> {
    let project = this.cache.get<Project>(CACHE_KEYS.CURRENT_PROJECT) ?? null;
    if (!project && this.projectApiKey) {
      const projects = await this.getProjects();
      project = projects.find((p) => p.api_key === this.projectApiKey) ?? null;
      if (!project) {
        throw new BugsnagToolError(
          `Unable to find project with API key ${this.projectApiKey} in organization.`,
          "SharedServices"
        );
      }
      this.cache.set(CACHE_KEYS.CURRENT_PROJECT, project, CACHE_TTL.LONG);

      // Pre-cache event filters for better performance
      if (project) {
        try {
          const filters = await this.getProjectEventFilters(project);
          this.cache.set(CACHE_KEYS.CURRENT_PROJECT_EVENT_FILTERS, filters, CACHE_TTL.MEDIUM);
        } catch (error) {
          // Don't fail if event filters can't be cached
          console.warn('Failed to pre-cache event filters:', error);
        }
      }
    }
    return project;
  }

  async getInputProject(projectId?: string): Promise<Project> {
    if (typeof projectId === 'string') {
      const maybeProject = await this.getProject(projectId);
      if (!maybeProject) {
        throw new BugsnagToolError(
          `Project with ID ${projectId} not found.`,
          "SharedServices"
        );
      }
      return maybeProject;
    } else {
      const currentProject = await this.getCurrentProject();
      if (!currentProject) {
        throw new BugsnagToolError(
          'No current project found. Please provide a projectId or configure a project API key.',
          "SharedServices"
        );
      }
      return currentProject;
    }
  }

  // API client access methods
  getCurrentUserApi(): CurrentUserAPI {
    return this.currentUserApi;
  }

  getErrorsApi(): ErrorAPI {
    return this.errorsApi;
  }

  getProjectApi(): ProjectAPI {
    return this.projectApi;
  }

  // Caching methods
  getCache(): NodeCache {
    return this.cache;
  }

  // URL generation methods
  async getDashboardUrl(project: Project): Promise<string> {
    return `${this.appEndpoint}/${(await this.getOrganization()).slug}/${project.slug}`;
  }

  async getErrorUrl(project: Project, errorId: string, queryString = ''): Promise<string> {
    const dashboardUrl = await this.getDashboardUrl(project);
    return `${dashboardUrl}/errors/${errorId}${queryString}`;
  }

  // Configuration methods
  getProjectApiKey(): string | undefined {
    return this.projectApiKey;
  }

  hasProjectApiKey(): boolean {
    return !!this.projectApiKey;
  }

  // Organization methods
  async getOrganization(): Promise<Organization> {
    let org = this.cache.get<Organization>(CACHE_KEYS.ORG);
    if (!org) {
      const response = await this.currentUserApi.listUserOrganizations();
      const orgs = response.body || [];
      if (!orgs || orgs.length === 0) {
        throw new BugsnagToolError(
          "No organizations found for the current user.",
          "SharedServices"
        );
      }
      org = orgs[0];
      this.cache.set(CACHE_KEYS.ORG, org, CACHE_TTL.LONG);
    }
    return org;
  }

  // Event filter methods
  async getProjectEventFilters(project: Project): Promise<EventField[]> {
    let filtersResponse = (await this.projectApi.listProjectEventFields(project.id)).body;
    if (!filtersResponse || filtersResponse.length === 0) {
      throw new BugsnagToolError(
        `No event fields found for project ${project.name}.`,
        "SharedServices"
      );
    }
    filtersResponse = filtersResponse.filter(field => !EXCLUDED_EVENT_FIELDS.has(field.display_id));
    return filtersResponse;
  }

  // Event operation methods
  async getEvent(eventId: string, projectId?: string): Promise<any> {
    const projectIds = projectId ? [projectId] : (await this.getProjects()).map((p) => p.id);
    const projectEvents = await Promise.all(
      projectIds.map((projectId: string) =>
        this.errorsApi.viewEventById(projectId, eventId).catch(_e => null)
      )
    );
    return projectEvents.find(event => event && !!event.body)?.body || null;
  }

  async updateError(projectId: string, errorId: string, operation: string, options?: any): Promise<boolean> {
    const errorUpdateRequest = {
      operation: operation,
      ...options
    };
    const response = await this.errorsApi.updateErrorOnProject(projectId, errorId, errorUpdateRequest);
    return response.status === 200 || response.status === 204;
  }

  // Build operation methods
  async listBuilds(projectId: string, opts: ListBuildsOptions): Promise<{ builds: (BuildSummaryResponse & StabilityData)[], nextUrl: string | null }> {
    const response = await this.projectApi.listBuilds(projectId, opts);
    const fetchedBuilds = response.body || [];
    const nextUrl = getNextUrlPathFromHeader(response.headers, this.apiEndpoint);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedBuilds = fetchedBuilds.map(
      (b) => this.addStabilityData(b, stabilityTargets)
    );

    return { builds: formattedBuilds, nextUrl };
  }

  async getBuild(projectId: string, buildId: string): Promise<BuildResponse & StabilityData> {
    const cacheKey = `${CACHE_KEYS.BUILD}_${buildId}`;
    const build = this.cache.get<BuildResponse & StabilityData>(cacheKey);
    if (build) return build;

    const fetchedBuild = (await this.projectApi.getBuild(projectId, buildId)).body;
    if (!fetchedBuild) {
      throw new BugsnagToolError(
        `No build for ${buildId} found.`,
        "SharedServices"
      );
    }

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedBuild = this.addStabilityData(fetchedBuild, stabilityTargets);
    this.cache.set(cacheKey, formattedBuild, CACHE_TTL.SHORT);
    return formattedBuild;
  }

  // Release operation methods
  async listReleases(projectId: string, opts: ListReleasesOptions): Promise<{ releases: (ReleaseSummaryResponse & StabilityData)[], nextUrl: string | null }> {
    const response = await this.projectApi.listReleases(projectId, opts);
    const fetchedReleases = response.body || [];
    const nextUrl = getNextUrlPathFromHeader(response.headers, this.apiEndpoint);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedReleases = fetchedReleases.map(
      (r) => this.addStabilityData(r, stabilityTargets)
    );

    return { releases: formattedReleases, nextUrl };
  }

  async getRelease(projectId: string, releaseId: string): Promise<ReleaseResponse & StabilityData> {
    const cacheKey = `${CACHE_KEYS.RELEASE}_${releaseId}`;
    const release = this.cache.get<ReleaseResponse & StabilityData>(cacheKey);
    if (release) return release;

    const fetchedRelease = (await this.projectApi.getRelease(releaseId)).body;
    if (!fetchedRelease) {
      throw new BugsnagToolError(
        `No release for ${releaseId} found.`,
        "SharedServices"
      );
    }

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedRelease = this.addStabilityData(fetchedRelease, stabilityTargets);
    this.cache.set(cacheKey, formattedRelease, CACHE_TTL.SHORT);
    return formattedRelease;
  }

  async listBuildsInRelease(releaseId: string): Promise<BuildResponse[]> {
    const cacheKey = `${CACHE_KEYS.BUILDS_IN_RELEASE}_${releaseId}`;
    const builds = this.cache.get<BuildResponse[]>(cacheKey);
    if (builds) return builds;

    const fetchedBuilds = (await this.projectApi.listBuildsInRelease(releaseId)).body || [];
    this.cache.set(cacheKey, fetchedBuilds, CACHE_TTL.SHORT);
    return fetchedBuilds;
  }

  // Stability operation methods
  async getProjectStabilityTargets(projectId: string): Promise<ProjectStabilityTargets> {
    const cacheKey = `${CACHE_KEYS.STABILITY_TARGETS}_${projectId}`;
    let targets = this.cache.get<ProjectStabilityTargets>(cacheKey);
    if (!targets) {
      targets = await this.projectApi.getProjectStabilityTargets(projectId);
      this.cache.set(cacheKey, targets, CACHE_TTL.MEDIUM);
    }
    return targets;
  }

  addStabilityData<T extends BuildResponseAny | ReleaseResponseAny>(
    source: T,
    stabilityTargets: ProjectStabilityTargets
  ): T & StabilityData {
    const { stability_target_type, target_stability, critical_stability } = stabilityTargets;

    const user_stability =
      source.accumulative_daily_users_seen === 0 // avoid division by zero
        ? 0
        : (source.accumulative_daily_users_seen - source.accumulative_daily_users_with_unhandled) /
        source.accumulative_daily_users_seen;

    const session_stability =
      source.total_sessions_count === 0 // avoid division by zero
        ? 0
        : (source.total_sessions_count - source.unhandled_sessions_count) / source.total_sessions_count;

    const stabilityMetric = stability_target_type === "user" ? user_stability : session_stability;

    const meets_target_stability = stabilityMetric >= target_stability.value;
    const meets_critical_stability = stabilityMetric >= critical_stability.value;

    return {
      ...source,
      user_stability,
      session_stability,
      stability_target_type,
      target_stability: target_stability.value,
      critical_stability: critical_stability.value,
      meets_target_stability,
      meets_critical_stability,
    };
  }
}
