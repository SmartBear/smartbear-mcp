import { z } from "zod";
import type { SmartBearMcpServer } from "../common/server.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";

const ConfigurationSchema = z.object({
  base_url: z.string().url().describe("AlertSite API base URL"),
  username: z.string().min(1).describe("AlertSite username for authentication"),
  password: z.string().min(1).describe("AlertSite password for authentication"),
});

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class AlertSiteClient implements Client {
  name = "AlertSite";
  toolPrefix = "alertsite";
  configPrefix = "AlertSite";
  config = ConfigurationSchema;

  private baseUrl: string | undefined;
  private username: string | undefined;
  private password: string | undefined;
  private accessToken: string | undefined;
  private tokenExpiry: number = 0;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<boolean> {
    this.baseUrl = config.base_url;
    this.username = config.username;
    this.password = config.password;
    return true;
  }

  /**
   * Gets or refreshes the access token for AlertSite API calls
   * @returns Promise<string> The access token
   */
  private async getToken(): Promise<string> {
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error("AlertSite client not configured");
    }

    // Check if token is still valid (with 5 minute buffer)
    const currentTime = Date.now() / 1000;
    if (this.accessToken && this.tokenExpiry > currentTime + 300) {
      return this.accessToken;
    }

    // Get new token
    const tokenUrl = `${this.baseUrl}/api/v3/access-tokens`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AlertSite token request failed: ${response.status} - ${await response.text()}`,
      );
    }

    const tokenData: TokenResponse = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = currentTime + tokenData.expires_in;

    return this.accessToken;
  }

  /**
   * Makes an authenticated API call to AlertSite
   * @param endpoint The API endpoint (relative to base URL)
   * @param method HTTP method (GET, POST, PUT, DELETE)
   * @param body Request body for POST/PUT requests
   * @returns Promise<any> The API response
   */
  async call(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: any,
  ): Promise<any> {
    if (!this.baseUrl) {
      throw new Error("AlertSite client not configured");
    }

    // Get valid token (will refresh if needed)
    const token = await this.getToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    console.log("Making AlertSite API call:", { url, method, body });
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // If token expired, try to refresh and retry once
      if (response.status === 401) {
        this.accessToken = undefined;
        this.tokenExpiry = 0;
        const newToken = await this.getToken();
        headers.Authorization = `Bearer ${newToken}`;
        
        const retryResponse = await fetch(url, { ...requestOptions, headers });
        if (!retryResponse.ok) {
          throw new Error(
            `AlertSite API call failed after token refresh: ${retryResponse.status} - ${await retryResponse.text()}`,
          );
        }
        
        return await retryResponse.json();
      }

      throw new Error(
        `AlertSite API call failed: ${response.status} - ${await response.text()}`,
      );
    }
    
    if (response.status === 204) {
  return {
    content: [
      {
        type: "text",
        text: `User deleted successfully.`,
      },
    ],
  };
}
    return await response.json();
  }

  /**
   * Registers all AlertSite tools with the MCP server
   */
  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    // Tool 1: Create a URL based monitor
    register(
      {
        title: "Create URL Monitor",
        summary: "Creates a new URL-based monitor in AlertSite.",
        inputSchema: z.object({
          name: z.string().describe("Name of the monitor"),
          url: z.string().url().describe("URL to monitor"),
          interval: z
            .number()
            .optional()
            .describe("Monitoring interval in minutes (default: 15)"),
          locations: z
            .array(z.string())
            .optional()
            .describe("Monitoring locations (default: all available)"),
          alertEmail: z
            .string()
            .email()
            .optional()
            .describe("Email address for alerts"),
        }),
      },
      async (args, _extra) => {
        const monitorData = {
          name: args.name,
          url: args.url,
          interval: args.interval || 15,
          locations: args.locations || [],
          alertEmail: args.alertEmail,
          type: "url",
        };

        const result = await this.call("/api/monitors", "POST", monitorData);
        return {
          content: [
            {
              type: "text",
              text: `Successfully created URL monitor: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );

    // Tool 2: Run TOD (Test On Demand) for a URL
    register(
      {
        title: "Run Test On Demand",
        summary: "Runs a Test On Demand (TOD) for a specific URL.",
        inputSchema: z.object({
          url: z.string().url().describe("URL to test"),
          locations: z
            .array(z.string())
            .optional()
            .describe("Test locations (default: all available)"),
          testType: z
            .enum(["performance", "availability", "full"])
            .optional()
            .describe("Type of test to run (default: availability)"),
        }),
      },
      async (args, _extra) => {
        const todData = {
          url: args.url,
          locations: args.locations || [],
          testType: args.testType || "availability",
        };

        const result = await this.call("/api/tod", "POST", todData);
        return {
          content: [
            {
              type: "text",
              text: `Test On Demand initiated: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );

    // Tool 3: Create a SLA report
    register(
      {
        title: "Create SLA Report",
        summary: "Creates a Service Level Agreement (SLA) report.",
        inputSchema: z.object({
          monitorIds: z
            .array(z.string())
            .describe("Array of monitor IDs to include in the report"),
          startDate: z
            .string()
            .describe("Report start date (YYYY-MM-DD format)"),
          endDate: z
            .string()
            .describe("Report end date (YYYY-MM-DD format)"),
          reportName: z
            .string()
            .optional()
            .describe("Name of the SLA report"),
          threshold: z
            .number()
            .min(0)
            .max(100)
            .optional()
            .describe("SLA threshold percentage (default: 99.9)"),
        }),
      },
      async (args, _extra) => {
        const reportData = {
          monitorIds: args.monitorIds,
          startDate: args.startDate,
          endDate: args.endDate,
          reportName: args.reportName || `SLA Report ${new Date().toISOString().split('T')[0]}`,
          threshold: args.threshold || 99.9,
        };

        const result = await this.call("/api/reports/sla", "POST", reportData);
        return {
          content: [
            {
              type: "text",
              text: `SLA report created: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );

    // Tool 4: Add a role-based user
    register(
      {
        title: "Add Role-Based User",
        summary: "Adds a new user with specified role to AlertSite.",
        inputSchema: z.object({
          email: z.string().email().describe("Email address of the user"),
          first_name: z.string().describe("First name of the user"),
          last_name: z.string().describe("Last name of the user"),
          password: z.string().min(8).describe("Password for the user"),
          role: z.string().describe("Role to assign to the user (e.g. CO-ADMIN, POWER-USER, READONLY, REPORTONLY)"),
          work_phone: z.string().describe("Work phone number of the user"),
        }),
      },
      async (args, _extra) => {
        // Get current date in ISO format (UTC, no milliseconds)
        const now = new Date();
        const date_joined = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const userData = {
          date_joined,
          email: args.email,
          first_name: args.first_name,
          last_name: args.last_name,
          password: args.password,
          role: args.role,
          work_phone: args.work_phone,
        };

        const result = await this.call("/api/v3/users", "POST", userData);
        return {
          content: [
            {
              type: "text",
              text: `User created successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );

    // Tool 5: Delete existing user
    register(
      {
        title: "Delete User",
        summary: "Deletes an existing user from AlertSite.",
        inputSchema: z.object({
          userId: z
            .string()
            .describe("User ID or username of the user to delete"),
        }),
      },
      async (args, _extra) => {
        const deleteUrl = `/api/v3/users/${encodeURIComponent(args.userId)}`;
        const result = await this.call(deleteUrl, "DELETE");

        return {
          content: [
            {
              type: "text",
              text: `User deleted successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );
  }
}