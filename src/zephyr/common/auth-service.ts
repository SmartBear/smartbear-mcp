import { USER_AGENT } from "../../common/info";

export class AuthService {
  private readonly bearerToken: string;

  constructor(accessToken: string) {
    this.bearerToken = accessToken.trim();
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "zscale-source": "smartbear-mcp",
    };
  }
}
