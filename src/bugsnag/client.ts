import { z } from "zod";
import type { CacheService } from "../common/cache";
import { getUserAgent } from "../common/info";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterResourceFunction,
  RegisterToolsFunction,
} from "../common/types";
import { CurrentUserAPI } from "./client/api/CurrentUser";
import { Configuration } from "./client/api/configuration";
import { ErrorAPI } from "./client/api/Error";
import type {
  Build,
  EventField,
  Organization,
  Project,
  Release,
  TraceField,
} from "./client/api/index";
import { ProjectAPI } from "./client/api/Project";
import type { FilterObject } from "./client/filters";
import { CreateErrorComment } from "./tool/error/create-error-comment";
import { GetError } from "./tool/error/get-error";
import { ListErrorComments } from "./tool/error/list-error-comments";
import { ListProjectErrors } from "./tool/error/list-project-errors";
import { UpdateError } from "./tool/error/update-error";
import { GetEvent } from "./tool/event/get-event";
import { GetEventDetailsFromDashboardUrl } from "./tool/event/get-event-details-from-dashboard-url";
import { ListErrorEvents } from "./tool/event/list-error-events";
import { GetNetworkEndpointGroupings } from "./tool/performance/get-network-endpoint-groupings";
import { GetSpanGroup } from "./tool/performance/get-span-group";
import { GetTrace } from "./tool/performance/get-trace";
import { ListSpanGroups } from "./tool/performance/list-span-groups";
import { ListSpans } from "./tool/performance/list-spans";
import { ListTraceFields } from "./tool/performance/list-trace-fields";
import { SetNetworkEndpointGroupings } from "./tool/performance/set-network-endpoint-groupings";
import { GetCurrentProject } from "./tool/project/get-current-project";
import { ListProjectEventFilters } from "./tool/project/list-project-event-filters";
import { ListProjects } from "./tool/project/list-projects";
import { GetBuild } from "./tool/release/get-build";
import { GetRelease } from "./tool/release/get-release";
import { ListReleases } from "./tool/release/list-releases";

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
  auth_token: z.string().describe("BugSnag personal access token"),
  project_api_key: z.string().describe("BugSnag project API key").optional(),
  endpoint: z.string().url().describe("BugSnag endpoint URL").optional(),
});

export class BugsnagClient implements Client {
  private cache?: CacheService;
  private _projectApiKey?: string;
  private _isConfigured: boolean = false;
  private _currentUserApi: CurrentUserAPI | undefined;
  private _errorsApi: ErrorAPI | undefined;
  private _projectApi: ProjectAPI | undefined;
  private _appEndpoint: string | undefined;
  private _authToken?: string;

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
  capabilityPrefix = "bugsnag";
  configPrefix = "Bugsnag";
  config = ConfigurationSchema;
  defaultToolsets = ["Projects"];

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
    this._projectApiKey = config.project_api_key;
    this._authToken = config.auth_token;

    // Initialize APIs even if auth_token is missing, to allow request-level auth
    await this.initializeApis(config);
  }

  getAuthToken(): string | null {
    const contextHeader = getRequestHeader("Bugsnag-Auth-Token");
    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle token prefix if present
      if (token.startsWith("token ")) {
        token = token.substring(6);
      }

      return `token ${token}`;
    }

    // Fall back to Authorization header (used by OAuth flow)
    const bearerToken = this.getBearerToken();
    if (bearerToken) {
      return bearerToken;
    }

    // Fall back to configured token (needs prefix for Authorization header)
    return this._authToken ? `token ${this._authToken}` : null;
  }

  getBearerToken(): string | null {
    const contextHeader = getRequestHeader("Authorization");

    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle Bearer prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.substring(7);
      }

      return `Bearer ${token}`;
    }

    return null;
  }

  private async initializeApis(config: z.infer<typeof ConfigurationSchema>) {
    const apiConfig = new Configuration({
      apiKey: (_name: string) => {
        const authToken = this.getAuthToken();
        if (authToken) {
          return authToken;
        }

        throw new Error(
          "Authentication token not found in request headers or configuration",
        );
      },
      headers: {
        "User-Agent": getUserAgent(),
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
    this._isConfigured = true;
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

  async getEvent(eventId: string, projectId?: string): Promise<any> {
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
    const tools = [
      new GetCurrentProject(this),
      new ListProjects(this),
      new ListProjectEventFilters(this),
      new GetError(this),
      new ListProjectErrors(this),
      new UpdateError(this, getInput),
      new ListErrorComments(this),
      new CreateErrorComment(this),
      new GetEvent(this),
      new GetEventDetailsFromDashboardUrl(this),
      new ListErrorEvents(this),
      new ListReleases(this),
      new GetRelease(this),
      new GetBuild(this),
      new ListSpanGroups(this),
      new GetSpanGroup(this),
      new ListSpans(this),
      new GetTrace(this),
      new ListTraceFields(this),
      new GetNetworkEndpointGroupings(this),
      new SetNetworkEndpointGroupings(this),
    ];

    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }

  async registerResources(register: RegisterResourceFunction): Promise<void> {
    register(
      {
        title: "Event",
        path: "{id}",
        description: "Retrieve a specific event by its ID.",
      },
      async (uri, variables, _extra) => {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(await this.getEvent(variables.id as string)),
            },
          ],
        };
      },
    );
  }
}
