import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI, Configuration } from "./client/index.js";
import { z } from "zod";
import Bugsnag from "../common/bugsnag.js";

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

  constructor(token: string) {
    const config = new Configuration({
      authToken: token,
      headers: {
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
      },
      basePath: "https://api.bugsnag.com",
    });
    this.currentUserApi = new CurrentUserAPI(config);
    this.errorsApi = new ErrorAPI(config);
  }

  async listOrgs(): Promise<any> {
    return this.currentUserApi.listUserOrganizations();
  }

  async listProjects(orgId: string, options?: any ): Promise<any> {
    options = {
      ...options,
      paginate: true
    };
    return this.currentUserApi.getOrganizationProjects(orgId, options);
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
    const eventDetails = await Promise.all(projects.map((p: any) => this.getProjectEvent(p.id, eventId).catch(e => null)));
    return eventDetails.find(event => !!event);
  }

registerTools(server: McpServer): void {
  server.tool(
    "list_insight_hub_projects",
    "List all projects in an organization",
    { orgId: z.string().describe("ID of the organization to list projects for") },
    async (args, _extra) => {
      try {
        if (!args.orgId) throw new Error("orgId argument is required");
        const response = await this.listProjects(args.orgId);
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
    "get_insight_hub_error",
    "Get error details from a project",
    {
      projectId: z.string().describe("ID of the project"),
      errorId: z.string().describe("ID of the error to fetch"),
    },
    async (args, _extra) => {
      try {
        if (!args.projectId || !args.errorId) throw new Error("Both projectId and errorId arguments are required");
        const response = await this.getErrorDetails(args.projectId, args.errorId);
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
        // limitation: this assumes a single page of results, so will not work for orgs with >100 projects
        const orgId = await this.currentUserApi.listUserOrganizations().then(orgs => orgs[0].id);
        const projectId = await this.listProjects(orgId).then(projects => projects.find((p: any) => p.slug === projectSlug)?.id);

        const response = await this.getProjectEvent(projectId, eventId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
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
    "insight_hub_orgs",
    "insighthub://orgs",
    { description: "List all organizations in Insight Hub", mimeType: "application/json" },
    async (uri) => {
      try {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(await this.listOrgs())
          }]
        }
      } catch (e) {
        Bugsnag.notify(e as unknown as Error);
        throw e;
      }
    }
  );

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
