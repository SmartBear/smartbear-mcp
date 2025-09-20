import NodeCache from "node-cache";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterResourceFunction, RegisterToolsFunction } from "../common/types.js";
import { CurrentUserAPI, ErrorAPI, Configuration } from "./client/index.js";
import { ProjectAPI } from "./client/api/Project.js";
import { BugsnagSharedServices } from "./shared-services.js";
import { ToolExecutionContext } from "./types.js";
import { BugsnagToolFactory } from "./tool-factory.js";
import { CommonParameterDefinitions } from "./tool-utilities.js";

const HUB_PREFIX = "00000";
const DEFAULT_DOMAIN = "bugsnag.com";
const HUB_DOMAIN = "bugsnag.smartbear.com";

export class BugsnagClient implements Client {
  private currentUserApi: CurrentUserAPI;
  private errorsApi: ErrorAPI;
  private cache: NodeCache;
  private projectApi: ProjectAPI;
  private projectApiKey?: string;
  private apiEndpoint: string;
  private appEndpoint: string;
  private sharedServices: BugsnagSharedServices;

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

    // Initialize shared services
    this.sharedServices = new BugsnagSharedServices(
      this.currentUserApi,
      this.errorsApi,
      this.projectApi,
      this.cache,
      this.appEndpoint,
      this.apiEndpoint,
      this.projectApiKey
    );
  }

  async initialize(): Promise<void> {
    // Trigger caching of org and projects through shared services
    await Promise.all([
      this.sharedServices.getProjects(),
      this.sharedServices.getCurrentProject()
    ]);
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

  /**
   * Register tools with the MCP server using automatic discovery
   */
  async registerTools(register: RegisterToolsFunction, getInput: GetInputFunction): Promise<void> {
    const context: ToolExecutionContext = {
      services: this.sharedServices,
      getInput
    };

    // Use the tool registry with auto-discovery to register all tools
    const tools = await BugsnagToolFactory.discoverTools([]);
    
    for (const tool of tools) {

      if (tool.enableInSingleProjectMode === false && this.projectApiKey) {
        // Skip tools that don't run in single project mode when a project API key is configured
        continue;
      }

      // Convert our tool definition to the MCP server format
      const toolParams = {
        title: tool.definition.title,
        summary: tool.definition.summary,
        purpose: tool.definition.purpose,
        useCases: tool.definition.useCases,
        parameters: tool.definition.parameters.map((param: any) => ({
          name: param.name,
          type: param.type,
          required: param.required,
          description: param.description,
          examples: param.examples,
          constraints: param.constraints
        })),
        examples: tool.definition.examples,
        hints: tool.definition.hints,
        outputFormat: tool.definition.outputFormat
      };

      if (tool.hasProjectIdParameter && !this.projectApiKey) {
        const projectIdParam = CommonParameterDefinitions.projectId(true);
        toolParams.parameters.unshift({
          name: projectIdParam.name,
          type: projectIdParam.type,
          required: projectIdParam.required,
          description: projectIdParam.description,
          examples: projectIdParam.examples,
          constraints: projectIdParam.constraints || undefined
        });
      }

      // Register the tool with the MCP server
      register(toolParams, async (args: any) => {
        const result = await tool.execute(args, context);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      });
    }
  }

  /**
   * Register resources with the MCP server (for backward compatibility)
   */
  registerResources(register: RegisterResourceFunction): void {
    register(
      'event',
      '{id}',
      async (uri: URL) => {
        const id = uri.pathname.split('/').pop() || '';
        const event = await this.sharedServices.getEvent(id);
        if (!event) {
          throw new Error(`Event with ID ${id} not found.`);
        }

        return {
          contents: [
            {
              uri: `bugsnag://event/${id}`,
              mimeType: "application/json",
              text: JSON.stringify(event),
            },
          ],
        };
      }
    );
  }
}
