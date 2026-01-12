import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../common/info";

export class AuthService {
  private readonly bearerToken: string;

  constructor(accessToken: string) {
    this.bearerToken = accessToken.trim();
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      "zscale-source": "smartbear-mcp",
    };
  }
}
