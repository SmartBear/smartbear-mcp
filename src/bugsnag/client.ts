import NodeCache from "node-cache";
import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterResourceFunction, RegisterToolsFunction } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI, Configuration } from "./client/index.js";
import { Organization, Project } from "./client/api/CurrentUser.js";
import { FilterObject, FilterObjectSchema, toQueryString } from "./client/api/filters.js";
import { ListProjectErrorsOptions } from "./client/api/Error.js";
import {
  EventField,
  ListBuildsOptions,
  ProjectAPI,
  BuildResponse,
  StabilityData,
  BuildResponseAny,
  ReleaseResponseAny,
  ProjectStabilityTargets,
  ListReleasesOptions,
  ReleaseResponse,
} from "./client/api/Project.js";
import { getNextUrlPathFromHeader } from "./client/api/base.js";

const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

const cacheKeys = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  CURRENT_PROJECT: "bugsnag_current_project",
  CURRENT_PROJECT_EVENT_FILTERS: "bugsnag_current_project_event_filters",
  BUILD: "bugsnag_build", // + buildId
  RELEASE: "bugsnag_release", // + releaseId
  BUILDS_IN_RELEASE: "bugsnag_builds_in_release" // + releaseId
}

// Exclude certain event fields from the project event filters to improve agent usage
const EXCLUDED_EVENT_FIELDS = new Set([
  "search" // This is searches multiple fields and is more a convenience for humans, we're removing to avoid over-matching
]);

const PERMITTED_UPDATE_OPERATIONS = [
  "override_severity",
  "open",
  "fix",
  "ignore",
  "discard",
  "undiscard"
] as const;

// Type definitions for tool arguments
export interface ProjectArgs {
  projectId: string;
}

export interface OrgArgs {
  orgId: string;
}

export interface ErrorArgs extends ProjectArgs {
  errorId: string;
}
export class BugsnagClient implements Client {
  private currentUserApi: CurrentUserAPI;
  private errorsApi: ErrorAPI;
  private cache: NodeCache;
  private projectApi: ProjectAPI;
  private projectApiKey?: string;
  private apiEndpoint: string;
  private appEndpoint: string;

  name = "Bugsnag";
  prefix = "bugsnag";

  constructor(token: string, projectApiKey?: string, endpoint?: string) {
    this.apiEndpoint = this.getEndpoint("api", projectApiKey, endpoint);
    this.appEndpoint = this.getEndpoint("app", projectApiKey, endpoint);
    const config = new Configuration({
      authToken: token,
      headers: {
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      },
      basePath: this.apiEndpoint,
    });
    this.currentUserApi = new CurrentUserAPI(config);
    this.errorsApi = new ErrorAPI(config);
    this.cache = new NodeCache({
      stdTTL: 24 * 60 * 60, // default cache TTL of 24 hours
    });
    this.projectApi = new ProjectAPI(config);
    this.projectApiKey = projectApiKey;
  }

  async initialize(): Promise<void> {
    // Trigger caching of org and projects
    await this.getProjects();
    await this.getCurrentProject();
  }

  getHost(apiKey: string | undefined, subdomain: string): string {
    if (apiKey && apiKey.startsWith(HUB_PREFIX)) {
      return `https://${subdomain}.${HUB_DOMAIN}`;
    } else {
      return `https://${subdomain}.${DEFAULT_DOMAIN}`;
    }
  }

  // If the endpoint is not provided, it will use the default API endpoint based on the project API key.
  // if the project api key is not provided, the endpoint will be the default API endpoint.
  // if the endpoint is provided, it will be used as is for custom domains, or normalized for known domains.
  getEndpoint(subdomain: string, apiKey?: string, endpoint?: string,): string {
    let subDomainEndpoint: string;
    if (!endpoint) {
      if (apiKey && apiKey.startsWith(HUB_PREFIX)) {
        subDomainEndpoint = `https://${subdomain}.${HUB_DOMAIN}`;
      } else {
        subDomainEndpoint = `https://${subdomain}.${DEFAULT_DOMAIN}`;
      }
    } else {
      // check if the endpoint matches either the HUB_DOMAIN or DEFAULT_DOMAIN
      const url = new URL(endpoint);
      if (url.hostname.endsWith(HUB_DOMAIN) || url.hostname.endsWith(DEFAULT_DOMAIN)) {
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

  async getErrorUrl(project: Project, errorId: string, queryString = ''): Promise<string> {
    const dashboardUrl = await this.getDashboardUrl(project);
    return `${dashboardUrl}/errors/${errorId}${queryString}`;
  }

  async getOrganization(): Promise<Organization> {
    let org = this.cache.get<Organization>(cacheKeys.ORG)!;
    if (!org) {
      const response = await this.currentUserApi.listUserOrganizations();
      const orgs = response.body || [];
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
      const response = await this.currentUserApi.getOrganizationProjects(org.id);
      projects = response.body || [];
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
      project = projects.find((p) => p.api_key === this.projectApiKey) ?? null;
      if (!project) {
        throw new Error(`Unable to find project with API key ${this.projectApiKey} in organization.`);
      }
      this.cache.set(cacheKeys.CURRENT_PROJECT, project);
      if (project) {
        this.cache.set(cacheKeys.CURRENT_PROJECT_EVENT_FILTERS, await this.getProjectEventFilters(project));
      }
    }
    return project;
  }

  async getProjectEventFilters(project: Project): Promise<EventField[]> {
    let filtersResponse = (await this.projectApi.listProjectEventFields(project.id)).body;
    if (!filtersResponse || filtersResponse.length === 0) {
      throw new Error(`No event fields found for project ${project.name}.`);
    }
    filtersResponse = filtersResponse.filter(field => !EXCLUDED_EVENT_FIELDS.has(field.display_id));
    return filtersResponse;
  }

  async getEvent(eventId: string, projectId?: string): Promise<any> {
    const projectIds = projectId ? [projectId] : (await this.getProjects()).map((p) => p.id);
    const projectEvents = await Promise.all(projectIds.map((projectId: string) => this.errorsApi.viewEventById(projectId, eventId).catch(_e => null)));
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

  private async getInputProject(projectId?: unknown | string): Promise<Project> {
    if (typeof projectId === 'string') {
      const maybeProject = await this.getProject(projectId);
      if (!maybeProject) {
        throw new Error(`Project with ID ${projectId} not found.`);
      }
      return maybeProject!;
    } else {
      const currentProject = await this.getCurrentProject();
      if (!currentProject) {
        throw new Error('No current project found. Please provide a projectId or configure a project API key.');
      }
      return currentProject;
    }
  }

  async listBuilds(projectId: string, opts: ListBuildsOptions) {
    const response = await this.projectApi.listBuilds(projectId, opts);
    const fetchedBuilds = response.body || [];
    const nextUrl = getNextUrlPathFromHeader(response.headers, this.apiEndpoint);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedBuilds = fetchedBuilds.map(
      (b) => this.addStabilityData(b, stabilityTargets)
    );

    return { builds: formattedBuilds, nextUrl };
  }

  async getBuild(projectId: string, buildId: string) {
    const cacheKey = `${cacheKeys.BUILD}_${buildId}`;
    const build = this.cache.get<BuildResponse & StabilityData>(cacheKey);
    if (build) return build;

    const fetchedBuild = (await this.projectApi.getBuild(projectId, buildId)).body;
    if (!fetchedBuild) throw new Error(`No build for ${buildId} found.`);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedBuild = this.addStabilityData(fetchedBuild, stabilityTargets);
    this.cache.set(cacheKey, formattedBuild, 5 * 60);
    return formattedBuild;
  }

  async listReleases(projectId: string, opts: ListReleasesOptions) {
    const response = await this.projectApi.listReleases(projectId, opts)
    const fetchedReleases = response.body || [];
    const nextUrl = getNextUrlPathFromHeader(response.headers, this.apiEndpoint);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedReleases = fetchedReleases.map(
      (r) => this.addStabilityData(r, stabilityTargets)
    );

    return { releases: formattedReleases, nextUrl };
  }

  async getRelease(projectId: string, releaseId: string) {
    const cacheKey = `${cacheKeys.RELEASE}_${releaseId}`;
    const release = this.cache.get<ReleaseResponse & StabilityData>(cacheKey);
    if (release) return release;

    const fetchedRelease = (await this.projectApi.getRelease(releaseId)).body;
    if (!fetchedRelease) throw new Error(`No release for ${releaseId} found.`);

    const stabilityTargets = await this.getProjectStabilityTargets(projectId);
    const formattedRelease = this.addStabilityData(fetchedRelease, stabilityTargets);
    this.cache.set(cacheKey, formattedRelease, 5 * 60);
    return formattedRelease;
  }

  async listBuildsInRelease(releaseId: string) {
    const cacheKey = `${cacheKeys.BUILDS_IN_RELEASE}_${releaseId}`;
    const builds = this.cache.get<BuildResponse[]>(cacheKey);
    if (builds) return builds;

    const fetchedBuilds = (await this.projectApi.listBuildsInRelease(releaseId)).body || [];
    this.cache.set(cacheKey, fetchedBuilds, 5 * 60);
    return fetchedBuilds;
  }

  private async getProjectStabilityTargets(projectId: string) {
    return await this.projectApi.getProjectStabilityTargets(projectId);
  }

  private addStabilityData<T extends BuildResponseAny | ReleaseResponseAny>(
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

  registerTools(register: RegisterToolsFunction, getInput: GetInputFunction): void {
    if (!this.projectApiKey) {
      register(
        {
          title: "List Projects",
          summary: "List all projects in the organization with optional pagination",
          purpose: "Retrieve available projects for browsing and selecting which project to analyze",
          useCases: [
            "Browse available projects when no specific project API key is configured",
            "Find project IDs needed for other tools",
            "Get an overview of all projects in the organization"
          ],
          parameters: [
            {
              name: "page_size",
              type: z.number(),
              description: "Number of projects to return per page for pagination",
              required: false,
              examples: ["10", "25", "50"]
            },
            {
              name: "page",
              type: z.number(),
              description: "Page number to return (starts from 1)",
              required: false,
              examples: ["1", "2", "3"]
            }
          ],
          examples: [
            {
              description: "Get first 10 projects",
              parameters: {
                page_size: 10,
                page: 1
              },
              expectedOutput: "JSON array of project objects with IDs, names, and metadata",
            },
            {
              description: "Get all projects (no pagination)",
              parameters: {},
              expectedOutput: "JSON array of all available projects"
            }
          ],
          hints: [
            "Use pagination for organizations with many projects to avoid large responses",
            "Project IDs from this list can be used with other tools when no project API key is configured"
          ]
        },
        async (args: any, _extra: any) => {
          let projects = await this.getProjects();
          if (!projects || projects.length === 0) {
            return {
              content: [{ type: "text", text: "No projects found." }],
            };
          }
          if (args.page_size || args.page) {
            const pageSize = args.page_size || 10;
            const page = args.page || 1;
            projects = projects.slice((page - 1) * pageSize, page * pageSize);
          }

          const result = {
            data: projects,
            count: projects.length,
          }
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        }
      );
    }

    register(
      {
        title: "Get Error",
        summary: "Get full details on an error, including aggregated and summarized data across all events (occurrences) and details of the latest event (occurrence), such as breadcrumbs, metadata and the stacktrace. Use the filters parameter to narrow down the summaries further.",
        purpose: "Retrieve all the information required on a specified error to understand who it is affecting and why.",
        useCases: [
          "Investigate a specific error found through the List Project Errors tool",
          "Understand which types of user are affected by the error using summarized event data",
          "Get error details for debugging and root cause analysis",
          "Retrieve error metadata for incident reports and documentation"
        ],
        parameters: [
          {
            name: "errorId",
            type: z.string(),
            required: true,
            description: "Unique identifier of the error to retrieve",
            examples: ["6863e2af8c857c0a5023b411"]
          },
          ...(this.projectApiKey ? [] : [
            {
              name: "projectId",
              type: z.string(),
              required: true,
              description: "ID of the project containing the error",
            }
          ]),
          {
            name: "filters",
            type: FilterObjectSchema,
            required: false,
            description: "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields",
            examples: [
              '{"error.status": [{"type": "eq", "value": "open"}]}',
              '{"event.since": [{"type": "eq", "value": "7d"}]} // Relative time: last 7 days',
              '{"event.since": [{"type": "eq", "value": "2018-05-20T00:00:00Z"}]} // ISO 8601 UTC format',
              '{"user.email": [{"type": "eq", "value": "user@example.com"}]}'
            ],
            constraints: [
              "Time filters support ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h)",
              "ISO 8601 times must be in UTC and use extended format",
              "Relative time periods: h (hours), d (days)"
            ]
          }
        ],
        outputFormat: "JSON object containing: " +
          " - error_details: Aggregated data about the error, including first and last seen occurrence" +
          " - latest_event: Detailed information about the most recent occurrence of the error, including stacktrace, breadcrumbs, user and context" +
          " - pivots: List of pivots (summaries) for the error, which can be used to analyze patterns in occurrences" +
          " - url: A link to the error in the dashboard - this should be shown to the user for them to perform further analysis",
        examples: [
          {
            description: "Get details for a specific error",
            parameters: {
              errorId: "6863e2af8c857c0a5023b411"
            },
            expectedOutput: "JSON object with error details including message, stack trace, occurrence count, and metadata"
          }
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
        if (!args.errorId) throw new Error("Both projectId and errorId arguments are required");
        const errorDetails = (await this.errorsApi.viewErrorOnProject(project.id, args.errorId)).body;
        if (!errorDetails) {
          throw new Error(`Error with ID ${args.errorId} not found in project ${project.id}.`);
        }

        // Build query parameters
        const params = new URLSearchParams();

        // Add sorting and pagination parameters to get the latest event
        params.append('sort', 'timestamp');
        params.append('direction', 'desc');
        params.append('per_page', '1');
        params.append('full_reports', 'true');

        const filters: FilterObject = {
          "error": [{ type: "eq", value: args.errorId }],
          ...args.filters
        }

        const filtersQueryString = toQueryString(filters);
        const listEventsQueryString = `?${params}&${filtersQueryString}`;

        // Get the latest event for this error using the events endpoint with filters
        let latestEvent = null;
        try {
          const eventsResponse = await this.errorsApi.listEventsOnProject(project.id, listEventsQueryString);
          const events = eventsResponse.body || [];
          latestEvent = events[0] || null;
        } catch (e) {
          console.warn("Failed to fetch latest event:", e);
          // Continue without latest event rather than failing the entire request
        }

        const content = {
          error_details: errorDetails,
          latest_event: latestEvent,
          pivots: (await this.errorsApi.listErrorPivots(project.id, args.errorId)).body || [],
          url: await this.getErrorUrl(project, args.errorId, `?${filtersQueryString}`),
        }
        return {
          content: [{ type: "text", text: JSON.stringify(content) }]
        };
      }
    );

    register(
      {
        title: "Get Event Details",
        summary: "Get detailed information about a specific event using its dashboard URL",
        purpose: "Retrieve event details directly from a dashboard URL for quick debugging",
        useCases: [
          "Get event details when given a dashboard URL from a user or notification",
          "Extract event information from shared links or browser URLs",
          "Quick lookup of event details without needing separate project and event IDs"
        ],
        parameters: [
          {
            name: "link",
            type: z.string(),
            description: "Full URL to the event details page in the BugSnag dashboard (web interface)",
            required: true,
            examples: [
              "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"
            ],
            constraints: [
              "Must be a valid dashboard URL containing project slug and event_id parameter"
            ]
          }
        ],
        examples: [
          {
            description: "Get event details from a dashboard URL",
            parameters: {
              link: "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"
            },
            expectedOutput: "JSON object with complete event details including stack trace, metadata, and context"
          }
        ],
        hints: [
          "The URL must contain both project slug in the path and event_id in query parameters",
          "This is useful when users share BugSnag dashboard URLs and you need to extract the event data"
        ]
      },
      async (args: any, _extra: any) => {
        if (!args.link) throw new Error("link argument is required");
        const url = new URL(args.link);
        const eventId = url.searchParams.get("event_id");
        const projectSlug = url.pathname.split('/')[2];
        if (!projectSlug || !eventId) throw new Error("Both projectSlug and eventId must be present in the link");

        // get the project id from list of projects
        const projects = await this.getProjects();
        const projectId = projects.find((p: any) => p.slug === projectSlug)?.id;
        if (!projectId) {
          throw new Error("Project with the specified slug not found.");
        }

        const response = await this.getEvent(eventId, projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      }
    );

    register(
      {
        title: "List Project Errors",
        summary: "List and search errors in a project using customizable filters and pagination",
        purpose: "Retrieve filtered list of errors from a project for analysis, debugging, and reporting",
        useCases: [
          "Debug recent application errors by filtering for open errors in the last 7 days",
          "Generate error reports for stakeholders by filtering specific error types or severity levels",
          "Monitor error trends over time using date range filters",
          "Find errors affecting specific users or environments using metadata filters"
        ],
        parameters: [
          {
            name: "filters",
            type: FilterObjectSchema.default({
              "event.since": [{ type: "eq", value: "30d" }],
              "error.status": [{ type: "eq", value: "open" }]
            }),
            description: "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields",
            required: false,
            examples: [
                '{"error.status": [{"type": "eq", "value": "open"}]}',
                '{"event.since": [{"type": "eq", "value": "7d"}]} // Relative time: last 7 days',
                '{"event.since": [{"type": "eq", "value": "2018-05-20T00:00:00Z"}]} // ISO 8601 UTC format',
                '{"user.email": [{"type": "eq", "value": "user@example.com"}]}'
            ],
            constraints: [
              "Time filters support ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h)",
              "ISO 8601 times must be in UTC and use extended format",
              "Relative time periods: h (hours), d (days)"
            ]
          },
          {
            name: "sort",
            type: z.enum(["first_seen", "last_seen", "events", "users", "unsorted"]).default("last_seen"),
            description: "Field to sort the errors by",
            required: false,
            examples: ["last_seen"]
          },
          {
            name: "direction",
            type: z.enum(["asc", "desc"]).default("desc"),
            description: "Sort direction for ordering results",
            required: false,
            examples: ["desc"]
          },
          {
            name: "per_page",
            type: z.number().min(1).max(100).default(30),
            description: "How many results to return per page.",
            required: false,
            examples: ["30", "50", "100"]
          },
          {
            name: "next",
            type: z.string().url(),
            description: "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available.",
            required: false,
            examples: ["https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?offset=30&per_page=30&sort=last_seen"],
            constraints: ["Only values provided in the output from this tool can be used. Do not attempt to construct it manually."]
          },
          ...(this.projectApiKey ? [] : [
            {
              name: "projectId",
              type: z.string(),
              description: "ID of the project to query for errors",
              required: true,
            }
          ])
        ],
        examples: [
          {
            description: "Find errors affecting a specific user in the last 24 hours",
            parameters: {
              filters: {
                "user.email": [{ "type": "eq", "value": "user@example.com" }],
                "event.since": [{ "type": "eq", "value": "24h" }]
              }
            },
            expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
          },
          {
            description: "Get the 10 open errors with the most users affected in the last 30 days",
            parameters: {
              filters: {
                "event.since": [{ "type": "eq", "value": "30d" }],
                "error.status": [{ "type": "eq", "value": "open" }]
              },
              sort: "users",
              direction: "desc",
              per_page: 10
            },
            expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
          },
          {
            description: "Get the next 50 results",
            parameters: {
              next: "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?base=2025-08-29T13%3A11%3A37Z&direction=desc&filters%5Berror.status%5D%5B%5D%5Btype%5D=eq&filters%5Berror.status%5D%5B%5D%5Bvalue%5D=open&offset=10&per_page=10&sort=users",
              per_page: 50
            },
            expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
          }
        ],
        hints: [
          "Use list_project_event_filters tool first to discover valid filter field names for your project",
          "Combine multiple filters to narrow results - filters are applied with AND logic",
          "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
          "Common time filters: event.since (from this time), event.before (until this time)",
          "The 'event.since' filter and 'error.status' filters are always applied and if not specified are set to '30d' and 'open' respectively",
          "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors",
          "This tool returns paged results. The 'count' field indicates the number of results returned in the current page, and the 'total' field indicates the total number of results across all pages.",
          "If the output contains a 'next' value, there are more results available - call this tool again supplying the next URL as a parameter to retrieve the next page.",
          "Do not modify the next URL as this can cause incorrect results. The only other parameter that can be used with 'next' is 'per_page' to control the page size."
        ]
      },
      async (args: any, _extra: any) => {
        const project = await this.getInputProject(args.projectId);

        // Validate filter keys against cached event fields
        if (args.filters) {
          const eventFields = this.cache.get<EventField[]>(cacheKeys.CURRENT_PROJECT_EVENT_FILTERS) || [];
          const validKeys = new Set(eventFields.map(f => f.display_id));
          for (const key of Object.keys(args.filters)) {
            if (!validKeys.has(key)) {
              throw new Error(`Invalid filter key: ${key}`);
            }
          }
        }

        const defaultFilters: FilterObject = {
          "event.since": [{ "type": "eq", "value": "30d" }],
          "error.status": [{ "type": "eq", "value": "open" }]
        }

        const options: ListProjectErrorsOptions = {
          filters: { ...defaultFilters, ...args.filters }
        };

        if (args.sort !== undefined) options.sort = args.sort;
        if (args.direction !== undefined) options.direction = args.direction;
        if (args.per_page !== undefined) options.per_page = args.per_page;
        if (args.next !== undefined) options.next = args.next;

        const response = await this.errorsApi.listProjectErrors(project.id, options);

        const errors = response.body || [];
        const totalCount = response.headers.get('X-Total-Count');
        const linkHeader = response.headers.get('Link');

        const result = {
          data: errors,
          count: errors.length,
          total: totalCount ? parseInt(totalCount) : undefined,
          next: linkHeader?.match(/<([^>]+)>/)?.[1],
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }
    );

    register(
      {
        title: "List Project Event Filters",
        summary: "Get available event filter fields for the current project",
        purpose: "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
        useCases: [
          "Discover what filter fields are available before searching for errors",
          "Find the correct field names for filtering by user, environment, or custom metadata",
          "Understand filter options and data types for building complex queries"
        ],
        parameters: [],
        examples: [
          {
            description: "Get all available filter fields",
            parameters: {},
            expectedOutput: "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options"
          }
        ],
        hints: [
          "Use this tool before the List Errors or Get Error tools to understand available filters",
          "Look for display_id field in the response - these are the field names to use in filters"
        ]
      },
      async (_args: any, _extra: any) => {
        const projectFields = this.cache.get<EventField[]>(cacheKeys.CURRENT_PROJECT_EVENT_FILTERS);
        if (!projectFields) throw new Error("No event filters found in cache.");

        return {
          content: [{ type: "text", text: JSON.stringify(projectFields) }],
        };
      }
    );

    register(
      {
        title: "Update Error",
        summary: "Update the status of an error",
        purpose: "Change an error's workflow state, such as marking it as resolved or ignored",
        useCases: [
          "Mark an error as open, fixed or ignored",
          "Discard or un-discard an error",
          "Update the severity of an error"
        ],
        parameters: [
          ...(this.projectApiKey ? [] : [
            {
              name: "projectId",
              type: z.string(),
              description: "ID of the project that contains the error to be updated",
              required: true,
            }
          ]),
          {
            name: "errorId",
            type: z.string(),
            description: "ID of the error to update",
            required: true,
            examples: ["6863e2af8c857c0a5023b411"]
          },
          {
            name: "operation",
            type: z.enum(PERMITTED_UPDATE_OPERATIONS),
            description: "The operation to apply to the error",
            required: true,
            examples: ["fix", "open", "ignore", "discard", "undiscard"]
          }
        ],
        examples: [
          {
            description: "Mark an error as fixed",
            parameters: {
              errorId: "6863e2af8c857c0a5023b411",
              operation: "fix"
            },
            expectedOutput: "Success response indicating the error was marked as fixed"
          }
        ],
        hints: [
          "Only use valid operations - BugSnag may reject invalid values"
        ],
        readOnly: false,
        idempotent: false,
      },
      async (args: any, _extra: any) => {
        const { errorId, operation } = args;
        const project = await this.getInputProject(args.projectId);

        let severity = undefined;
        if (operation === 'override_severity') {
          // illicit the severity from the user
          const result = await getInput({
            message: "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
            requestedSchema: {
              type: "object",
              properties: {
                severity: {
                  type: "string",
                  enum: ['info', 'warning', 'error'],
                  description: "The new severity level for the error"
                }
              }
            },
            required: ["severity"]
          })

          if (result.action === "accept" && result.content?.severity) {
            severity = result.content.severity;
          }
        }

        const result = await this.updateError(project.id!, errorId, operation, { severity });
        return {
          content: [{ type: "text", text: JSON.stringify({ success: result }) }],
        };
      }
    );

    register(
      {
        title: "List Builds",
        summary: "List builds for a project with optional filtering by release stage",
        purpose: "Retrieve a list of build summaries to analyze deployment history and associated errors",
        useCases: [
          "View recent builds to correlate with error spikes",
          "Filter builds by stage (e.g. production, staging) for targeted analysis",
        ],
        parameters: [
          ...(this.projectApiKey
            ? []
            : [
                {
                  name: "projectId",
                  type: z.string(),
                  description: "ID of the project to list builds for",
                  required: true,
                },
              ]),
          {
            name: "releaseStage",
            type: z.string(),
            description: "Filter builds by this stage (e.g. production, staging)",
            required: false,
            examples: ["production", "staging"],
          },
          {
            name: "nextUrl",
            type: z.string(),
            description:
              "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. If provided, other parameters are ignored.",
            required: false,
            examples: [
              "/projects/515fb9337c1074f6fd000003/builds?offset=30&per_page=30",
            ],
          },
        ],
        examples: [
          {
            description: "List all builds for a project",
            parameters: {},
            expectedOutput: "JSON array of build objects with metadata",
          },
          {
            description: "List production builds for a project",
            parameters: {
              releaseStage: "production",
            },
            expectedOutput: "JSON array of build objects in the production stage",
          },
          {
            description: "Get the next page of results",
            parameters: {
              nextUrl: "/projects/515fb9337c1074f6fd000003/builds?offset=30&per_page=30",
            },
            expectedOutput: "JSON array of build objects with metadata from the next page",
          }
        ],
        hints: ["For more detailed results use the Get Build tool"],
        readOnly: true,
        idempotent: true,
        outputFormat: "JSON array of build summary objects with metadata",
      },
      async (args, _extra) => {
        const project = await this.getInputProject(args.projectId);
        const { builds, nextUrl } = await this.listBuilds(project.id, {
          release_stage: args.releaseStage,
          next_url: args.nextUrl,
        })

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                builds,
                next: nextUrl,
              }),
            }
          ],
        };
      }
    );

    register(
      {
        title: "Get Build",
        summary: "Get more details for a specific build by its ID",
        purpose: "Retrieve detailed information about a build for analysis and debugging",
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
        if (!args.buildId) throw new Error("buildId argument is required");
        const build = await this.getBuild((await this.getInputProject(args.projectId)).id, args.buildId);
        return {
          content: [{ type: "text", text: JSON.stringify(build) }],
        };
      }
    );

    register({
      title: "List Releases",
      summary: "List releases for a project with optional filtering by release stage",
      purpose: "Retrieve a list of release summaries to analyze deployment history and associated errors",
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
          type: z.string(),
          description: "Filter releases by this stage (e.g. production, staging)",
          required: false,
          examples: ["production", "staging"],
        },
        {
          name: "visibleOnly",
          type: z.boolean().default(true),
          description: "Whether to only include releases that are marked as visible (default: true)",
          required: true,
          examples: ["true", "false"],
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
          description: "List all releases for a project",
          parameters: {},
          expectedOutput: "JSON array of release objects with metadata",
        },
        {
          description: "List production releases for a project",
          parameters: {
            releaseStage: "production",
          },
          expectedOutput: "JSON array of release objects in the production stage",
        },
        {
          description: "Get the next page of results",
          parameters: {
            nextUrl: "/projects/515fb9337c1074f6fd000003/releases?offset=30&per_page=30",
          },
          expectedOutput: "JSON array of release objects with metadata from the next page",
        },
      ],
      hints: ["For more detailed results use the Get Release tool"],
      readOnly: true,
      idempotent: true,
      outputFormat: "JSON array of release summary objects with metadata",
    }, async (args, _extra) => {
      const { releases, nextUrl } = await this.listReleases((await this.getInputProject(args.projectId)).id, {
        release_stage_name: args.releaseStage ?? "production",
        visible_only: args.visibleOnly,
        next_url: args.nextUrl ?? null,
      })

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              releases,
              next: nextUrl ?? null,
            }),
          },
        ],
      };
    })

    register({
      title: "Get Release",
      summary: "Get more details for a specific release by its ID",
      purpose: "Retrieve detailed information about a release for analysis and debugging",
      useCases: [
        "View release metadata such as version, source control info, and error counts",
        "Analyze a specific release to correlate with error spikes or deployments",
        "See the stability targets for a project and if the release meets them",
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
    }, async (args, _extra) => {
      if (!args.releaseId) throw new Error("releaseId argument is required");
      const release = await this.getRelease((await this.getInputProject(args.projectId)).id, args.releaseId);
      return {
        content: [{ type: "text", text: JSON.stringify(release) }],
      };
    })

    register({
      title: "List Builds in Release",
      summary: "List builds associated with a specific release",
      purpose: "Retrieve a list of builds for a given release to analyze deployment history and associated errors",
      useCases: [
        "View builds within a release to correlate with error spikes",
        "Analyze the composition of a release by examining its builds",
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
          description: "ID of the release to list builds for",
          required: true,
          examples: ["5f8d0d55c9e77c0017a1b2c3"],
        },
      ],
      examples: [
        {
          description: "List all builds in a specific release",
          parameters: {
            releaseId: "5f8d0d55c9e77c0017a1b2c3",
          },
          expectedOutput: "JSON array of build objects with metadata",
        },
      ],
      hints: ["Release IDs can be found using the List releases tool"],
      readOnly: true,
      idempotent: true,
      outputFormat: "JSON array of build summary objects with metadata",
    }, async (args, _extra) => {
      if (!args.releaseId) throw new Error("releaseId argument is required");
      const builds = await this.listBuildsInRelease(args.releaseId);
      return {
        content: [{ type: "text", text: JSON.stringify(builds) }],
      };
    })
  }

  registerResources(register: RegisterResourceFunction): void {
    register(
      "event",
      "{id}",
      async (uri, variables, _extra) => {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(await this.getEvent(variables.id as string))
          }]
        }
      }
    )
  }
}
