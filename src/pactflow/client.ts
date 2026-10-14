import z from "zod";
import type { CacheService } from "../common/cache";
import { getUserAgent } from "../common/info";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types";
import { AdminApi } from "./client/admin-api";
import { AIApi } from "./client/ai-api";
import { ContractApi } from "./client/contract-api";
import { EnvironmentApi } from "./client/environment-api";
import { HttpClient } from "./client/http-client";
import { PacticipantApi } from "./client/pacticipant-api";
import { withPagination } from "./client/pagination";
import { PROMPTS } from "./client/prompts";
import { type ClientType, TOOLS } from "./client/tools";
import { WebhookApi } from "./client/webhook-api";

const ConfigurationSchema = z.object({
  base_url: z.url().describe("Pact Broker or PactFlow base URL"),
  token: z
    .string()
    .optional()
    .describe(
      "Bearer token for PactFlow authentication (use this OR username/password)",
    ),
  username: z.string().optional().describe("Username for Pact Broker"),
  password: z.string().optional().describe("Password for Pact Broker"),
});

function collection(response: any, key: string): any[] {
  if (Array.isArray(response[key])) return response[key];
  if (Array.isArray(response._embedded?.[key])) return response._embedded[key];
  return [];
}

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: needed for dynamic handler dispatch via Object.assign in configure()
export class PactflowClient implements Client {
  name = "Contract Testing";
  capabilityPrefix = "contract-testing";
  configPrefix = "Pact-Broker";
  config = ConfigurationSchema;

  private token: string | undefined;
  private username: string | undefined;
  private password: string | undefined;

  private _clientType: ClientType | undefined;
  private _server: SmartBearMcpServer | undefined;
  private cache: CacheService | undefined;

  private http!: HttpClient;
  private handlerMap!: Record<string, (...args: any[]) => Promise<any>>;

  get server(): SmartBearMcpServer {
    if (!this._server) throw new Error("Server not configured");
    return this._server;
  }

  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this.token = config.token;
    this.username = config.username;
    this.password = config.password;

    if (typeof config.token === "string") {
      this._clientType = "pactflow";
    } else if (
      typeof config.username === "string" &&
      typeof config.password === "string"
    ) {
      this._clientType = "pact_broker";
    } else {
      this._clientType = "pactflow";
    }

    this._server = server;
    this.cache = server.getCache();

    this.http = new HttpClient(config.base_url, () => this.requestHeaders);

    const aiBaseUrl = `${config.base_url}/api/ai`;

    this.handlerMap = {
      ...new PacticipantApi(this.http).handlers,
      ...new EnvironmentApi(this.http).handlers,
      ...new ContractApi(this.http).handlers,
      ...new WebhookApi(this.http).handlers,
      ...new AdminApi(this.http).handlers,
      ...new AIApi(this.http, aiBaseUrl).handlers,
    };
    this.handlerMap.getBranchBdctSummary = this.getBranchBdctSummary.bind(this);
    Object.assign(this as any, this.handlerMap);
  }

  async getBranchBdctSummary({
    pacticipantName,
    limit = 5,
  }: {
    pacticipantName: string;
    limit?: number;
  }) {
    const listBranches = this.handlerMap.listBranches;
    const getBranchVersions = this.handlerMap.getBranchVersions;
    const getCrossContractResults =
      this.handlerMap.getBiDirectionalCrossContractVerificationResults;
    const branchResponse = await listBranches({
      pacticipantName,
      pageNumber: 1,
      pageSize: limit,
    });
    const branches = collection(branchResponse, "branches");

    return {
      pacticipantName,
      branches: await Promise.all(
        branches.slice(0, limit).map(async (branch: any) => {
          const branchName = String(branch.name ?? branch.branchName ?? "");
          try {
            const versionsResponse = await getBranchVersions({
              pacticipantName,
              branchName,
              pageNumber: 1,
              pageSize: 1,
            });
            const versions = collection(versionsResponse, "versions");
            const version = versions[0];
            const versionNumber = version?.number ?? version?.version;
            if (!versionNumber) {
              return {
                branch,
                branchName,
                status: "unknown",
                reason: "No published versions",
              };
            }
            const bdct = await getCrossContractResults({
              providerName: pacticipantName,
              providerVersionNumber: String(versionNumber),
            });
            return { branch, branchName, version: versionNumber, bdct };
          } catch (error) {
            return {
              branch,
              branchName,
              status: "unknown",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not load BDCT results",
            };
          }
        }),
      ),
    };
  }

  isConfigured(): boolean {
    return this.http !== undefined;
  }

  get requestHeaders(): Record<string, string> | undefined {
    let contextToken =
      getRequestHeader("Pact-Token") || getRequestHeader("Authorization");

    if (Array.isArray(contextToken)) {
      contextToken = contextToken[0];
    }

    if (contextToken) {
      let authHeader = contextToken;
      if (
        !contextToken.startsWith("Basic ") &&
        !contextToken.startsWith("Bearer ")
      ) {
        authHeader = `Bearer ${contextToken}`;
      }
      return {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": getUserAgent(),
      };
    }

    if (this.token) {
      let authHeader = this.token;
      if (
        !authHeader.startsWith("Basic ") &&
        !authHeader.startsWith("Bearer ")
      ) {
        authHeader = `Bearer ${authHeader}`;
      }
      return {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": getUserAgent(),
      };
    } else if (this.username && this.password) {
      const authString = `${this.username}:${this.password}`;
      return {
        Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": getUserAgent(),
      };
    }
    return undefined;
  }

  async registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void> {
    let disablePactflowAItools = false;
    try {
      const aiApi = new AIApi(this.http, `${this.http.baseUrl}/api/ai`);
      const entitlement = await aiApi.checkAIEntitlements();
      if (entitlement && !entitlement.aiEnabled) {
        disablePactflowAItools = true;
      }
    } catch (error) {
      if (
        error instanceof ToolError &&
        error.metadata?.get("responseStatus") === 404
      ) {
        disablePactflowAItools = true;
      }
    }

    for (const tool of TOOLS.filter(
      (t) => !this._clientType || t.clients.includes(this._clientType),
    )) {
      if (
        tool.tags &&
        disablePactflowAItools &&
        tool.tags.includes("pactflow-ai")
      ) {
        continue;
      }

      const { handler, clients: _, formatResponse, ...toolParams } = tool;
      register(toolParams, async (args, _ctx) => {
        const handler_fn = this.handlerMap[handler];
        if (typeof handler_fn !== "function") {
          throw new Error(`Handler '${handler}' not found on PactClient`);
        }

        let result: any;
        if (tool.paginated) {
          if (!this.http || !this.cache) {
            throw new ToolError(
              "PactflowClient must be configured before registering paginated tools",
            );
          }
          result = await withPagination(handler_fn, handler, args, {
            baseUrl: this.http.baseUrl,
            authToken: this.requestHeaders?.Authorization,
            cache: this.cache,
          });
        } else if (tool.enableElicitation) {
          result = await handler_fn(args, getInput);
        } else {
          result = await handler_fn(args);
        }

        if (formatResponse) {
          const response = formatResponse(result);
          return {
            ...response,
            _meta: {
              contractTesting: {
                ...((response._meta as Record<string, unknown> | undefined)
                  ?.contractTesting as Record<string, unknown>),
                result,
                args,
                tool: { title: tool.title, handler },
              },
            },
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          _meta: {
            contractTesting: {
              result,
              args,
              tool: { title: tool.title, handler },
            },
          },
        };
      });
    }
  }

  async registerPrompts(register: RegisterPromptFunction): Promise<void> {
    for (const prompt of PROMPTS) {
      register(
        {
          title: prompt.title,
          description: prompt.description,
          argsSchema: prompt.argsSchema,
        },
        prompt.callback,
      );
    }
  }
}

// Declaration merge — allows pact tests to call handler methods directly on the
// instance (e.g. client.canIDeploy(...)) after Object.assign populates them at
// runtime inside configure(). TypeScript needs the index signature to accept
// arbitrary string-keyed property access on the class instance.
export interface PactflowClient {
  [key: string]: any;
}
