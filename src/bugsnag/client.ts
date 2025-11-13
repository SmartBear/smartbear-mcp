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
  ErrorUpdateRequest,
  type EventField,
  type Organization,
  type Project,
  ProjectAPI,
  type Release,
} from "./client/api/index.js";
import { type FilterObject, toUrlSearchParams } from "./client/filters.js";
import { toolInputParameters } from "./input-schemas.js";

const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

const cacheKeys = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  PROJECT_EVENT_FILTERS: "bugsnag_project_event_filters",
  CURRENT_PROJECT: "bugsnag_current_project",
  CURRENT_PROJECT_EVENT_FILTERS: "bugsnag_current_project_event_filters",
  CURRENT_PROJECT_TRACE_FIELDS: "bugsnag_current_project_trace_fields",
};

// Performance filter schemas that match the API structure
const PerformanceFilterSchema = z.object({
  key: z.string(),
  filterValues: z.array(
    z.object({
      value: z.string(),
      matchType: z.enum(["eq", "ne", "lt", "gt", "empty"]),
    })
  ).optional(),
});

export const PerformanceFiltersArraySchema = z.array(PerformanceFilterSchema);


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
  private configuredProjectApiKey?: string;
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
      const projects = await this.getProjects();
      // If there's just one project, make this the current project
      if (projects.length === 1 && !this.projectApiKey) {
        this.projectApiKey = projects[0].apiKey;
      }
    } catch (error) {
      // Swallow auth errors here to allow the tools to be registered for visibility, even if the token is invalid
      console.error(
        "Unable to connect to BugSnag APIs, the BugSnag tools will not work. Check your configured BugSnag auth token.",
        error,
      );
    }
    if (this.projectApiKey) {
      this.configuredProjectApiKey = this.projectApiKey; // Store the originally configured API key
      let currentProject = null;
      try {
        currentProject = await this.getCurrentProject();
      } catch (error) {
        console.error(
          "An error occurred while fetching project information",
          error,
        );
      }
      if (currentProject) {
        await this.getProjectEventFilters(currentProject);
      } else {
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

  async getSpanGroupUrl(
    project: Project,
    spanGroupId: string,
  ): Promise<string> {
    const dashboardUrl = await this.getDashboardUrl(project);
    return `${dashboardUrl}/performance/span-groups/${encodeURIComponent(spanGroupId)}`;
  }

  async getTraceUrl(project: Project, traceId: string): Promise<string> {
    const dashboardUrl = await this.getDashboardUrl(project);
    return `${dashboardUrl}/performance/traces/${traceId}`;
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
    }
    return project;
  }

  async getProjectEventFilters(project: Project): Promise<EventField[]> {
    const projectFiltersCache =
      this.cache?.get<Record<string, EventField[]>>(
        cacheKeys.PROJECT_EVENT_FILTERS,
      ) || {};
    if (!projectFiltersCache[project.id]) {
      let filtersResponse = (
        await this.projectApi.listProjectEventFields(project.id)
      ).body;
      if (!filtersResponse || filtersResponse.length === 0) {
        throw new ToolError(
          `No event fields found for project ${project.name}.`,
        );
      }
      filtersResponse = filtersResponse.filter(
        (field) =>
          field.displayId && !EXCLUDED_EVENT_FIELDS.has(field.displayId),
      );
      projectFiltersCache[project.id] = filtersResponse;
      this.cache?.set(cacheKeys.PROJECT_EVENT_FILTERS, projectFiltersCache);
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

  private async getInputProject(
    projectId?: unknown | string,
  ): Promise<Project> {
    if (typeof projectId === "string") {
      const maybeProject = await this.getProject(projectId);
      if (!maybeProject) {
        throw new ToolError(`Project with ID ${projectId} not found.`);
      }
      // If this hasn't been configured at startup, set this to the current project for future tool calls
      if (!this.configuredProjectApiKey) {
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

  private validatePerformanceFilters(filters: any[]): void {
    if (!filters || filters.length === 0) return;

    const traceFields = this.cache?.get<any[]>(
      cacheKeys.CURRENT_PROJECT_TRACE_FIELDS,
    );
    if (!traceFields || !Array.isArray(traceFields)) {
      console.warn(
        "Trace fields not cached or invalid format. Consider calling List Trace Fields first for better validation.",
      );
      return;
    }

    const validKeys = new Set(
      traceFields.map((f) => f.key || f.name || f.displayId).filter(Boolean),
    );
    for (const filter of filters) {
      if (!validKeys.has(filter.key)) {
        throw new ToolError(
          `Invalid performance filter key: ${filter.key}. Use List Trace Fields tool to see available keys.`,
        );
      }
    }
  }

  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void {
    register(
      {
        title: "Get Current Project",
        summary:
          "Retrieve the 'current' project on which tools should operate by default. This allows BugSnag tools to be called with no projectId parameter.",
        purpose:
          "Gets information about the 'current' BugSnag project, including ID and API key",
        useCases: ["Understand if a current project has been set"],
        inputSchema: toolInputParameters.empty,
        hints: [
          "If a project is returned, it can be assumed that the user expects interactions with BugSnag tools to refer to this project",
          "If this tool returns no current project then other BugSnag tools will require an explicit project ID parameter",
          "Call the List Projects tool to see all projects that the user has access to. Get the project ID from this list either by asking the user for the project name or slug",
          "You might find a BugSnag API key in the user's code where they configure the BugSnag SDK that can be matched to a project 'apiKey' field from the project list",
        ],
      },
      async (_args, _extra) => {
        const project = await this.getCurrentProject();
        if (!project) {
          throw new ToolError(
            "No current project is configured in the MCP server - use List Projects to see the available projects and use the project ID as a parameter to other BugSnag tools. You can ask the user to select the project based on the name or slug, or use the apiKey field and see if there's a BugSnag API key set in the user's code when they configure the BugSnag SDK",
          );
        }
        return {
          content: [{ type: "text", text: JSON.stringify(project) }],
        };
      },
    );

    const listProjectsInputSchema = z.object({
      apiKey: z
        .string()
        .optional()
        .describe("The API key of the BugSnag project, if known."),
    });

    register(
      {
        title: "List Projects",
        summary:
          "List all projects in the organization that the current user has access to, or find a project matching an API key.",
        purpose:
          "Retrieve available projects for browsing and selecting which project to analyze.",
        useCases: [
          "Get an overview of all projects in the organization",
          "Locate a project by its API key if known from the user's code",
        ],
        inputSchema: listProjectsInputSchema,
        hints: [
          "Project IDs from this list can be used with other tools when no project API key is configured",
        ],
      },
      async (args, _extra) => {
        const params = listProjectsInputSchema.parse(args);
        let projects = await this.getProjects();
        if (!projects || projects.length === 0) {
          throw new ToolError(
            "No BugSnag projects found for the current user.",
          );
        }
        if (params.apiKey) {
          const matchedProject = projects.find(
            (p: Project) => p.apiKey === params.apiKey,
          );
          projects = matchedProject ? [matchedProject] : [];
        }
        const content = {
          data: projects,
          count: projects.length,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(content) }],
        };
      },
    );

    const getErrorInputSchema = z.object({
      projectId: toolInputParameters.projectId,
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
      projectId: toolInputParameters.projectId,
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
          "Use List Project Event Filters tool first to discover valid filter field names for your project",
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
          const eventFields = await this.getProjectEventFilters(project);
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

    const listProjectEventFiltersInputSchema = z.object({
      projectId: toolInputParameters.projectId,
    });

    register(
      {
        title: "List Project Event Filters",
        summary: "Get available event filter fields for a project",
        purpose:
          "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
        useCases: [
          "Discover what filter fields are available before searching for errors",
          "Find the correct field names for filtering by user, environment, or custom metadata",
          "Understand filter options and data types for building complex queries",
        ],
        inputSchema: listProjectEventFiltersInputSchema,
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
      async (args, _extra) => {
        const params = listProjectEventFiltersInputSchema.parse(args);
        const eventFilters = await this.getProjectEventFilters(
          await this.getInputProject(params.projectId),
        );
        return {
          content: [{ type: "text", text: JSON.stringify(eventFilters) }],
        };
      },
    );

    const updateErrorInputSchema = z.object({
      projectId: toolInputParameters.projectId,
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
        inputSchema: updateErrorInputSchema,
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
      projectId: toolInputParameters.projectId,
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
      projectId: toolInputParameters.projectId,
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
      projectId: toolInputParameters.projectId,
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
          "JSON object containing build details along with stability metrics such as user and session stability, and whether it meets project targets. " +
          "Key fields include: version, sourceControl info, errorCount, userStability, sessionStability, meetsTargetStability",
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

    const listSpanGroupsInputSchema = z.object({
      projectId: toolInputParameters.projectId,
      sort: z
        .enum([
          "total_spans",
          "last_seen",
          "name",
          "display_name",
          "network_http_method",
          "rendering_slow_frame_span_percentage",
          "rendering_frozen_frame_span_percentage",
          "duration_p50",
          "duration_p75",
          "duration_p90",
          "duration_p95",
          "duration_p99",
          "system_metrics_cpu_total_mean_p50",
          "system_metrics_cpu_total_mean_p75",
          "system_metrics_cpu_total_mean_p90",
          "system_metrics_cpu_total_mean_p95",
          "system_metrics_cpu_total_mean_p99",
          "system_metrics_memory_device_mean_p50",
          "system_metrics_memory_device_mean_p75",
          "system_metrics_memory_device_mean_p90",
          "system_metrics_memory_device_mean_p95",
          "system_metrics_memory_device_mean_p99",
          "rendering_metrics_fps_mean_p50",
          "rendering_metrics_fps_mean_p75",
          "rendering_metrics_fps_mean_p90",
          "rendering_metrics_fps_mean_p95",
          "rendering_metrics_fps_mean_p99",
          "http_response_4xx_percentage",
          "http_response_5xx_percentage",
        ])
        .optional()
        .describe("Field to sort by"),
      direction: toolInputParameters.direction,
      perPage: toolInputParameters.perPage,
      starredOnly: z
        .boolean()
        .optional()
        .describe("Show only starred span groups"),
      nextUrl: toolInputParameters.nextUrl,
      filters: toolInputParameters.performanceFilters,
    });

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
        inputSchema: listSpanGroupsInputSchema,
        examples: [
          {
            description: "List slowest operations",
            parameters: {
              sort: "duration_p95",
              direction: "desc",
              perPage: 10,
            },
            expectedOutput:
              "Array of span groups sorted by 95th percentile duration",
          },
          {
            description: "List starred span groups with filtering",
            parameters: {
              starredOnly: true,
              filters: {
                "span_group.category": [
                  { type: "eq", value: "full_page_load" },
                ],
              },
            },
            expectedOutput: "Array of starred span groups filtered by category",
          },
        ],
        hints: [
          "Span groups represent different operation types (page loads, API calls, etc.)",
          "Use sort by duration_p95 or duration_p99 to find the slowest operations",
          "Star important span groups for quick access",
          "Use nextUrl for pagination",
        ],
      },
      async (args, _extra) => {
        const params = listSpanGroupsInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);

        // Validate filter keys against cached trace fields if filters are provided
        this.validatePerformanceFilters(params.filters || []);

        const result = await this.projectApi.listProjectSpanGroups(
          project.id,
          params.sort,
          params.direction,
          params.perPage,
          undefined,
          params.filters,
          params.starredOnly,
          params.nextUrl,
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

    const getSpanGroupInputSchema = z.object({
      projectId: toolInputParameters.projectId,
      spanGroupId: toolInputParameters.spanGroupId,
      filters: toolInputParameters.performanceFilters,
    });

    register(
      {
        title: "Get Span Group",
        summary: "Get detailed performance metrics for a specific span group",
        purpose: "Analyze performance characteristics of a specific operation",
        useCases: [
          "View detailed statistics (p50, p75, p90, p95, p99) for an operation",
          "Check if performance targets are configured",
          "Monitor span count to understand operation volume",
        ],
        inputSchema: getSpanGroupInputSchema,
        examples: [
          {
            description: "Get details for an API endpoint span group",
            parameters: { spanGroupId: "[HttpClient]GET-api.example.com" },
            expectedOutput: "Statistics, category, and performance target info",
          },
          {
            description: "Get span group details with device filtering",
            parameters: {
              spanGroupId: "[HttpClient]GET-api.example.com",
              filters: {
                "device.browser_name": [{ type: "eq", value: "Chrome" }],
              },
            },
            expectedOutput: "Statistics filtered for Chrome browser only",
          },
        ],
        hints: [
          "Use List Span Groups first to discover available span group IDs",
          "IDs are automatically URL-encoded - provide the raw ID",
          "Statistics include p50, p75, p90, p95, p99 percentiles",
        ],
      },
      async (args, _extra) => {
        const params = getSpanGroupInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const spanGroupResults = await this.projectApi.getProjectSpanGroup(
          project.id,
          params.spanGroupId,
          params.filters,
        );

        const spanGroupTimelineResult =
          await this.projectApi.getProjectSpanGroupTimeline(
            project.id,
            params.spanGroupId,
            params.filters,
          );

        const spanGroupDistributionResult =
          await this.projectApi.getProjectSpanGroupDistribution(
            project.id,
            params.spanGroupId,
            params.filters,
          );

        const result = {
          ...spanGroupResults.body,
          timeline: spanGroupTimelineResult.body,
          distribution: spanGroupDistributionResult.body,
          url: await this.getSpanGroupUrl(project, params.spanGroupId),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    const listSpansInputSchema = z.object({
      projectId: toolInputParameters.projectId,
      spanGroupId: toolInputParameters.spanGroupId,
      sort: z
        .enum([
          "duration",
          "timestamp",
          "full_page_load_lcp",
          "full_page_load_fid",
          "full_page_load_cls",
          "full_page_load_ttfb",
          "full_page_load_fcp",
          "rendering_slow_frame_percentage",
          "rendering_frozen_frame_percentage",
          "system_metrics_cpu_total_mean",
          "system_metrics_memory_device_mean",
          "rendering_metrics_fps_mean",
          "rendering_metrics_fps_minimum",
          "rendering_metrics_fps_maximum",
          "http_response_code",
        ])
        .optional()
        .describe("Field to sort by"),
      direction: toolInputParameters.direction,
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
      filters: toolInputParameters.performanceFilters,
    });

    register(
      {
        title: "List Spans",
        summary: "Get individual spans belonging to a span group",
        purpose: "Examine individual operation instances within a span group",
        useCases: [
          "Analyze individual slow operations",
          "Debug performance issues by examining specific traces",
          "Find patterns in operation attributes",
        ],
        inputSchema: listSpansInputSchema,
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
          {
            description: "Get spans filtered by OS with pagination",
            parameters: {
              spanGroupId: "[HttpClient]GET-api.example.com",
              sort: "timestamp",
              filters: {
                "os.name": [{ type: "eq", value: "iOS" }],
              },
              nextUrl: "/projects/123/spans?offset=30&per_page=30",
            },
            expectedOutput:
              "Array of spans from iOS devices with next page navigation",
          },
        ],
        hints: [
          "Sort by duration descending to find the slowest instances",
          "Each span includes trace ID for further investigation",
        ],
      },
      async (args, _extra) => {
        const params = listSpansInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const result = await this.projectApi.listSpansBySpanGroupId(
          project.id,
          params.spanGroupId,
          params.filters,
          params.sort,
          params.direction,
          params.perPage,
          params.nextUrl,
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

    const getTraceInputSchema = z.object({
      projectId: toolInputParameters.projectId,
      traceId: toolInputParameters.traceId,
      from: z.string().datetime().describe("Start time (ISO 8601 format)"),
        to: z.string().datetime().describe("End time (ISO 8601 format)"),
      targetSpanId: z
        .string()
        .optional()
        .describe("Optional target span ID to focus on"),
      perPage: toolInputParameters.perPage,
      nextUrl: toolInputParameters.nextUrl,
    }).refine((data) => {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      return fromDate < toDate;
    }, {
      message: "Start time (from) must be before end time (to)",
      path: ["from"],
    });

    register(
      {
        title: "Get Trace",
        summary: "Get all spans within a specific trace",
        purpose:
          "View the complete trace of operations for a request/transaction",
        useCases: [
          "Debug slow requests by viewing all operations in the trace",
          "Understand the flow of a request through the system",
          "Identify bottlenecks in distributed systems",
        ],
        inputSchema: getTraceInputSchema,
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
          {
            description:
              "Get spans for a trace with pagination and target span",
            parameters: {
              traceId: "def456",
              from: "2024-01-01T00:00:00Z",
              to: "2024-01-01T23:59:59Z",
              targetSpanId: "span-789",
              perPage: 50,
            },
            expectedOutput:
              "Array of up to 50 spans focused around the target span",
          },
        ],
        hints: [
          "Traces show the complete execution path of a request",
          "Use from/to parameters to narrow the time window",
          "targetSpanId can be used to focus on a specific span in the trace",
        ],
      },
      async (args, _extra) => {
        const params = getTraceInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);
        const result = await this.projectApi.listSpansByTraceId(
          project.id,
          params.traceId,
          params.from,
          params.to,
          params.targetSpanId,
          params.perPage,
          params.nextUrl,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: result.body,
                next_url: result.nextUrl,
                count: result.body?.length,
                trace_url:
                  result.body && result.body.length > 0
                    ? await this.getTraceUrl(project, params.traceId)
                    : undefined,
              }),
            },
          ],
        };
      },
    );

    const listTraceFieldsInputSchema = z.object({
      projectId: toolInputParameters.projectId,
    });

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
        inputSchema: listTraceFieldsInputSchema,
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
          "Results are cached for better performance on subsequent calls",
        ],
      },
      async (args, _extra) => {
        const params = listTraceFieldsInputSchema.parse(args);
        const project = await this.getInputProject(params.projectId);

        // Check cache first
        let traceFields = this.cache?.get<any[]>(
          cacheKeys.CURRENT_PROJECT_TRACE_FIELDS,
        );
        if (!traceFields) {
          const result = await this.projectApi.listProjectTraceFields(
            project.id,
          );
          traceFields = result.body || [];
          this.cache?.set(cacheKeys.CURRENT_PROJECT_TRACE_FIELDS, traceFields);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(traceFields) }],
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
