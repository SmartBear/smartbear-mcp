import { z } from "zod";

import type { CacheService } from "../common/cache.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type { SmartBearMcpServer } from "../common/server.js";
import {
  type Client,
  type GetInputFunction,
  type RegisterResourceFunction,
  type RegisterToolsFunction,
  ToolError,
} from "../common/types.js";
import {
  type Build,
  Configuration,
  CurrentUserAPI,
  ErrorAPI,
  type EventField,
  type Organization,
  ErrorUpdateRequest,
  type Project,
  ProjectAPI,
  type Release,
  type PerformanceFilter,
  type ProjectPerformanceScoreOverview
} from "./client/api/index.js";
import { type FilterObject, toUrlSearchParams } from "./client/filters.js";
import { toolInputParameters } from "./input-schemas.js";
  
const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

const cacheKeys = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  CURRENT_PROJECT: "bugsnag_current_project",
  CURRENT_PROJECT_EVENT_FILTERS: "bugsnag_current_project_event_filters",
};

// Exclude certain event fields from the project event filters to improve agent usage
const EXCLUDED_EVENT_FIELDS = new Set([
  "search", // This is searches multiple fields and is more a convenience for humans, we're removing to avoid over-matching
]);

const PERMITTED_UPDATE_OPERATIONS = [
  "override_severity",
  "open",
  "fix",
  "ignore",
  "discard",
  "undiscard",
] as const;

interface StabilityData {
  userStability: number;
  sessionStability: number;
  stabilityTargetType: string;
  targetStability: number;
  criticalStability: number;
  meetsTargetStability: boolean;
  meetsCriticalStability: boolean;
}

const ConfigurationSchema = z.object({
  auth_token: z.string().describe("BugSnag personal authentication token"),
  project_api_key: z.string().describe("BugSnag project API key").optional(),
  endpoint: z.string().url().describe("BugSnag endpoint URL").optional(),
});

export class BugsnagClient implements Client {
  private cache?: CacheService;
  private projectApiKey?: string;
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
  ): Promise<boolean> {
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
    this.projectApiKey = config.project_api_key;

    // Trigger caching of org and projects
    try {
      await this.getProjects();
    } catch (error) {
      // Swallow auth errors here to allow the tools to be registered for visibility, even if the token is invalid
      console.error(
        "Unable to connect to BugSnag APIs, the BugSnag tools will not work. Check your configured BugSnag auth token.",
        error,
      );
    }
    if (this.projectApiKey) {
      let currentProject = null;
      try {
        currentProject = await this.getCurrentProject();
      } catch (error) {
        console.error(
          "An error occurred while fetching project information",
          error,
        );
      }
      if (!currentProject) {
        // Clear the project API key to allow tools to work across all projects
        this.projectApiKey = undefined;
        console.error(
          "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. " +
            "Check your configured BugSnag project API key.",
        );
      }
    }
    return true;
  }

  getHost(apiKey: string | undefined, subdomain: string): string {
    if (apiKey?.startsWith(HUB_PREFIX)) {
      return `https://${subdomain}.${HUB_DOMAIN}`;
    } else {
      return `https://${subdomain}.${DEFAULT_DOMAIN}`;
    }
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
    if (!project && this.projectApiKey) {
      const projects = await this.getProjects();
      project =
        projects.find((p: Project) => p.apiKey === this.projectApiKey) ?? null;
      this.cache?.set(cacheKeys.CURRENT_PROJECT, project);
      if (project) {
        this.cache?.set(
          cacheKeys.CURRENT_PROJECT_EVENT_FILTERS,
          await this.getProjectEventFilters(project),
        );
      }
    }
    return project;
  }

  async getProjectEventFilters(project: Project): Promise<EventField[]> {
    let filtersResponse = (
      await this.projectApi.listProjectEventFields(project.id)
    ).body;
    if (!filtersResponse || filtersResponse.length === 0) {
      throw new ToolError(`No event fields found for project ${project.name}.`);
    }
    filtersResponse = filtersResponse.filter(
      (field) => field.displayId && !EXCLUDED_EVENT_FIELDS.has(field.displayId),
    );
    return filtersResponse;
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

  private async getInputProject(
    projectId?: unknown | string,
  ): Promise<Project> {
    if (typeof projectId === "string") {
      const maybeProject = await this.getProject(projectId);
      if (!maybeProject) {
        throw new ToolError(`Project with ID ${projectId} not found.`);
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

  private addStabilityData<T extends Release | Build>(
    source: T,
    project: Project,
  ): T & StabilityData {
    const accumulativeDailyUsersSeen = source.accumulativeDailyUsersSeen || 0;
    const accumulativeDailyUsersWithUnhandled =
      source.accumulativeDailyUsersWithUnhandled || 0;

    const userStability =
      accumulativeDailyUsersSeen === 0 // avoid division by zero
        ? 0
        : (accumulativeDailyUsersSeen - accumulativeDailyUsersWithUnhandled) /
          accumulativeDailyUsersSeen;

    const totalSessionsCount = source.totalSessionsCount || 0;
    const unhandledSessionsCount = source.unhandledSessionsCount || 0;

    const sessionStability =
      totalSessionsCount === 0 // avoid division by zero
        ? 0
        : (totalSessionsCount - unhandledSessionsCount) / totalSessionsCount;

    const stabilityMetric =
      project.stabilityTargetType === "user" ? userStability : sessionStability;

    const targetStability = project.targetStability?.value || 0;
    const criticalStability = project.criticalStability?.value || 0;

    const meetsTargetStability = stabilityMetric >= targetStability;
    const meetsCriticalStability = stabilityMetric >= criticalStability;

    return {
      ...source,
      userStability,
      sessionStability,
      stabilityTargetType: project.stabilityTargetType || "user",
      targetStability,
      criticalStability,
      meetsTargetStability,
      meetsCriticalStability,
    };
  }

  /**
   * Get performance score overview for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param releaseStageName Optional release stage name filter
   * @returns Promise resolving to the performance score overview
   */
  async getProjectPerformanceScore(
    projectId?: string,
    releaseStageName?: string,
  ): Promise<ProjectPerformanceScoreOverview> {
    const project = await this.getInputProject(projectId);
    return (
      await this.projectApi.getProjectPerformanceScoreOverview(
        project.id,
        releaseStageName,
      )
    ).body;
  }

  /**
   * List span groups for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the list of span groups
   */
  async listSpanGroups(
    projectId?: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    offset?: number,
    filters?: Array<PerformanceFilter>,
    starredOnly?: boolean,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.listProjectSpanGroups(
      project.id,
      sort,
      direction,
      perPage,
      offset,
      filters,
      starredOnly,
      nextUrl,
    );
  }

  /**
   * Get a specific span group
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param spanGroupId ID of the span group
   * @param filters Optional performance filters
   * @returns Promise resolving to the span group
   */
  async getSpanGroup(
    projectId?: string,
    spanGroupId?: string,
    filters?: Array<PerformanceFilter>,
  ) {
    const project = await this.getInputProject(projectId);
    if (!spanGroupId) {
      throw new ToolError("spanGroupId is required");
    }
    return await this.projectApi.getProjectSpanGroup(
      project.id,
      spanGroupId,
      filters,
    );
  }

  /**
   * List span group summaries for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the list of span group summaries
   */
  async listSpanGroupSummaries(
    projectId?: string,
    perPage?: number,
    offset?: number,
    filters?: Array<PerformanceFilter>,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.listProjectSpanGroupSummaries(
      project.id,
      perPage,
      offset,
      filters,
      nextUrl,
    );
  }

  /**
   * Get timeline for a span group
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param spanGroupId ID of the span group
   * @param filters Optional performance filters
   * @returns Promise resolving to the span group timeline
   */
  async getSpanGroupTimeline(
    projectId?: string,
    spanGroupId?: string,
    filters?: Array<PerformanceFilter>,
  ) {
    const project = await this.getInputProject(projectId);
    if (!spanGroupId) {
      throw new ToolError("spanGroupId is required");
    }
    return await this.projectApi.getProjectSpanGroupTimeline(
      project.id,
      spanGroupId,
      filters,
    );
  }

  /**
   * Get distribution for a span group
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param spanGroupId ID of the span group
   * @param filters Optional performance filters
   * @returns Promise resolving to the span group distribution
   */
  async getSpanGroupDistribution(
    projectId?: string,
    spanGroupId?: string,
    filters?: Array<PerformanceFilter>,
  ) {
    const project = await this.getInputProject(projectId);
    if (!spanGroupId) {
      throw new ToolError("spanGroupId is required");
    }
    return await this.projectApi.getProjectSpanGroupDistribution(
      project.id,
      spanGroupId,
      filters,
    );
  }

  /**
   * List starred span groups for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the list of starred span groups
   */
  async listStarredSpanGroups(
    projectId?: string,
    categories?: Array<string>,
    perPage?: number,
    offset?: number,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.listProjectStarredSpanGroups(
      project.id,
      categories,
      perPage,
      offset,
      nextUrl,
    );
  }

  /**
   * List performance targets for a span group
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param spanGroupId ID of the span group
   * @returns Promise resolving to the list of performance targets
   */
  async listSpanGroupPerformanceTargets(
    projectId?: string,
    spanGroupId?: string,
  ) {
    const project = await this.getInputProject(projectId);
    if (!spanGroupId) {
      throw new ToolError("spanGroupId is required");
    }
    return await this.projectApi.listProjectSpanGroupPerformanceTargets(
      project.id,
      spanGroupId,
    );
  }

  /**
   * Get spans by category and name
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param category Span category
   * @param name Span name
   * @returns Promise resolving to the spans
   */
  async getSpansByCategoryAndName(
    projectId?: string,
    category?: string,
    name?: string,
  ) {
    const project = await this.getInputProject(projectId);
    if (!category || !name) {
      throw new ToolError("category and name are required");
    }
    return await this.projectApi.getSpansByCategoryAndName(
      project.id,
      category,
      name,
    );
  }

  /**
   * List spans by span group ID
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param spanGroupId ID of the span group
   * @returns Promise resolving to the list of spans
   */
  async listSpansBySpanGroupId(
    projectId?: string,
    spanGroupId?: string,
    filters?: Array<PerformanceFilter>,
    sort?: string,
    direction?: string,
    perPage?: number,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    if (!spanGroupId) {
      throw new ToolError("spanGroupId is required");
    }
    return await this.projectApi.listSpansBySpanGroupId(
      project.id,
      spanGroupId,
      filters,
      sort,
      direction,
      perPage,
      nextUrl,
    );
  }

  /**
   * List spans by trace ID
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param traceId Trace ID
   * @param from Start time
   * @param to End time
   * @returns Promise resolving to the list of spans
   */
  async listSpansByTraceId(
    projectId?: string,
    traceId?: string,
    from?: string,
    to?: string,
    targetSpanId?: string,
    perPage?: number,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    if (!traceId || !from || !to) {
      throw new ToolError("traceId, from, and to are required");
    }
    return await this.projectApi.listSpansByTraceId(
      project.id,
      traceId,
      from,
      to,
      targetSpanId,
      perPage,
      nextUrl,
    );
  }

  /**
   * List page load span groups for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the list of page load span groups
   */
  async listPageLoadSpanGroups(
    projectId?: string,
    sort?: string,
    direction?: string,
    perPage?: number,
    offset?: number,
    filters?: Array<PerformanceFilter>,
    starredOnly?: boolean,
    nextUrl?: string,
  ) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.listProjectPageLoadSpanGroups(
      project.id,
      sort,
      direction,
      perPage,
      offset,
      filters,
      starredOnly,
      nextUrl,
    );
  }

  /**
   * Get a page load span group by ID
   * @param projectId Optional project ID (uses configured project if omitted)
   * @param pageLoadSpanGroupId ID of the page load span group
   * @returns Promise resolving to the page load span group
   */
  async getPageLoadSpanGroupById(
    projectId?: string,
    pageLoadSpanGroupId?: string,
    filters?: Array<PerformanceFilter>,
  ) {
    const project = await this.getInputProject(projectId);
    if (!pageLoadSpanGroupId) {
      throw new ToolError("pageLoadSpanGroupId is required");
    }
    return await this.projectApi.getProjectPageLoadSpanGroupById(
      project.id,
      pageLoadSpanGroupId,
      filters,
    );
  }

  /**
   * List trace fields for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the list of trace fields
   */
  async listTraceFields(projectId?: string) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.listProjectTraceFields(project.id);
  }

  /**
   * Get network grouping ruleset for a project
   * @param projectId Optional project ID (uses configured project if omitted)
   * @returns Promise resolving to the network grouping ruleset
   */
  async getNetworkGroupingRuleset(projectId?: string) {
    const project = await this.getInputProject(projectId);
    return await this.projectApi.getProjectNetworkGroupingRuleset(project.id);
  }

  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void {
    if (!this.projectApiKey) {
      const listProjectsInputSchema = z.object({
        perPage: toolInputParameters.perPage,
        page: toolInputParameters.page,
      });
      register(
        {
          title: "List Projects",
          summary:
            "List all projects in the organization with optional pagination",
          purpose:
            "Retrieve available projects for browsing and selecting which project to analyze",
          useCases: [
            "Browse available projects when no specific project API key is configured",
            "Find project IDs needed for other tools",
            "Get an overview of all projects in the organization",
          ],
          inputSchema: listProjectsInputSchema,
          examples: [
            {
              description: "Get first 10 projects",
              parameters: {
                perPage: 10,
                page: 1,
              },
              expectedOutput:
                "JSON array of project objects with IDs, names, and metadata",
            },
            {
              description: "Get all projects (no pagination)",
              parameters: {},
              expectedOutput: "JSON array of all available projects",
            },
          ],
          hints: [
            "Use pagination for organizations with many projects to avoid large responses",
            "Project IDs from this list can be used with other tools when no project API key is configured",
          ],
        },
        async (args, _extra) => {
          const params = listProjectsInputSchema.parse(args);
          let projects = await this.getProjects();
          if (!projects || projects.length === 0) {
            return {
              content: [{ type: "text", text: "No projects found." }],
            };
          }
          if (params.perPage || params.page) {
            const perPage = params.perPage;
            const page = params.page;
            projects = projects.slice((page - 1) * perPage, page * perPage);
          }

          const result = {
            data: projects,
            count: projects.length,
          };
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        },
      );
    }

    const getErrorInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      errorId: toolInputParameters.errorId.describe(
        "Unique identifier of the error to retrieve",
      ),
      filters: toolInputParameters.filters.describe(
        "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
          "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
      ),
    });

    register(
      {
        title: "Get Error",
        summary:
          "Get full details on an error, including aggregated and summarized data across all events (occurrences) and details of the latest event (occurrence), such as breadcrumbs, metadata and the stacktrace. Use the filters parameter to narrow down the summaries further.",
        purpose:
          "Retrieve all the information required on a specified error to understand who it is affecting and why.",
        useCases: [
          "Investigate a specific error found through the List Project Errors tool",
          "Understand which types of user are affected by the error using summarized event data",
          "Get error details for debugging and root cause analysis",
          "Retrieve error metadata for incident reports and documentation",
        ],
        inputSchema: getErrorInputSchema,
        outputDescription:
          "JSON object containing: " +
          " - error_details: Aggregated data about the error, including first and last seen occurrence" +
          " - latest_event: Detailed information about the most recent occurrence of the error, including stacktrace, breadcrumbs, user and context" +
          " - pivots: List of pivots (summaries) for the error, which can be used to analyze patterns in occurrences" +
          " - url: A link to the error in the dashboard - this should be shown to the user for them to perform further analysis",
        examples: [
          {
            description: "Get details for a specific error",
            parameters: {
              errorId: "6863e2af8c857c0a5023b411",
            },
            expectedOutput:
              "JSON object with error details including message, stack trace, occurrence count, and metadata",
          },
        ],
        hints: [
          "Error IDs can be found using the List Project Errors tool",
          "Use this after filtering errors to get detailed information about specific errors",
          "If you used a filter to get this error, you can pass the same filters here to restrict the results or apply further filters",
          "The URL provided in the response points should be shown to the user in all cases as it allows them to view the error in the dashboard and perform further analysis",
        ],
      },
      async (args, _extra) => {
        const params = getErrorInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const errorDetails = (
          await this.errorsApi.viewErrorOnProject(project.id, params.errorId)
        ).body;
        if (!errorDetails) {
          throw new ToolError(
            `Error with ID ${params.errorId} not found in project ${project.id}.`,
          );
        }

        const filters: FilterObject = {
          error: [{ type: "eq", value: params.errorId }],
          ...args.filters,
        };

        // Get the latest event for this error using the events endpoint with filters
        let latestEvent = null;
        try {
          const latestEvents = (
            await this.errorsApi.listEventsOnProject(
              project.id,
              null,
              "timestamp",
              "desc",
              1,
              filters,
              true,
            )
          ).body;
          if (latestEvents && latestEvents.length > 0) {
            latestEvent = latestEvents[0];
          }
        } catch (e) {
          console.warn("Failed to fetch latest event:", e);
          // Continue without latest event rather than failing the entire request
        }

        const content = {
          error_details: errorDetails,
          latest_event: latestEvent,
          pivots:
            (
              await this.errorsApi.getPivotValuesOnAnError(
                project.id,
                args.errorId,
                filters,
                5,
              )
            ).body || [],
          url: await this.getErrorUrl(
            project,
            args.errorId,
            toUrlSearchParams(filters).toString(),
          ),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(content) }],
        };
      },
    );

    const getEventDetailsInputSchema = z.object({
      link: z
        .string()
        .describe(
          "Full URL to the event details page in the BugSnag dashboard (web interface), containing project slug and event_id parameter.",
        ),
    });

    register(
      {
        title: "Get Event Details",
        summary:
          "Get detailed information about a specific event using its dashboard URL",
        purpose:
          "Retrieve event details directly from a dashboard URL for quick debugging",
        useCases: [
          "Get event details when given a dashboard URL from a user or notification",
          "Extract event information from shared links or browser URLs",
          "Quick lookup of event details without needing separate project and event IDs",
        ],
        inputSchema: getEventDetailsInputSchema,
        examples: [
          {
            description: "Get event details from a dashboard URL",
            parameters: {
              link: "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000",
            },
            expectedOutput:
              "JSON object with complete event details including stack trace, metadata, and context",
          },
        ],
        hints: [
          "The URL must contain both project slug in the path and event_id in query parameters",
          "This is useful when users share BugSnag dashboard URLs and you need to extract the event data",
        ],
      },
      async (args, _extra) => {
        const params = getEventDetailsInputSchema.parse(args);
        const url = new URL(params.link);
        const eventId = url.searchParams.get("event_id");
        const projectSlug = url.pathname.split("/")[2];
        if (!projectSlug || !eventId)
          throw new ToolError(
            "Both projectSlug and eventId must be present in the link",
          );

        // get the project id from list of projects
        const projects = await this.getProjects();
        const projectId = projects.find((p: any) => p.slug === projectSlug)?.id;
        if (!projectId) {
          throw new ToolError("Project with the specified slug not found.");
        }

        const response = await this.getEvent(eventId, projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

    const listProjectErrorsInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      filters: toolInputParameters.filters.describe(
        "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
          "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
      ),
      sort: toolInputParameters.sort,
      direction: toolInputParameters.direction,
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
    });

    register(
      {
        title: "List Project Errors",
        summary:
          "List and search errors in a project using customizable filters and pagination",
        purpose:
          "Retrieve filtered list of errors from a project for analysis, debugging, and reporting",
        useCases: [
          "Debug recent application errors by filtering for open errors in the last 7 days",
          "Generate error reports for stakeholders by filtering specific error types or severity levels",
          "Monitor error trends over time using date range filters",
          "Find errors affecting specific users or environments using metadata filters",
        ],
        inputSchema: listProjectErrorsInputSchema,
        examples: [
          {
            description:
              "Find errors affecting a specific user in the last 24 hours",
            parameters: {
              filters: {
                "user.email": [{ type: "eq", value: "user@example.com" }],
                "event.since": [{ type: "eq", value: "24h" }],
              },
            },
            expectedOutput:
              "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field",
          },
          {
            description:
              "Get the 10 open errors with the most users affected in the last 30 days",
            parameters: {
              filters: {
                "event.since": [{ type: "eq", value: "30d" }],
                "error.status": [{ type: "eq", value: "open" }],
              },
              sort: "users",
              direction: "desc",
              perPage: 10,
            },
            expectedOutput:
              "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field",
          },
          {
            description: "Get the next 50 results",
            parameters: {
              nextUrl:
                "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?base=2025-08-29T13%3A11%3A37Z&direction=desc&filters%5Berror.status%5D%5B%5D%5Btype%5D=eq&filters%5Berror.status%5D%5B%5D%5Bvalue%5D=open&offset=10&per_page=10&sort=users",
              perPage: 50,
            },
            expectedOutput:
              "JSON object with a list of errors, with a URL to the next page if more results are available and a total count of all errors matched",
          },
        ],
        hints: [
          "Use list_project_event_filters tool first to discover valid filter field names for your project",
          "Combine multiple filters to narrow results - filters are applied with AND logic",
          "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
          "Common time filters: event.since (from this time), event.before (until this time)",
          "The 'event.since' filter and 'error.status' filters are always applied and if not specified are set to '30d' and 'open' respectively",
          "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors",
          "This tool returns paged results. The 'page_error_count' field indicates the number of results returned in the current page, and the 'total_error_count' field indicates the total number of results across all pages.",
          "If the output contains a 'next_url' value, there are more results available - call this tool again supplying the next URL as a parameter to retrieve the next page.",
          "Do not modify the next URL as this can cause incorrect results. The only other parameter that can be used with 'next' is 'per_page' to control the page size.",
        ],
      },
      async (args, _extra) => {
        const params = listProjectErrorsInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);

        // Validate filter keys against cached event fields
        if (params.filters) {
          const eventFields =
            this.cache?.get<EventField[]>(
              cacheKeys.CURRENT_PROJECT_EVENT_FILTERS,
            ) || [];
          const validKeys = new Set(eventFields.map((f) => f.displayId));
          for (const key of Object.keys(params.filters)) {
            if (!validKeys.has(key)) {
              throw new ToolError(`Invalid filter key: ${key}`);
            }
          }
        }

        const filters: FilterObject = {
          "event.since": [{ type: "eq", value: "30d" }],
          "error.status": [{ type: "eq", value: "open" }],
          ...params.filters,
        };

        const response = await this.errorsApi.listProjectErrors(
          project.id,
          null,
          params.sort,
          params.direction,
          params.perPage,
          filters,
          params.nextUrl,
        );

        const result = {
          data: response.body,
          next_url: response.nextUrl ?? undefined,
          data_count: response.body?.length,
          total_count: response.totalCount ?? undefined,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    register(
      {
        title: "List Project Event Filters",
        summary: "Get available event filter fields for the current project",
        purpose:
          "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
        useCases: [
          "Discover what filter fields are available before searching for errors",
          "Find the correct field names for filtering by user, environment, or custom metadata",
          "Understand filter options and data types for building complex queries",
        ],
        inputSchema: z.object({}),
        examples: [
          {
            description: "Get all available filter fields",
            parameters: {},
            expectedOutput:
              "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options",
          },
        ],
        hints: [
          "Use this tool before the List Errors or Get Error tools to understand available filters",
          "Look for display_id field in the response - these are the field names to use in filters",
        ],
      },
      async (_args, _extra) => {
        const projectFields = this.cache?.get<EventField[]>(
          cacheKeys.CURRENT_PROJECT_EVENT_FILTERS,
        );
        if (!projectFields)
          throw new ToolError("No event filters found in cache.");

        return {
          content: [{ type: "text", text: JSON.stringify(projectFields) }],
        };
      },
    );

    const updateErrorInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      errorId: toolInputParameters.errorId,
      operation: z
        .enum(PERMITTED_UPDATE_OPERATIONS)
        .describe("The operation to apply to the error"),
    });

    register(
      {
        title: "Update Error",
        summary: "Update the status of an error",
        purpose:
          "Change an error's workflow state, such as marking it as resolved or ignored",
        useCases: [
          "Mark an error as open, fixed or ignored",
          "Discard or un-discard an error",
          "Update the severity of an error",
        ],
        inputSchema: this.projectApiKey
          ? updateErrorInputSchema.omit({ projectId: true })
          : updateErrorInputSchema,
        examples: [
          {
            description: "Mark an error as fixed",
            parameters: {
              errorId: "6863e2af8c857c0a5023b411",
              operation: "fix",
            },
            expectedOutput:
              "Success response indicating the error was marked as fixed",
          },
        ],
        hints: [
          "Only use valid operations - BugSnag may reject invalid values",
        ],
        readOnly: false,
        idempotent: false,
      },
      async (args, _extra) => {
        const params = updateErrorInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);

        let severity: any;
        if (params.operation === "override_severity") {
          // illicit the severity from the user
          const result = await getInput({
            message:
              "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
            requestedSchema: {
              type: "object",
              properties: {
                severity: {
                  type: "string",
                  enum: ["info", "warning", "error"],
                  description: "The new severity level for the error",
                },
              },
            },
            required: ["severity"],
          });

          if (result.action === "accept" && result.content?.severity) {
            severity = result.content.severity;
          }
        }

        const result = await this.errorsApi.updateErrorOnProject(
          project.id,
          params.errorId,
          {
            operation: Object.values(ErrorUpdateRequest.OperationEnum).find(
              (value) => value === params.operation,
            ) as ErrorUpdateRequest.OperationEnum,
            severity: severity,
          },
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: result.status === 200 || result.status === 204,
              }),
            },
          ],
        };
      },
    );

    const listReleasesInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      releaseStage: toolInputParameters.releaseStage,
      visibleOnly: z
        .boolean()
        .describe(
          "Whether to only include releases that are marked as visible in the dashboard",
        )
        .default(false),
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
    });

    register(
      {
        title: "List Releases",
        summary: "List releases for a project",
        purpose:
          "Retrieve a list of release summaries to analyze deployment history and associated errors",
        useCases: [
          "View recent releases to correlate with error spikes",
          "Filter releases by stage (e.g. production, staging) for targeted analysis",
        ],
        inputSchema: listReleasesInputSchema,
        examples: [
          {
            description: "List production releases for a project",
            parameters: {},
            expectedOutput:
              "JSON array of release objects in the production stage",
          },
          {
            description: "List staging releases for a project",
            parameters: {
              releaseStage: "staging",
            },
            expectedOutput:
              "JSON array of release objects in the staging stage",
          },
          {
            description: "Get the next page of results",
            parameters: {
              nextUrl:
                "/projects/515fb9337c1074f6fd000003/releases?offset=30&per_page=30",
            },
            expectedOutput:
              "JSON array of release objects with metadata from the next page",
          },
        ],
        hints: [
          "Use the Get Release tool to get more details on a specific release, including the builds it contains",
          "The release stage defaults to 'production' if not specified",
          "Use visibleOnly to filter out releases that have been marked as hidden in the dashboard",
        ],
        readOnly: true,
        idempotent: true,
        outputDescription:
          "JSON array of release summary objects with metadata, with a URL to the next page if more results are available",
      },
      async (args, _extra) => {
        const params = listReleasesInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const response = await this.projectApi.listProjectReleaseGroups(
          project.id,
          params.releaseStage,
          false, // Not top-only
          params.visibleOnly,
          params.perPage,
          params.nextUrl,
        );

        let releases: (Release & StabilityData)[] = [];
        if (response.body) {
          releases = response.body.map((r) =>
            this.addStabilityData(r, project),
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: releases,
                next_url: response.nextUrl ?? undefined,
                data_count: releases.length,
                total_count: response.totalCount ?? undefined,
              }),
            },
          ],
        };
      },
    );

    const getReleaseInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      releaseId: toolInputParameters.releaseId,
    });

    register(
      {
        title: "Get Release",
        summary:
          "Get more details for a specific release by its ID, including source control information and associated builds",
        purpose:
          "Retrieve detailed information about a release for analysis and debugging",
        useCases: [
          "View release metadata such as version, source control info, and error counts",
          "Analyze the stability data and targets for a release",
          "See the builds that make up the release",
        ],
        inputSchema: getReleaseInputSchema,
        examples: [
          {
            description: "Get details for a specific release",
            parameters: {
              releaseId: "5f8d0d55c9e77c0017a1b2c3",
            },
            expectedOutput:
              "JSON object with release details including version, source control info, error counts and stability data.",
          },
        ],
        hints: ["Release IDs can be found using the List releases tool"],
        readOnly: true,
        idempotent: true,
        outputDescription:
          "JSON object containing release details along with stability metrics such as user and session stability, and whether it meets project targets",
      },
      async (args, _extra) => {
        const params = getReleaseInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const releaseResponse = await this.projectApi.getReleaseGroup(
          params.releaseId,
        );
        if (!releaseResponse.body)
          throw new ToolError(`No release for ${params.releaseId} found.`);
        const release = this.addStabilityData(releaseResponse.body, project);
        let builds: (Build & StabilityData)[] = [];
        if (releaseResponse.body) {
          const buildsResponse = await this.projectApi.listBuildsInRelease(
            params.releaseId,
          );
          if (buildsResponse.body) {
            builds = buildsResponse.body.map((b) =>
              this.addStabilityData(b, project),
            );
          }
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                release: release,
                builds: builds,
              }),
            },
          ],
        };
      },
    );

    const getBuildInputSchema = z.object({
      projectId: this.projectApiKey
        ? toolInputParameters.projectId.optional()
        : toolInputParameters.projectId,
      buildId: toolInputParameters.buildId,
    });

    register(
      {
        title: "Get Build",
        summary: "Get more details for a specific build by its ID",
        purpose:
          "Retrieve detailed information about a build for analysis and debugging",
        useCases: [
          "View build metadata such as version, source control info, and error counts",
          "Analyze a specific build to correlate with error spikes or deployments",
          "See the stability targets for a project and if the build meets them",
        ],
        inputSchema: getBuildInputSchema,
        examples: [
          {
            description: "Get details for a specific build",
            parameters: {
              buildId: "5f8d0d55c9e77c0017a1b2c3",
            },
            expectedOutput:
              "JSON object with build details including version, source control info, error counts and stability data.",
          },
        ],
        hints: ["Build IDs can be found using the List builds tool"],
        readOnly: true,
        idempotent: true,
        outputDescription:
          "JSON object containing build details along with stability metrics such as user and session stability, and whether it meets project targets",
      },
      async (args, _extra) => {
        const params = getBuildInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const response = await this.projectApi.getProjectReleaseById(
          project.id,
          params.buildId,
        );

        if (!response.body)
          throw new ToolError(`No build for ${params.buildId} found.`);
        const build = this.addStabilityData(response.body, project);
        return {
          content: [{ type: "text", text: JSON.stringify(build) }],
        };
      },
    );

    // ============================================================
    // Performance Monitoring Tools
    // ============================================================

    // 1. Performance Overview
    register(
      {
        title: "Get Performance Score Overview",
        summary: "Get the overall performance score and timeline for a project",
        purpose:
          "Monitor and analyze application performance metrics over time",
        useCases: [
          "View current performance score to assess app health",
          "Track performance trends over time using the timeline",
          "Filter performance data by release stage (e.g., production, staging)",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project to query",
                  required: true,
                },
              ]),
          {
            name: "releaseStageName",
            type: z.string().optional(),
            description: "Release stage to filter by",
            required: false,
            examples: ["production", "staging", "development"],
          },
        ],
        examples: [
          {
            description: "Get performance score for production",
            parameters: { releaseStageName: "production" },
            expectedOutput:
              "Performance score (0.0-1.0), span count, and timeline data",
          },
        ],
        hints: [
          "Performance score ranges from 0.0 (worst) to 1.0 (best)",
          "Timeline shows historical performance trends",
          "Filter by release stage to isolate specific environments",
        ],
      },
      async (args, _extra) => {
        const result = await this.getProjectPerformanceScore(
          args.projectId,
          args.releaseStageName,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    // 2. List Span Groups
    register(
      {
        title: "List Span Groups",
        summary:
          "List span groups (operations) tracked for performance monitoring",
        purpose: "Discover and analyze different operations being monitored",
        useCases: [
          "View all operations being tracked for performance",
          "Find slow operations by sorting by duration metrics",
          "Filter to starred/important span groups",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "sort",
            type: z.string().optional(),
            description: "Field to sort by",
            required: false,
            examples: ["displayName", "p50", "p95", "spanCount"],
          },
          {
            name: "direction",
            type: z.enum(["asc", "desc"]).optional(),
            description: "Sort direction",
            required: false,
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "starredOnly",
            type: z.boolean().optional(),
            description: "Show only starred span groups",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "List slowest operations",
            parameters: { sort: "p95", direction: "desc", perPage: 10 },
            expectedOutput:
              "Array of span groups sorted by 95th percentile duration",
          },
        ],
        hints: [
          "Span groups represent different operation types (page loads, API calls, etc.)",
          "Use sort by p95 or p99 to find the slowest operations",
          "Star important span groups for quick access",
          "Use nextUrl for pagination",
        ],
      },
      async (args, _extra) => {
        const result = await this.listSpanGroups(
          args.projectId,
          args.sort,
          args.direction,
          args.perPage,
          undefined,
          args.filters,
          args.starredOnly,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 3. Show Span Group
    register(
      {
        title: "Show Span Group",
        summary: "Get detailed performance metrics for a specific span group",
        purpose: "Analyze performance characteristics of a specific operation",
        useCases: [
          "View detailed statistics (p50, p75, p90, p95, p99) for an operation",
          "Check if performance targets are configured",
          "Monitor span count to understand operation volume",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "spanGroupId",
            type: z.string(),
            description:
              "ID of the span group (will be URL-encoded automatically)",
            required: true,
            examples: ["[HttpClient]GET-api.example.com"],
          },
        ],
        examples: [
          {
            description: "Get details for an API endpoint span group",
            parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
            expectedOutput: "Statistics, category, and performance target info",
          },
        ],
        hints: [
          "Use List Span Groups first to discover available span group IDs",
          "IDs are automatically URL-encoded - provide the raw ID",
          "Statistics include p50, p75, p90, p95, p99 percentiles",
        ],
      },
      async (args, _extra) => {
        if (!args.spanGroupId) {
          throw new ToolError("spanGroupId is required");
        }
        const result = await this.getSpanGroup(
          args.projectId,
          args.spanGroupId,
          args.filters,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 4. List Span Group Summaries
    register(
      {
        title: "List Span Group Summaries",
        summary: "Get a summarized list of all span groups with key metrics",
        purpose:
          "Quick overview of all operations with essential performance data",
        useCases: [
          "Get a high-level view of all monitored operations",
          "Compare performance across multiple span groups",
          "Identify operations that need attention",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "Get summary of all span groups",
            parameters: { perPage: 50 },
            expectedOutput: "Array of span group summaries with key metrics",
          },
        ],
        hints: [
          "Provides a lightweight view compared to full span group details",
          "Good for dashboards and overview pages",
        ],
      },
      async (args, _extra) => {
        const result = await this.listSpanGroupSummaries(
          args.projectId,
          args.perPage,
          undefined,
          args.filters,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 5. Get Span Group Timeline
    register(
      {
        title: "Get Span Group Timeline",
        summary: "Get performance timeline data for a span group",
        purpose: "Visualize performance trends over time for an operation",
        useCases: [
          "Track performance improvements or degradations over time",
          "Correlate performance changes with deployments",
          "Generate performance trend reports",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "spanGroupId",
            type: z.string(),
            description: "ID of the span group",
            required: true,
          },
        ],
        examples: [
          {
            description: "Get timeline for an API endpoint",
            parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
            expectedOutput:
              "Time-series data showing performance metrics over time",
          },
        ],
        hints: [
          "Timeline data includes timestamps and performance metrics",
          "Useful for identifying when performance issues started",
        ],
      },
      async (args, _extra) => {
        if (!args.spanGroupId) {
          throw new ToolError("spanGroupId is required");
        }
        const result = await this.getSpanGroupTimeline(
          args.projectId,
          args.spanGroupId,
          args.filters,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 6. Get Span Group Distribution
    register(
      {
        title: "Get Span Group Distribution",
        summary: "Get duration distribution histogram for a span group",
        purpose:
          "Understand the distribution of response times for an operation",
        useCases: [
          "Identify outliers and anomalies in response times",
          "Understand the typical range of operation durations",
          "Analyze performance consistency",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "spanGroupId",
            type: z.string(),
            description: "ID of the span group",
            required: true,
          },
        ],
        examples: [
          {
            description: "Get distribution for an operation",
            parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
            expectedOutput:
              "Histogram buckets showing count of operations at different duration ranges",
          },
        ],
        hints: [
          "Distribution shows how durations are spread across buckets",
          "Helps identify if you have bimodal or long-tail distributions",
        ],
      },
      async (args, _extra) => {
        if (!args.spanGroupId) {
          throw new ToolError("spanGroupId is required");
        }
        const result = await this.getSpanGroupDistribution(
          args.projectId,
          args.spanGroupId,
          args.filters,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 7. List Starred Span Groups
    register(
      {
        title: "List Starred Span Groups",
        summary: "List span groups that have been marked as starred/important",
        purpose:
          "Quick access to operations marked as important for monitoring",
        useCases: [
          "View critical operations that need regular monitoring",
          "Focus on high-priority performance metrics",
          "Create dashboards for key operations",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "categories",
            type: z.array(z.string()).optional(),
            description: "Filter by span categories",
            required: false,
            examples: ["HttpClient", "Database", "FullPageLoad"],
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "Get all starred span groups",
            parameters: {},
            expectedOutput: "Array of starred span groups with metrics",
          },
        ],
        hints: [
          "Star span groups in the BugSnag dashboard to mark them as important",
          "Use categories to filter by operation type",
        ],
      },
      async (args, _extra) => {
        const result = await this.listStarredSpanGroups(
          args.projectId,
          args.categories,
          args.perPage,
          undefined,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 8. List Performance Targets
    register(
      {
        title: "List Performance Targets for Span Group",
        summary:
          "Get configured performance targets/SLOs for a specific span group",
        purpose:
          "View performance targets and check if the operation is meeting them",
        useCases: [
          "Check if an operation meets its performance SLOs",
          "Review configured performance thresholds",
          "Track SLO compliance over time",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "spanGroupId",
            type: z.string(),
            description: "ID of the span group",
            required: true,
          },
        ],
        examples: [
          {
            description: "Get performance targets for an API endpoint",
            parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
            expectedOutput:
              "Array of performance targets with thresholds and current status",
          },
        ],
        hints: [
          "Performance targets are configured in the BugSnag dashboard",
          "Targets typically include thresholds for p50, p95, p99",
          "Status indicates if current performance meets the target",
        ],
      },
      async (args, _extra) => {
        if (!args.spanGroupId) {
          throw new ToolError("spanGroupId is required");
        }
        const result = await this.listSpanGroupPerformanceTargets(
          args.projectId,
          args.spanGroupId,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 9. Get Spans by Category and Name
    register(
      {
        title: "Get Spans by Category and Name",
        summary: "Get spans matching a specific category and name",
        purpose: "Find individual span instances for detailed analysis",
        useCases: [
          "Investigate specific instances of an operation",
          "Debug performance issues by examining individual traces",
          "Analyze patterns in span attributes",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "category",
            type: z.string(),
            description: "Span category (e.g., HttpClient, Database)",
            required: true,
          },
          {
            name: "name",
            type: z.string(),
            description: "Span name",
            required: true,
          },
        ],
        examples: [
          {
            description: "Get HTTP client spans for a specific endpoint",
            parameters: {
              category: "HttpClient",
              name: "GET-api.example.com",
            },
            expectedOutput:
              "Array of span instances with durations and metadata",
          },
        ],
        hints: [
          "Use List Span Groups to discover available categories and names",
          "Each span represents a single operation instance",
        ],
      },
      async (args, _extra) => {
        if (!args.category || !args.name) {
          throw new ToolError("category and name are required");
        }
        const result = await this.getSpansByCategoryAndName(
          args.projectId,
          args.category,
          args.name,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 10. List Spans by Span Group ID
    register(
      {
        title: "List Spans by Span Group ID",
        summary: "Get individual spans belonging to a span group",
        purpose: "Examine individual operation instances within a span group",
        useCases: [
          "Analyze individual slow operations",
          "Debug performance issues by examining specific traces",
          "Find patterns in operation attributes",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "spanGroupId",
            type: z.string(),
            description: "ID of the span group",
            required: true,
          },
          {
            name: "sort",
            type: z.string().optional(),
            description: "Field to sort by",
            required: false,
            examples: ["duration", "timestamp"],
          },
          {
            name: "direction",
            type: z.enum(["asc", "desc"]).optional(),
            description: "Sort direction",
            required: false,
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "Get slowest spans for an operation",
            parameters: {
              spanGroupId: "[HttpClient]GET-api.example.com",
              sort: "duration",
              direction: "desc",
              perPage: 10,
            },
            expectedOutput: "Array of the 10 slowest span instances",
          },
        ],
        hints: [
          "Sort by duration descending to find the slowest instances",
          "Each span includes trace ID for further investigation",
        ],
      },
      async (args, _extra) => {
        if (!args.spanGroupId) {
          throw new ToolError("spanGroupId is required");
        }
        const result = await this.listSpansBySpanGroupId(
          args.projectId,
          args.spanGroupId,
          args.filters,
          args.sort,
          args.direction,
          args.perPage,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 11. List Spans by Trace ID
    register(
      {
        title: "List Spans by Trace ID",
        summary: "Get all spans within a specific trace",
        purpose:
          "View the complete trace of operations for a request/transaction",
        useCases: [
          "Debug slow requests by viewing all operations in the trace",
          "Understand the flow of a request through the system",
          "Identify bottlenecks in distributed systems",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "traceId",
            type: z.string(),
            description: "Trace ID",
            required: true,
          },
          {
            name: "from",
            type: z.string(),
            description: "Start time (ISO 8601 format)",
            required: true,
            examples: ["2024-01-01T00:00:00Z"],
          },
          {
            name: "to",
            type: z.string(),
            description: "End time (ISO 8601 format)",
            required: true,
            examples: ["2024-01-01T23:59:59Z"],
          },
          {
            name: "targetSpanId",
            type: z.string().optional(),
            description: "Optional target span ID to focus on",
            required: false,
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "Get all spans for a trace",
            parameters: {
              traceId: "abc123",
              from: "2024-01-01T00:00:00Z",
              to: "2024-01-01T23:59:59Z",
            },
            expectedOutput:
              "Array of all spans in the trace with timing and hierarchy",
          },
        ],
        hints: [
          "Traces show the complete execution path of a request",
          "Use from/to parameters to narrow the time window",
          "targetSpanId can be used to focus on a specific span in the trace",
        ],
      },
      async (args, _extra) => {
        if (!args.traceId || !args.from || !args.to) {
          throw new ToolError("traceId, from, and to are required");
        }
        const result = await this.listSpansByTraceId(
          args.projectId,
          args.traceId,
          args.from,
          args.to,
          args.targetSpanId,
          args.perPage,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 12. List Page Load Span Groups
    register(
      {
        title: "List Page Load Span Groups",
        summary: "List page load operations tracked for performance monitoring",
        purpose: "Monitor and analyze web page load performance",
        useCases: [
          "View all pages being monitored for performance",
          "Find slow-loading pages",
          "Track Core Web Vitals metrics",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "sort",
            type: z.string().optional(),
            description: "Field to sort by",
            required: false,
            examples: ["displayName", "p50", "p95"],
          },
          {
            name: "direction",
            type: z.enum(["asc", "desc"]).optional(),
            description: "Sort direction",
            required: false,
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).optional(),
            description: "Results per page",
            required: false,
          },
          {
            name: "starredOnly",
            type: z.boolean().optional(),
            description: "Show only starred page loads",
            required: false,
          },
          {
            name: "nextUrl",
            type: z.string().optional(),
            description: "URL for next page of results",
            required: false,
          },
        ],
        examples: [
          {
            description: "List slowest pages",
            parameters: { sort: "p95", direction: "desc", perPage: 10 },
            expectedOutput:
              "Array of page load span groups sorted by 95th percentile load time",
          },
        ],
        hints: [
          "Page load metrics include Core Web Vitals (LCP, FID, CLS)",
          "Sort by p95 to find pages with consistently slow load times",
          "Star important pages for quick access",
        ],
      },
      async (args, _extra) => {
        const result = await this.listPageLoadSpanGroups(
          args.projectId,
          args.sort,
          args.direction,
          args.perPage,
          undefined,
          args.filters,
          args.starredOnly,
          args.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
              }),
            },
          ],
        };
      },
    );

    // 13. Show Page Load Span Group
    register(
      {
        title: "Show Page Load Span Group",
        summary: "Get detailed performance metrics for a specific page load",
        purpose: "Analyze performance characteristics of a specific page",
        useCases: [
          "View Core Web Vitals for a specific page",
          "Check page load performance statistics",
          "Monitor page-specific performance targets",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
          {
            name: "pageLoadSpanGroupId",
            type: z.string(),
            description: "ID of the page load span group",
            required: true,
          },
        ],
        examples: [
          {
            description: "Get details for a specific page",
            parameters: { pageLoadSpanGroupId: "[FullPageLoad]/home" },
            expectedOutput:
              "Page load statistics including Core Web Vitals and load times",
          },
        ],
        hints: [
          "Use List Page Load Span Groups to discover page IDs",
          "Core Web Vitals include LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)",
        ],
      },
      async (args, _extra) => {
        if (!args.pageLoadSpanGroupId) {
          throw new ToolError("pageLoadSpanGroupId is required");
        }
        const result = await this.getPageLoadSpanGroupById(
          args.projectId,
          args.pageLoadSpanGroupId,
          args.filters,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 14. List Trace Fields
    register(
      {
        title: "List Trace Fields",
        summary: "Get available trace fields/attributes for filtering",
        purpose: "Discover what custom attributes are available for filtering",
        useCases: [
          "Find available custom attributes for performance filtering",
          "Understand what metadata is attached to traces",
          "Build dynamic filters based on available fields",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
        ],
        examples: [
          {
            description: "Get all trace fields",
            parameters: {},
            expectedOutput:
              "Array of field names and types available for filtering",
          },
        ],
        hints: [
          "Trace fields are custom attributes added to spans",
          "Use these fields for filtering other performance queries",
        ],
      },
      async (args, _extra) => {
        const result = await this.listTraceFields(args.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );

    // 15. Get Network Grouping Ruleset
    register(
      {
        title: "Get Network Grouping Ruleset",
        summary: "Get the network request grouping rules for the project",
        purpose:
          "Understand how network requests are grouped for performance monitoring",
        useCases: [
          "View configured rules for grouping similar network requests",
          "Understand how URLs are normalized for monitoring",
          "Troubleshoot why requests are grouped a certain way",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project",
                  required: true,
                },
              ]),
        ],
        examples: [
          {
            description: "Get network grouping rules",
            parameters: {},
            expectedOutput:
              "Ruleset object containing patterns and grouping logic",
          },
        ],
        hints: [
          "Grouping rules help consolidate similar requests (e.g., /user/123 and /user/456 become /user/:id)",
          "Rules are configured in the BugSnag dashboard",
        ],
      },
      async (args, _extra) => {
        const result = await this.getNetworkGroupingRuleset(args.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(result.body) }],
        };
      },
    );
  }

  registerResources(register: RegisterResourceFunction): void {
    register("event", "{id}", async (uri, variables, _extra) => {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(await this.getEvent(variables.id as string)),
          },
        ],
      };
    });
  }
}
