import { getUserAgent } from "../../common/config.js";

export class AuthService {
  private readonly bearerToken: string;

  constructor(accessToken: string) {
    this.bearerToken = accessToken.trim();
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
      "zscale-source": "smartbear-mcp",
    };
  }
}
