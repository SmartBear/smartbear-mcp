import { getUserAgent } from "../../common/info.ts";

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
