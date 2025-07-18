import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI, Configuration } from "./client/index.js";
import { z } from "zod";
import Bugsnag from "../common/bugsnag.js";
import NodeCache from "node-cache";
import { Organization, Project } from "./client/api/CurrentUser.js";
import { EventField, ProjectAPI } from "./client/api/Project.js";
import { FilterObject, FilterObjectSchema } from "./client/api/filters.js";
import { toolDescriptionTemplate, createParameter, createExample } from "../common/templates.js";

const HUB_PREFIX = "00000";
const HUB_API_ENDPOINT = "https://api.insighthub.smartbear.com";
const DEFAULT_API_ENDPOINT = "https://api.bugsnag.com";

const cacheKeys = {
  ORG: "insight_hub_org",
  PROJECTS: "insight_hub_projects",
  CURRENT_PROJECT: "insight_hub_current_project",
  PROJECT_EVENT_FILTERS: "insight_hub_project_event_filters",
}

// Exclude certain event fields from the project event filters to improve agent usage
const EXCLUDED_EVENT_FIELDS = new Set([
  "search" // This is searches multiple fields and is more a convenience for humans, we're removing to avoid over-matching
]);

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
export class InsightHubClient implements Client {
  private currentUserApi: CurrentUserAPI;
  private errorsApi: ErrorAPI;
  private cache: NodeCache;
  private projectApi: ProjectAPI;
  private projectApiKey?: string;

  constructor(token: string, projectApiKey?: string, endpoint?: string) {
    if (!endpoint) {
      if (projectApiKey && projectApiKey.startsWith(HUB_PREFIX)) {
        endpoint = HUB_API_ENDPOINT;
      } else {
        endpoint = DEFAULT_API_ENDPOINT;
      }
    }
    const config = new Configuration({
      authToken: token,
      headers: {
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      },
      basePath: endpoint,
    });
    this.currentUserApi = new CurrentUserAPI(config);
    this.errorsApi = new ErrorAPI(config);
    this.cache = new NodeCache();
    this.projectApi = new ProjectAPI(config);
    this.projectApiKey = projectApiKey;
  }

  async initialize(): Promise<void> {
    const orgs = await this.listOrgs();
    if (!orgs || orgs.length === 0) {
      throw new Error("No organizations found for the current user.");
    }
    // We should only have one org
    this.cache.set(cacheKeys.ORG, orgs[0]);
    const projects = await this.listProjects(orgs[0].id);
    this.cache.set(cacheKeys.PROJECTS, projects);
    if (this.projectApiKey) {
      const project = projects.find((project) => project.api_key === this.projectApiKey)
      if (!project) {
        throw new Error(`Project with API key ${this.projectApiKey} not found in organization ${orgs[0].name}.`);
      }
      this.cache.set(cacheKeys.CURRENT_PROJECT, project);
      let projectFields = await this.listProjectEventFields(project.id);
      if (!projectFields || projectFields.length === 0) {
        throw new Error(`No event fields found for project ${project.name}.`);
      } else {
        projectFields = projectFields.filter(field => !EXCLUDED_EVENT_FIELDS.has(field.display_id));
      }
      this.cache.set(cacheKeys.PROJECT_EVENT_FILTERS, projectFields);
    }
  }

  async listProjectEventFields(projectId: string) {
    return this.projectApi.listProjectEventFields(projectId);
  }

  async listOrgs(): Promise<any> {
    return this.currentUserApi.listUserOrganizations();
  }

  async listProjects(orgId: string, options?: any): Promise<Project[]> {
    options = {
      ...options,
      paginate: true
    };
    return this.currentUserApi.getOrganizationProjects(orgId, options);
  }

  // This method retrieves all projects for the organization stored in the cache.
  // If no projects are found in the cache, it fetches them from the API and
  // stores them in the cache for future use.
  // It throws an error if no organizations are found in the cache.
  async getProjects(): Promise<Project[]> {
    let projects = this.cache.get<Project[]>(cacheKeys.PROJECTS);
    if (!projects) {
      const org = this.cache.get<Organization>(cacheKeys.ORG);
      if (!org) {
        throw new Error("No organization found in cache.");
      }
      projects = await this.listProjects(org.id);
      this.cache.set(cacheKeys.PROJECTS, projects);
    }
    if (!projects) {
      throw new Error("No projects found.");
    }
    return projects;
  }

  async getErrorDetails(projectId: string, errorId: string): Promise<any> {
    return this.errorsApi.viewErrorOnProject(projectId, errorId);
  }

  async getLatestErrorEvent(errorId: string): Promise<any> {
    return this.errorsApi.viewLatestEventOnError(errorId);
  }

  async getProjectEvent(projectId: string, eventId: string): Promise<any> {
    return this.errorsApi.viewEventById(projectId, eventId);
  }

  async findEventById(eventId: string): Promise<any> {
    const projects = await this.listOrgs().then(([org]) => this.listProjects(org.id));
    const eventDetails = await Promise.all(projects.map((p: any) => this.getProjectEvent(p.id, eventId).catch(_e => null)));
    return eventDetails.find(event => !!event);
  }

  async listProjectErrors(projectId: string, filters?: FilterObject): Promise<any> {
    return this.errorsApi.listProjectErrors(projectId, { filters });
  }

  registerTools(server: McpServer): void {
    if (!this.projectApiKey) {
      server.registerTool(
        "list_insight_hub_projects",
        {
          description: toolDescriptionTemplate({
            summary: "List all projects in the organization with optional pagination",
            purpose: "Retrieve available projects for browsing and selecting which project to analyze",
            useCases: [
              "Browse available projects when no specific project API key is configured",
              "Find project IDs needed for other tools",
              "Get an overview of all projects in the organization"
            ],
            parameters: [
              createParameter(
                "page_size",
                "number",
                false,
                "Number of projects to return per page for pagination",
                {
                  examples: ["10", "25", "50"]
                }
              ),
              createParameter(
                "page",
                "number",
                false,
                "Page number to return (starts from 1)",
                {
                  examples: ["1", "2", "3"]
                }
              )
            ],
            examples: [
              createExample(
                "Get first 10 projects",
                {
                  page_size: 10,
                  page: 1
                },
                "JSON array of project objects with IDs, names, and metadata"
              ),
              createExample(
                "Get all projects (no pagination)",
                {},
                "JSON array of all available projects"
              )
            ],
            hints: [
              "Use pagination for organizations with many projects to avoid large responses",
              "Project IDs from this list can be used with other tools when no project API key is configured"
            ]
          }),
          inputSchema: {
            page_size: z.number().optional().describe("Number of projects to return per page"),
            page: z.number().optional().describe("Page number to return"),
          }
        },
        async (args, _extra) => {
          try {
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
            return {
              content: [{ type: "text", text: JSON.stringify(projects) }],
            };
          } catch (e) {
            Bugsnag.notify(e as unknown as Error);
            throw e;
          }
        }
      );
    }

    server.registerTool(
      "get_insight_hub_error",
      {
        description: toolDescriptionTemplate({
          summary: "Get detailed information about a specific error from a project",
          purpose: "Retrieve error details including metadata, events, and context for debugging",
          useCases: [
            "Investigate a specific error found through list_insight_hub_project_errors",
            "Get error details for debugging and root cause analysis",
            "Retrieve error metadata for incident reports and documentation"
          ],
          parameters: [
            createParameter(
              "errorId",
              "string",
              true,
              "Unique identifier of the error to retrieve",
              {
                examples: ["6863e2af8c857c0a5023b411"]
              }
            ),
            ...(!this.projectApiKey ? [
              createParameter(
                "projectId",
                "string",
                false,
                "ID of the project containing the error (optional if project API key is configured)"
              )
            ] : [])
          ],
          examples: [
            createExample(
              "Get details for a specific error",
              {
                errorId: "6863e2af8c857c0a5023b411"
              },
              "JSON object with error details including message, stack trace, occurrence count, and metadata"
            )
          ],
          hints: [
            "Error IDs can be found using the list_insight_hub_project_errors tool",
            "Use this after filtering errors to get detailed information about specific errors"
          ]
        }),
        inputSchema: {
          errorId: z.string().describe("ID of the error to fetch"),
          ...(!this.projectApiKey ? { projectId: z.string().optional().describe("ID of the project") } : {}),
        }
      },
      async (args, _extra) => {
        try {
          const projectId = typeof args.projectId === 'string' ? args.projectId : this.cache.get<Project>(cacheKeys.CURRENT_PROJECT)?.id;
          if (!projectId || !args.errorId) throw new Error("Both projectId and errorId arguments are required");
          const response = await this.getErrorDetails(projectId, args.errorId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    );
    server.registerTool(
      "get_insight_hub_error_latest_event",
      {
        description: toolDescriptionTemplate({
          summary: "Get the most recent event of a specific error",
          purpose: "Retrieve the latest event (occurrence) of an error to understand when it last happened and its details",
          useCases: [
            "Get the most recent occurrence of an error for immediate debugging",
            "Understand the latest context and stack trace for an ongoing issue",
            "Check when an error last occurred and with what parameters"
          ],
          parameters: [
            createParameter(
              "errorId",
              "string",
              true,
              "Unique identifier of the error to get the latest event for",
              {
                examples: ["6863e2af8c857c0a5023b411"]
              }
            )
          ],
          examples: [
            createExample(
              "Get the latest event for an error",
              {
                errorId: "6863e2af8c857c0a5023b411"
              },
              "JSON object with the most recent event details including timestamp, stack trace, and context"
            )
          ],
          hints: [
            "This shows the most recent occurrence - use get_insight_hub_error for aggregated details of all events grouped into the error",
            "The event includes detailed context like user information, request data, and environment details"
          ]
        }),
        inputSchema: {
          errorId: z.string().describe("ID of the error to get the latest event for"),
        }
      },
      async (args, _extra) => {
        try {
          if (!args.errorId) throw new Error("errorId argument is required");
          const response = await this.getLatestErrorEvent(args.errorId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    );
    server.registerTool(
      "get_insight_hub_event_details",
      {
        description: toolDescriptionTemplate({
          summary: "Get detailed information about a specific event using its Insight Hub dashboard URL",
          purpose: "Retrieve event details directly from an Insight Hub web interface URL for quick debugging",
          useCases: [
            "Get event details when given an Insight Hub dashboard URL from a user or notification",
            "Extract event information from shared links or browser URLs",
            "Quick lookup of event details without needing separate project and event IDs"
          ],
          parameters: [
            createParameter(
              "link",
              "string",
              true,
              "Full URL to the event details page in the Insight Hub dashboard (web interface)",
              {
                examples: [
                  "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"
                ],
                constraints: [
                  "Must be a valid Insight Hub dashboard URL containing project slug and event_id parameter"
                ]
              }
            )
          ],
          examples: [
            createExample(
              "Get event details from Insight Hub URL",
              {
                link: "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"
              },
              "JSON object with complete event details including stack trace, metadata, and context"
            )
          ],
          hints: [
            "The URL must contain both project slug in the path and event_id in query parameters",
            "This is useful when users share Insight Hub dashboard URLs and you need to extract the event data"
          ]
        }),
        inputSchema: {
          link: z.string().describe("Link to the event details"),
        }
      },
      async (args, _extra) => {
        try {
          if (!args.link) throw new Error("link argument is required");
          const url = new URL(args.link);
          const eventId = url.searchParams.get("event_id");
          const projectSlug = url.pathname.split('/')[2];
          if (!projectSlug || !eventId) throw new Error("Both projectSlug and eventId must be present in the link");

          // get the project id from list of projects
          const projects = this.cache.get<Project[]>("insight_hub_projects");
          if (!projects) {
            throw new Error("No projects found in cache.");
          }
          const projectId = projects.find((p: any) => p.slug === projectSlug)?.id;
          if (!projectId) {
            throw new Error("Project with the specified slug not found.");
          }

          const response = await this.getProjectEvent(projectId, eventId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    );
    // Dynamically infer the filters schema from cached project event fields
    server.registerTool(
      "list_insight_hub_project_errors",
      {
        description: toolDescriptionTemplate({
          summary: "List and search errors in a project using customizable filters",
          purpose: "Retrieve filtered list of errors from a project for analysis, debugging, and reporting",
          useCases: [
            "Debug recent application errors by filtering for open errors in the last 7 days",
            "Generate error reports for stakeholders by filtering specific error types or severity levels",
            "Monitor error trends over time using date range filters",
            "Find errors affecting specific users or environments using metadata filters"
          ],
          parameters: [
            createParameter(
              "filters",
              "FilterObject",
              false,
              "Apply filters to narrow down the error list. Use get_project_event_filters to discover available filter fields",
              {
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
            ),
            ...(this.projectApiKey ? [] : [
              createParameter(
                "projectId",
                "string",
                true,
                "ID of the project to query for errors"
              )
            ])
          ],
          examples: [
            createExample(
              "Find errors affecting a specific user in the last 24 hours",
              {
                filters: {
                  "user.email": [{ "type": "eq", "value": "user@example.com" }],
                  "event.since": [{ "type": "eq", "value": "24h" }]
                }
              }
            )
          ],
          hints: [
            "Use get_project_event_filters tool first to discover valid filter field names for your project",
            "Combine multiple filters to narrow results - filters are applied with AND logic",
            "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
            "Common time filters: event.since (from this time), event.before (until this time)",
            "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors"
          ]
        }),
        inputSchema: {
          filters: FilterObjectSchema.optional().describe("Filters to apply to the error list. Valid filters for a project can be found in the `get_project_event_filters` tool."),
          // Conditionally add projectId only when no project API key is configured
          ...(this.projectApiKey ? {} : {
            projectId: z.string().describe("ID of the project"),
          }),
        }
      },
      async (args, _extra) => {
        try {
          const projectId = typeof args.projectId === 'string' ? args.projectId : this.cache.get<Project>(cacheKeys.CURRENT_PROJECT)?.id;
          if (!projectId) throw new Error("projectId argument is required");

          // Optionally, validate filter keys against cached event fields
          const eventFields = this.cache.get<EventField[]>(cacheKeys.PROJECT_EVENT_FILTERS) || [];
          if (args.filters) {
            const validKeys = new Set(eventFields.map(f => f.display_id));
            for (const key of Object.keys(args.filters)) {
              if (!validKeys.has(key)) {
                throw new Error(`Invalid filter key: ${key}`);
              }
            }
          }
          const response = await this.listProjectErrors(projectId, args.filters);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    );

    server.registerTool(
      "get_project_event_filters",
      {
        description: toolDescriptionTemplate({
          summary: "Get available event filter fields for the current project",
          purpose: "Discover valid filter field names and options that can be used with list_insight_hub_project_errors",
          useCases: [
            "Discover what filter fields are available before searching for errors",
            "Find the correct field names for filtering by user, environment, or custom metadata",
            "Understand filter options and data types for building complex queries"
          ],
          parameters: [],
          examples: [
            createExample(
              "Get all available filter fields",
              {},
              "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options"
            )
          ],
          hints: [
            "Use this tool before list_insight_hub_project_errors to understand available filters",
            "Look for display_id field in the response - these are the field names to use in filters"
          ]
        }),
        inputSchema: {}
      },
      async (_args, _extra) => {
        try {
          const eventFields = this.cache.get<EventField[]>(cacheKeys.PROJECT_EVENT_FILTERS);
          if (!eventFields) throw new Error("No event filters found in cache.");
          return {
            content: [{ type: "text", text: JSON.stringify(eventFields) }],
          };
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    );
  }

  registerResources(server: McpServer): void {
    server.resource(
      "insight_hub_event",
      new ResourceTemplate("insighthub://event/{id}", { list: undefined }),
      async (uri, { id }) => {
        try {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify(await this.findEventById(id as string))
            }]
          }
        } catch (e) {
          Bugsnag.notify(e as unknown as Error);
          throw e;
        }
      }
    )
  }
}
