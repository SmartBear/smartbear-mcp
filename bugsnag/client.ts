import NodeCache from "node-cache";
import { z } from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterResourceFunction, RegisterToolsFunction } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI, Configuration } from "./client/index.js";
import { Organization, Project } from "./client/api/CurrentUser.js";
import { EventField, ProjectAPI } from "./client/api/Project.js";
import { FilterObject, FilterObjectSchema, toQueryString } from "./client/api/filters.js";
import { ListProjectErrorsOptions } from "./client/api/Error.js";

const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

const cacheKeys = {
  ORG: "bugsnag_org",
  PROJECTS: "bugsnag_projects",
  CURRENT_PROJECT: "bugsnag_current_project",
  CURRENT_PROJECT_EVENT_FILTERS: "bugsnag_current_project_event_filters",
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
    this.cache = new NodeCache();
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
      const options = {
        paginate: true
      };
      const response = await this.currentUserApi.getOrganizationProjects(org.id, options);
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

    // Dynamically infer the filters schema from cached project event fields
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
            type: FilterObjectSchema,
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
            type: z.enum(["first_seen", "last_seen", "events", "users", "unsorted"]),
            description: "Field to sort the errors by (default: last_seen)",
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
            type: z.number().min(1).max(100),
            description: "How many results to return per page.",
            required: false,
            examples: ["30", "50", "100"]
          },
          {
            name: "next",
            type: z.string().url(),
            description: "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available.",
            required: false,
            examples: ["https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?offset=590bce131f7314d98eac23ba&sort=last_seen"],
            constraints: ["Only values provided in the output from this tool can be used."]
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
          }
        ],
        hints: [
          "Use list_project_event_filters tool first to discover valid filter field names for your project",
          "Combine multiple filters to narrow results - filters are applied with AND logic",
          "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
          "Common time filters: event.since (from this time), event.before (until this time)",
          "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors",
          "This tool returns paged results, with a maximum page size of 100.",
          "The 'count' field indicates the number of results returned in the current page, and the 'total' field indicates the total number of results across all pages.",
          "If the output contains a 'next' value, there are more results available - call this tool again supplying the next URL as a parameter to retrieve the next page.",
          "Do not attempt to get the next page of results using any parameters other than 'next'."
        ]
      },
      async (args: any, _extra: any) => {
        const project = await this.getInputProject(args.projectId);

        // Validate filter keys against cached event fields
        const eventFields = this.cache.get<EventField[]>(cacheKeys.CURRENT_PROJECT_EVENT_FILTERS) || [];
        if (args.filters) {
          const validKeys = new Set(eventFields.map(f => f.display_id));
          for (const key of Object.keys(args.filters)) {
            if (!validKeys.has(key)) {
              throw new Error(`Invalid filter key: ${key}`);
            }
          }
        }

        const options: ListProjectErrorsOptions = {};
        if (args.filters) options.filters = args.filters;
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
