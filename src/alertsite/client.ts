import { z } from "zod";
import type { SmartBearMcpServer } from "../common/server.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";

const ConfigurationSchema = z.object({
  username: z.string().min(1).describe("AlertSite username for authentication"),
  password: z.string().min(1).describe("AlertSite password for authentication"),
});

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface User {
  email: string;
  first_name: string;
  last_name: string;
  guid: string;
  role: string;
  user_number: number;
  work_phone: string;
  home_phone?: string;
  date_joined: string;
  last_api_access?: string;
  last_console_access?: string;
  is_locked_out: boolean;
  is_sso_optional: boolean;
}

interface UsersResponse {
  metadata: {
    resultset: {
      count: number;
      limit?: number;
      offset?: number;
    };
  };
  results: User[];
}

interface ToolResponse {
  [x: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export class AlertSiteClient implements Client {
  name = "AlertSite";
  toolPrefix = "alertsite";
  configPrefix = "AlertSite";
  config = ConfigurationSchema;

  private baseUrl: string = "https://alert-api.dev.aws.alertsite.com"; // Static base URL
  private username: string | undefined;
  private password: string | undefined;
  private accessToken: string | undefined;
  private tokenExpiry: number = 0;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<boolean> {
    this.username = config.username;
    this.password = config.password;
    return true;
  }

  /**
   * Gets or refreshes the access token for AlertSite API calls
   * @returns Promise<string> The access token
   */
  private async getToken(): Promise<string> {
    if (!this.username || !this.password) {
      throw new Error("AlertSite client not configured");
    }

    // Check if token is still valid (with 5-minute buffer)
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
   * @param method HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param body Request body for POST/PUT/PATCH requests
   * @returns Promise<any> The API response
   */
  async call(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: any,
  ): Promise<any> {
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

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      requestOptions.body = JSON.stringify(body);
    }

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

        return retryResponse.status === 204 ? null : await retryResponse.json();
      }

      throw new Error(
        `AlertSite API call failed: ${response.status} - ${await response.text()}`,
      );
    }

    // Handle 204 No Content responses (typically for DELETE operations)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Helper method to find a user by email address
   * @param email The email address to search for
   * @returns Promise<User | null> The user object if found, null if not found
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const usersResponse = await this.call("/api/v3/users", "GET") as UsersResponse;
    
    const user = usersResponse.results?.find(
      (u: User) => u.email.toLowerCase() === email.toLowerCase()
    );
    
    return user || null;
  }

  /**
   * Helper method to format tool responses consistently
   * @param message The message to return
   * @param data Optional data to include as JSON
   * @returns Formatted tool response
   */
  private formatResponse(message: string, data?: any): ToolResponse {
    const text = data 
      ? `${message}\n${JSON.stringify(data, null, 2)}`
      : message;
      
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }

  /**
   * Registers all AlertSite tools with the MCP server
   */
  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    register(
      {
        title: "Create or Add User",
        summary: "Creates a new user in AlertSite with the specified details.",
        inputSchema: z.object({
          email: z.string().email().describe("Email address of the user"),
          first_name: z.string().describe("First name of the user"),
          last_name: z.string().describe("Last name of the user"),
          password: z.string().min(8).describe("Password for the user"),
          role: z.string().describe("Role to assign to the user (e.g., CO-ADMIN, POWER-USER, READONLY, REPORTONLY)"),
          work_phone: z.string().describe("Work phone number of the user"),
        }),
      },
      async (args, _extra) => {
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
        return this.formatResponse("User created successfully:", result);
      },
    );

    // Tool 2: Get all users
    register(
      {
        title: "Get All Users",
        summary: "Gets all users from AlertSite with their details.",
        inputSchema: z.object({}),
      },
      async (_args, _extra) => {
        const usersResponse = await this.call("/api/v3/users", "GET") as UsersResponse;
        return this.formatResponse("All users:", usersResponse);
      },
    );

    // Tool 3: Get user details by email
    register(
      {
        title: "Get User Details",
        summary: "Gets detailed information about a user from AlertSite by email address.",
        inputSchema: z.object({
          email: z
            .string()
            .email()
            .describe("Email address of the user to get details for"),
        }),
      },
      async (args, _extra) => {
        const user = await this.findUserByEmail(args.email);
        
        if (!user) {
          return this.formatResponse(`User with email ${args.email} not found.`);
        }
        
        // Get detailed user information using GUID
        const userDetailsUrl = `/api/v3/users/${encodeURIComponent(user.guid)}`;
        const userDetails = await this.call(userDetailsUrl, "GET");

        return this.formatResponse("User details:", userDetails);
      },
    );

    // Tool 4: Modify existing user
    register(
      {
        title: "Modify User",
        summary: "Modifies an existing user's details in AlertSite by email address.",
        inputSchema: z.object({
          email: z
            .string()
            .email()
            .describe("Email address of the user to modify"),
          first_name: z
            .string()
            .optional()
            .describe("New first name for the user"),
          last_name: z
            .string()
            .optional()
            .describe("New last name for the user"),
          role: z
            .string()
            .optional()
            .describe("New role for the user (e.g. CO-ADMIN, POWER-USER, READONLY, REPORTONLY)"),
          work_phone: z
            .string()
            .optional()
            .describe("New work phone number for the user"),
          home_phone: z
            .string()
            .optional()
            .describe("New home phone number for the user"),
          password: z
            .string()
            .min(8)
            .optional()
            .describe("New password for the user (minimum 8 characters)"),
          confirm_password: z
            .string()
            .min(8)
            .optional()
            .describe("Confirm new password - must match the password field"),
        }),
      },
      async (args, _extra) => {
        const user = await this.findUserByEmail(args.email);
        
        if (!user) {
          return this.formatResponse(`User with email ${args.email} not found.`);
        }
        
        // Validate password confirmation if password is provided
        if (args.password !== undefined) {
          if (args.confirm_password === undefined) {
            return this.formatResponse("Confirm password is required when setting a new password.");
          }
          if (args.password !== args.confirm_password) {
            return this.formatResponse("Password and confirm password do not match.");
          }
        }
        
        // Prepare update data - only include fields that were provided
        const updateData: any = {};
        if (args.first_name !== undefined) updateData.first_name = args.first_name;
        if (args.last_name !== undefined) updateData.last_name = args.last_name;
        if (args.role !== undefined) updateData.role = args.role;
        if (args.work_phone !== undefined) updateData.work_phone = args.work_phone;
        if (args.home_phone !== undefined) updateData.home_phone = args.home_phone;
        if (args.password !== undefined) updateData.password = args.password;
        
        if (Object.keys(updateData).length === 0) {
          return this.formatResponse("No fields provided to update.");
        }
        
        // Update user using GUID
        const updateUrl = `/api/v3/users/${encodeURIComponent(user.guid)}`;
        const result = await this.call(updateUrl, "PATCH", updateData);

        return this.formatResponse(`User ${args.email} updated successfully:`, result);
      },
    );

    // Tool 5: Delete existing user
    register(
      {
        title: "Delete User",
        summary: "Deletes an existing user from AlertSite by email address.",
        inputSchema: z.object({
          email: z
            .string()
            .email()
            .describe("Email address of the user to delete"),
        }),
      },
      async (args, _extra) => {
        const user = await this.findUserByEmail(args.email);
        
        if (!user) {
          return this.formatResponse(`User with email ${args.email} not found.`);
        }
        
        // Delete user by GUID
        const deleteUrl = `/api/v3/users/${encodeURIComponent(user.guid)}`;
        await this.call(deleteUrl, "DELETE");

        return this.formatResponse(`User ${args.email} deleted successfully.`);
      },
    );
  }
}