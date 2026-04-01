import { z } from "zod";
import type { CacheService } from "../common/cache";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  GetInputFunction,
  RegisterResourceFunction,
  RegisterToolsFunction,
} from "../common/types";
import { Client } from "../common/types";
import type {
  Build,
  EventField,
  Organization,
  Project,
  Release,
  TraceField,
} from "./client/api";
import {
  Configuration,
  CurrentUserAPI,
  ErrorAPI,
  ProjectAPI,
} from "./client/api";
import type { FilterObject } from "./client/filters";

const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

const cacheKeys = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  PROJECT_EVENT_FIELDS: "bugsnag_project_event_fields",
  PROJECT_TRACE_FIELDS: "bugsnag_project_trace_fields",
  CURRENT_PROJECT: "bugsnag_current_project",
};

// Exclude certain event fields from the project event filters to improve agent usage
const EXCLUDED_EVENT_FIELDS = new Set([
  "search", // This is searches multiple fields and is more a convenience for humans, we're removing to avoid over-matching
]);

interface StabilityData {
  user_stability: number;
  session_stability: number;
  stability_target_type: string;
  target_stability: number;
  critical_stability: number;
  meets_target_stability: boolean;
  meets_critical_stability: boolean;
}

const ConfigurationSchema = z.object({
  auth_token: z.string().describe("BugSnag personal authentication token"),
  project_api_key: z.string().describe("BugSnag project API key").optional(),
  endpoint: z.string().url().describe("BugSnag endpoint URL").optional(),
});

export class BugsnagClient extends Client {
  private cache?: CacheService;
  private _projectApiKey?: string;
  private _isConfigured: boolean = false;
  private _currentUserApi: CurrentUserAPI | undefined;
  private _errorsApi: ErrorAPI | undefined;
  private _projectApi: ProjectAPI | undefined;
  private _appEndpoint: string | undefined;

  get currentUserApi(): CurrentUserAPI {
    if (!this._currentUserApi) throw new Error("Client not configured");
    return this._currentUserApi;
  }

  get errorsApi(): ErrorAPI {
    if (!this._errorsApi) throw new Error("Client not configured");
    return this._errorsApi;
  }

  get projectApi(): ProjectAPI {
    if (!this._projectApi) throw new Error("Client not configured");
    return this._projectApi;
  }

  get appEndpoint(): string {
    if (!this._appEndpoint) throw new Error("Client not configured");
    return this._appEndpoint;
  }

  name = "BugSnag";
  toolPrefix = "bugsnag";
  configPrefix = "Bugsnag";
  config = ConfigurationSchema;

  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this.cache = server.getCache();
    this._appEndpoint = this.getEndpoint(
      "app",
      config.project_api_key,
      config.endpoint,
    );
    const apiConfig = new Configuration({
      apiKey: `token ${config.auth_token}`,
      headers: {
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      },
      basePath: this.getEndpoint(
        "api",
        config.project_api_key,
        config.endpoint,
      ),
    });
    this._currentUserApi = new CurrentUserAPI(apiConfig);
    this._errorsApi = new ErrorAPI(apiConfig);
    this._projectApi = new ProjectAPI(apiConfig);
    this._projectApiKey = config.project_api_key;
    this._isConfigured = true;
    return;
  }

  isConfigured(): boolean {
    return this._isConfigured;
  }

  // If the endpoint is not provided, it will use the default API endpoint based on the project API key.
  // if the project api key is not provided, the endpoint will be the default API endpoint.
  // if the endpoint is provided, it will be used as is for custom domains, or normalized for known domains.
  getEndpoint(subdomain: string, apiKey?: string, endpoint?: string): string {
    let subDomainEndpoint: string;
    if (!endpoint) {
      if (apiKey?.startsWith(HUB_PREFIX)) {
        subDomainEndpoint = `https://${subdomain}.${HUB_DOMAIN}`;
      } else {
        subDomainEndpoint = `https://${subdomain}.${DEFAULT_DOMAIN}`;
      }
    } else {
      // check if the endpoint matches either the HUB_DOMAIN or DEFAULT_DOMAIN
      const url = new URL(endpoint);
      if (
        url.hostname.endsWith(HUB_DOMAIN) ||
        url.hostname.endsWith(DEFAULT_DOMAIN)
      ) {
        // For known domains (Hub or Bugsnag), always use HTTPS and standard format
        if (url.hostname.endsWith(HUB_DOMAIN)) {
          subDomainEndpoint = `https://${subdomain}.${HUB_DOMAIN}`;
        } else {
          subDomainEndpoint = `https://${subdomain}.${DEFAULT_DOMAIN}`;
        }
      } else {
        // For custom domains, use the endpoint exactly as provided
        subDomainEndpoint = endpoint;
      }
    }
    return subDomainEndpoint;
  }

  async getDashboardUrl(project: Project): Promise<string> {
    return `${this.appEndpoint}/${(await this.getOrganization()).slug}/${project.slug}`;
  }

  async getErrorUrl(
    project: Project,
    errorId: string,
    queryString?: string | null,
  ): Promise<string> {
    const dashboardUrl = await this.getDashboardUrl(project);
    return `${dashboardUrl}/errors/${errorId}${queryString ? `?${queryString}` : ""}`;
  }

  async getOrganization(): Promise<Organization> {
    let org = this.cache?.get<Organization>(cacheKeys.ORG);
    if (!org) {
      const response = await this.currentUserApi.listUserOrganizations();
      const orgs = response.body;
      if (!orgs || orgs.length === 0) {
        throw new Error("No organizations found for the current user.");
      }
      org = orgs[0];
      this.cache?.set(cacheKeys.ORG, org);
    }
    return org;
  }

  // This method retrieves all projects for the organization stored in the cache.
  // If no projects are found in the cache, it fetches them from the API and
  // stores them in the cache for future use.
  // It throws an error if no organizations are found in the cache.
  async getProjects(): Promise<Project[]> {
    let projects = this.cache?.get<Project[]>(cacheKeys.PROJECTS);
    if (!projects) {
      const org = await this.getOrganization();
      const response = await this.currentUserApi.getOrganizationProjects(
        org.id,
      );
      projects = response.body;
      this.cache?.set(cacheKeys.PROJECTS, projects);
    }
    return projects;
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find((p) => p.id === projectId) || null;
  }

  async getCurrentProject(): Promise<Project | null> {
    let project = this.cache?.get<Project>(cacheKeys.CURRENT_PROJECT) ?? null;
    if (!project && this._projectApiKey) {
      const projects = await this.getProjects();
      project =
        projects.find((p: Project) => p.api_key === this._projectApiKey) ??
        null;
      this.cache?.set(cacheKeys.CURRENT_PROJECT, project);
    }
    return project;
  }

  async getProjectEventFields(project: Project): Promise<EventField[]> {
    const projectFiltersCache =
      this.cache?.get<Record<string, EventField[]>>(
        cacheKeys.PROJECT_EVENT_FIELDS,
      ) || {};
    if (!projectFiltersCache[project.id]) {
      let filtersResponse = (
        await this.projectApi.listProjectEventFields(project.id)
      ).body;
      filtersResponse = filtersResponse.filter(
        (field) =>
          field.display_id && !EXCLUDED_EVENT_FIELDS.has(field.display_id),
      );
      projectFiltersCache[project.id] = filtersResponse;
      this.cache?.set(cacheKeys.PROJECT_EVENT_FIELDS, projectFiltersCache);
    }
    return projectFiltersCache[project.id];
  }

  async getProjectTraceFields(project: Project): Promise<TraceField[]> {
    const projectFiltersCache =
      this.cache?.get<Record<string, TraceField[]>>(
        cacheKeys.PROJECT_TRACE_FIELDS,
      ) || {};
    if (!projectFiltersCache[project.id]) {
      const filtersResponse = (
        await this.projectApi.listProjectTraceFields(project.id)
      ).body;
      projectFiltersCache[project.id] = filtersResponse;
      this.cache?.set(cacheKeys.PROJECT_TRACE_FIELDS, projectFiltersCache);
    }
    return projectFiltersCache[project.id];
  }

  async getEvent(eventId: string, projectId?: string) {
    const projectIds = projectId
      ? [projectId]
      : (await this.getProjects()).map((p) => p.id);
    const projectEvents = await Promise.all(
      projectIds.map((projectId: string) =>
        this.errorsApi.viewEventById(projectId, eventId).catch((_e) => null),
      ),
    );
    return projectEvents.find((event) => event && !!event.body)?.body || null;
  }

  public async validateEventFields(project: Project, fields?: FilterObject) {
    if (fields) {
      const eventFields = await this.getProjectEventFields(project);
      const validKeys = new Set(eventFields.map((f) => f.display_id));
      for (const key of Object.keys(fields)) {
        if (!validKeys.has(key)) {
          throw new ToolError(`Invalid filter key: ${key}`);
        }
      }
    }
  }

  public async getInputProject(projectId?: unknown | string): Promise<Project> {
    if (typeof projectId === "string") {
      const maybeProject = await this.getProject(projectId);
      if (!maybeProject) {
        throw new ToolError(`Project with ID ${projectId} not found.`);
      }
      // If this hasn't been configured at startup, set this to the current project for future tool calls
      if (!this._projectApiKey) {
        this.cache?.set(cacheKeys.CURRENT_PROJECT, maybeProject);
      }
      return maybeProject;
    } else {
      const currentProject = await this.getCurrentProject();
      if (!currentProject) {
        throw new ToolError(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      }
      return currentProject;
    }
  }

  public addStabilityData<T extends Release | Build>(
    source: T,
    project: Project,
  ): T & StabilityData {
    const accumulativeDailyUsersSeen =
      source.accumulative_daily_users_seen || 0;
    const accumulativeDailyUsersWithUnhandled =
      source.accumulative_daily_users_with_unhandled || 0;

    const userStability =
      accumulativeDailyUsersSeen === 0 // avoid division by zero
        ? 0
        : (accumulativeDailyUsersSeen - accumulativeDailyUsersWithUnhandled) /
          accumulativeDailyUsersSeen;

    const totalSessionsCount = source.total_sessions_count || 0;
    const unhandledSessionsCount = source.unhandled_sessions_count || 0;

    const sessionStability =
      totalSessionsCount === 0 // avoid division by zero
        ? 0
        : (totalSessionsCount - unhandledSessionsCount) / totalSessionsCount;

    const stabilityMetric =
      project.stability_target_type === "user"
        ? userStability
        : sessionStability;

    const targetStability = project.target_stability?.value || 0;
    const criticalStability = project.critical_stability?.value || 0;

    const meetsTargetStability = stabilityMetric >= targetStability;
    const meetsCriticalStability = stabilityMetric >= criticalStability;

    return {
      ...source,
      user_stability: userStability,
      session_stability: sessionStability,
      stability_target_type: project.stability_target_type || "user",
      target_stability: targetStability,
      critical_stability: criticalStability,
      meets_target_stability: meetsTargetStability,
      meets_critical_stability: meetsCriticalStability,
    };
  }

  async registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void> {
    const tools = await Promise.all([
      import("./tool/error/get-error"),
      import("./tool/error/list-project-errors"),
      import("./tool/error/update-error"),
      import("./tool/event/get-event"),
      import("./tool/event/get-event-details-from-dashboard-url"),
      import("./tool/performance/get-network-endpoint-groupings"),
      import("./tool/performance/get-span-group"),
      import("./tool/performance/get-trace"),
      import("./tool/performance/list-span-groups"),
      import("./tool/performance/list-spans"),
      import("./tool/performance/list-trace-fields"),
      import("./tool/performance/set-network-endpoint-groupings"),
      import("./tool/project/get-current-project"),
      import("./tool/project/list-project-event-filters"),
      import("./tool/project/list-projects"),
      import("./tool/release/get-build"),
      import("./tool/release/get-release"),
      import("./tool/release/list-releases"),
    ]);

    for (const tool of tools) {
      tool.default.register(this, register, getInput);
    }
  }

  async registerResources(register: RegisterResourceFunction): Promise<void> {
    const resources = [await import("./resource/event-resource")];

    for (const resource of resources) {
      resource.default.register(this, register);
    }
  }
}
