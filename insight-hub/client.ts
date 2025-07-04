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

const HUB_PREFIX = "00000";
const HUB_API_ENDPOINT = "https://api.insighthub.smartbear.com";
const DEFAULT_API_ENDPOINT = "https://api.bugsnag.com";

const cacheKeys = {
  ORG: "insight_hub_org",
  PROJECTS: "insight_hub_projects",
  CURRENT_PROJECT: "insight_hub_current_project",
  PROJECT_EVENT_FILTERS: "insight_hub_project_event_filters",
}

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
      const projectFields = await this.listProjectEventFields(project.id);
      if (!projectFields || projectFields.length === 0) {
        throw new Error(`No event fields found for project ${project.name}.`);
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
      server.tool(
        "list_insight_hub_projects",
        "List all projects in an organization.",
        {
          page_size: z.number().optional().describe("Number of projects to return per page"),
          page: z.number().optional().describe("Page number to return"),
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

    server.tool(
      "get_insight_hub_error",
      "Get error details from a project",
      {
        errorId: z.string().describe("ID of the error to fetch"),
        ...(!this.projectApiKey ? { projectId: z.string().optional().describe("ID of the project") } : {}),
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
    server.tool(
      "get_insight_hub_error_latest_event",
      "Get the latest event for an error",
      {
        errorId: z.string().describe("ID of the error to get the latest event for"),
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
    server.tool(
      "get_insight_hub_event_details",
      "Get details of a specific event on Insight Hub",
      {
        link: z.string().describe("Link to the event details"),
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
    server.tool(
      "list_insight_hub_project_errors",
      "List errors in the current project based on a set of event filters. Use this tool to find or list errors based on user-provided search filters. You can use the `get_project_event_filters` tool to find valid filters for the current project.",
      {
        filters: FilterObjectSchema.optional().describe("Filters to apply to the error list. Valid filters for a project can be found in the `get_project_event_filters` tool."),
        // Conditionally add projectId only when no project API key is configured
        ...(this.projectApiKey ? {} : {
          projectId: z.string().describe("ID of the project"),
        }),
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
    )

    server.tool(
      "get_project_event_filters",
      "Get the available event filters for the current project. Use this tool to find valid filters for the `list_insight_hub_project_errors` tool.",
      {},
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
    )
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
