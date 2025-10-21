import NodeCache from "node-cache";
import { z } from "zod";

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
  type Project,
  ProjectAPI,
  type Release,
} from "./client/api/index.js";
import {
  type FilterObject,
  FilterObjectSchema,
  toUrlSearchParams,
} from "./client/filters.js";

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
  endpoint: z.string().describe("BugSnag endpoint URL").optional(),
});

export class BugsnagClient implements Client {
  private cache: NodeCache;
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
  prefix = "bugsnag";
  config = ConfigurationSchema;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 24 * 60 * 60, // default cache TTL of 24 hours
    });
  }

  async configure(_server: SmartBearMcpServer, config: z.infer<typeof ConfigurationSchema>): Promise<boolean> {
    this._appEndpoint = this.getEndpoint("app", config.project_api_key, config.endpoint);
    const apiConfig = new Configuration({
      apiKey: `token ${config.auth_token}`,
      headers: {
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      },
      basePath: this.getEndpoint("api", config.project_api_key, config.endpoint),
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
      try {
        await this.getCurrentProject();
      } catch (error) {
        // Clear the project API key to allow tools to work across all projects
        this.projectApiKey = undefined;
        console.error(
          "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. " +
            "Check your configured BugSnag project API key.",
          error,
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
    let org = this.cache.get<Organization>(cacheKeys.ORG);
    if (!org) {
      const response = await this.currentUserApi.listUserOrganizations();
      const orgs = response.body;
      if (!orgs || orgs.length === 0) {
        throw new Error("No organizations found for the current user.");
      }
      org = orgs[0];
      this.cache.set(cacheKeys.ORG, org);
    }
    return org;
  }

  // This method retrieves all projects for the organization stored in the cache.
  // If no projects are found in the cache, it fetches them from the API and
  // stores them in the cache for future use.
  // It throws an error if no organizations are found in the cache.
  async getProjects(): Promise<Project[]> {
    let projects = this.cache.get<Project[]>(cacheKeys.PROJECTS);
    if (!projects) {
      const org = await this.getOrganization();
      const response = await this.currentUserApi.getOrganizationProjects(
        org.id,
      );
      projects = response.body;
      this.cache.set(cacheKeys.PROJECTS, projects);
    }
    return projects;
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find((p) => p.id === projectId) || null;
  }

  async getCurrentProject(): Promise<Project | null> {
    let project = this.cache.get<Project>(cacheKeys.CURRENT_PROJECT) ?? null;
    if (!project && this.projectApiKey) {
      const projects = await this.getProjects();
      project =
        projects.find((p: Project) => p.apiKey === this.projectApiKey) ?? null;
      if (!project) {
        throw new ToolError(
          "Unable to find project with the configured API key.",
        );
      }
      this.cache.set(cacheKeys.CURRENT_PROJECT, project);
      if (project) {
        this.cache.set(
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

  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void {
    if (!this.projectApiKey) {
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
          parameters: [
            {
              name: "pageSize",
              type: z.number(),
              description:
                "Number of projects to return per page for pagination",
              required: false,
              examples: ["10", "25", "50"],
            },
            {
              name: "page",
              type: z.number(),
              description: "Page number to return (starts from 1)",
              required: false,
              examples: ["1", "2", "3"],
            },
          ],
          examples: [
            {
              description: "Get first 10 projects",
              parameters: {
                pageSize: 10,
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
        async (args: any, _extra: any) => {
          let projects = await this.getProjects();
          if (!projects || projects.length === 0) {
            return {
              content: [{ type: "text", text: "No projects found." }],
            };
          }
          if (args.pageSize || args.page) {
            const pageSize = args.pageSize || 10;
            const page = args.page || 1;
            projects = projects.slice((page - 1) * pageSize, page * pageSize);
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
        parameters: [
          {
            name: "errorId",
            type: z.string(),
            required: true,
            description: "Unique identifier of the error to retrieve",
            examples: ["6863e2af8c857c0a5023b411"],
          },
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  required: true,
                  description: "ID of the project containing the error",
                },
              ]),
          {
            name: "filters",
            type: FilterObjectSchema,
            required: false,
            description:
              "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields",
            examples: [
              '{"error.status": [{"type": "eq", "value": "open"}]}',
              '{"event.since": [{"type": "eq", "value": "7d"}]} // Relative time: last 7 days',
              '{"event.since": [{"type": "eq", "value": "2018-05-20T00:00:00Z"}]} // ISO 8601 UTC format',
              '{"user.email": [{"type": "eq", "value": "user@example.com"}]}',
            ],
            constraints: [
              "Time filters support ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h)",
              "ISO 8601 times must be in UTC and use extended format",
              "Relative time periods: h (hours), d (days)",
            ],
          },
        ],
        outputFormat:
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
        const project = await this.getInputProject(args.projectId);
        if (!args.errorId)
          throw new ToolError(
            "Both projectId and errorId arguments are required",
          );
        const errorDetails = (
          await this.errorsApi.viewErrorOnProject(project.id, args.errorId)
        ).body;
        if (!errorDetails) {
          throw new ToolError(
            `Error with ID ${args.errorId} not found in project ${project.id}.`,
          );
        }

        const filters: FilterObject = {
          error: [{ type: "eq", value: args.errorId }],
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
        parameters: [
          {
            name: "link",
            type: z.string(),
            description:
              "Full URL to the event details page in the BugSnag dashboard (web interface)",
            required: true,
            examples: [
              "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000",
            ],
            constraints: [
              "Must be a valid dashboard URL containing project slug and event_id parameter",
            ],
          },
        ],
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
      async (args: any, _extra: any) => {
        if (!args.link) throw new ToolError("link argument is required");
        const url = new URL(args.link);
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
        parameters: [
          {
            name: "filters",
            type: FilterObjectSchema.default({
              "event.since": [{ type: "eq", value: "30d" }],
              "error.status": [{ type: "eq", value: "open" }],
            }),
            description:
              "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields",
            required: false,
            examples: [
              '{"error.status": [{"type": "eq", "value": "open"}]}',
              '{"event.since": [{"type": "eq", "value": "7d"}]} // Relative time: last 7 days',
              '{"event.since": [{"type": "eq", "value": "2018-05-20T00:00:00Z"}]} // ISO 8601 UTC format',
              '{"user.email": [{"type": "eq", "value": "user@example.com"}]}',
            ],
            constraints: [
              "Time filters support ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h)",
              "ISO 8601 times must be in UTC and use extended format",
              "Relative time periods: h (hours), d (days)",
            ],
          },
          {
            name: "sort",
            type: z
              .enum(["first_seen", "last_seen", "events", "users", "unsorted"])
              .default("last_seen"),
            description: "Field to sort the errors by",
            required: false,
            examples: ["last_seen"],
          },
          {
            name: "direction",
            type: z.enum(["asc", "desc"]).default("desc"),
            description: "Sort direction for ordering results",
            required: false,
            examples: ["desc"],
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).default(30),
            description: "How many results to return per page.",
            required: false,
            examples: ["30", "50", "100"],
          },
          {
            name: "nextUrl",
            type: z.string(),
            description:
              "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available.",
            required: false,
            examples: [
              "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?offset=30&per_page=30&sort=last_seen",
            ],
            constraints: [
              "Only values provided in the output from this tool can be used. Do not attempt to construct it manually.",
            ],
          },
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project to query for errors",
                  required: true,
                },
              ]),
        ],
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
      async (args: any, _extra: any) => {
        const project = await this.getInputProject(args.projectId);

        // Validate filter keys against cached event fields
        if (args.filters) {
          const eventFields =
            this.cache.get<EventField[]>(
              cacheKeys.CURRENT_PROJECT_EVENT_FILTERS,
            ) || [];
          const validKeys = new Set(eventFields.map((f) => f.displayId));
          for (const key of Object.keys(args.filters)) {
            if (!validKeys.has(key)) {
              throw new ToolError(`Invalid filter key: ${key}`);
            }
          }
        }

        const filters: FilterObject = {
          "event.since": [{ type: "eq", value: "30d" }],
          "error.status": [{ type: "eq", value: "open" }],
          ...args.filters,
        };

        const response = await this.errorsApi.listProjectErrors(
          project.id,
          null,
          args.sort || "last_seen",
          args.direction || "desc",
          args.perPage || 30,
          filters,
          args.nextUrl,
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
        parameters: [],
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
      async (_args: any, _extra: any) => {
        const projectFields = this.cache.get<EventField[]>(
          cacheKeys.CURRENT_PROJECT_EVENT_FILTERS,
        );
        if (!projectFields)
          throw new ToolError("No event filters found in cache.");

        return {
          content: [{ type: "text", text: JSON.stringify(projectFields) }],
        };
      },
    );

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
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description:
                    "ID of the project that contains the error to be updated",
                  required: true,
                },
              ]),
          {
            name: "errorId",
            type: z.string(),
            description: "ID of the error to update",
            required: true,
            examples: ["6863e2af8c857c0a5023b411"],
          },
          {
            name: "operation",
            type: z.enum(PERMITTED_UPDATE_OPERATIONS),
            description: "The operation to apply to the error",
            required: true,
            examples: ["fix", "open", "ignore", "discard", "undiscard"],
          },
        ],
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
      async (args: any, _extra: any) => {
        const { errorId, operation } = args;
        const project = await this.getInputProject(args.projectId);

        let severity: any;
        if (operation === "override_severity") {
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
          errorId,
          {
            operation: operation,
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
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project to list releases for",
                  required: true,
                },
              ]),
          {
            name: "releaseStage",
            type: z.string().default("production"),
            description:
              "Filter releases by this stage (e.g. production, staging), defaults to 'production'",
            required: false,
            examples: ["production", "staging"],
          },
          {
            name: "visibleOnly",
            type: z.boolean().default(false),
            description:
              "Whether to only include releases that are marked as visible in the dashboard, defaults to false",
            required: false,
            examples: ["true", "false"],
          },
          {
            name: "perPage",
            type: z.number().min(1).max(100).default(30),
            description: "How many results to return per page.",
            required: false,
            examples: ["30", "50", "100"],
          },
          {
            name: "nextUrl",
            type: z.string(),
            description:
              "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. If provided, other parameters are ignored.",
            required: false,
            examples: [
              "/projects/515fb9337c1074f6fd000003/releases?offset=30&per_page=30",
            ],
          },
        ],
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
        outputFormat:
          "JSON array of release summary objects with metadata, with a URL to the next page if more results are available",
      },
      async (args, _extra) => {
        const project = await this.getInputProject(args.projectId);
        const response = await this.projectApi.listProjectReleaseGroups(
          project.id,
          args.releaseStage || "production",
          false, // Not top-only
          args.visibleOnly || false,
          args.perPage || 30,
          args.nextUrl,
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
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project containing the release",
                  required: true,
                },
              ]),
          {
            name: "releaseId",
            type: z.string(),
            description: "ID of the release to retrieve",
            required: true,
            examples: ["5f8d0d55c9e77c0017a1b2c3"],
          },
        ],
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
        outputFormat:
          "JSON object containing release details along with stability metrics such as user and session stability, and whether it meets project targets",
      },
      async (args, _extra) => {
        if (!args.releaseId)
          throw new ToolError("releaseId argument is required");
        const project = await this.getInputProject(args.projectId);
        const releaseResponse = await this.projectApi.getReleaseGroup(
          args.releaseId,
        );
        if (!releaseResponse.body)
          throw new ToolError(`No release for ${args.releaseId} found.`);
        const release = this.addStabilityData(releaseResponse.body, project);
        let builds: (Build & StabilityData)[] = [];
        if (releaseResponse.body) {
          const buildsResponse = await this.projectApi.listBuildsInRelease(
            args.releaseId,
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
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project containing the build",
                  required: true,
                },
              ]),
          {
            name: "buildId",
            type: z.string(),
            description: "ID of the build to retrieve",
            required: true,
            examples: ["5f8d0d55c9e77c0017a1b2c3"],
          },
        ],
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
        outputFormat:
          "JSON object containing build details along with stability metrics such as user and session stability, and whether it meets project targets",
      },
      async (args, _extra) => {
        if (!args.buildId) throw new ToolError("buildId argument is required");
        const project = await this.getInputProject(args.projectId);
        const response = await this.projectApi.getProjectReleaseById(
          project.id,
          args.buildId,
        );

        if (!response.body)
          throw new ToolError(`No build for ${args.buildId} found.`);
        const build = this.addStabilityData(response.body, project);
        return {
          content: [{ type: "text", text: JSON.stringify(build) }],
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
