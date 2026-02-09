import { ToolError } from "../common/tools";

export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class OAuthService {
  static async startDeviceAuth(
    authorityUrl: string,
    clientId: string,
    scope: string,
  ): Promise<DeviceAuthResponse> {
    const params = JSON.stringify({
      client_id: clientId,
      scope: scope,
    });

    console.log(
      "Starting device auth with url:",
      `${authorityUrl}/device/authorize`,
      "and params:",
      params,
    );
    const response = await fetch(`${authorityUrl}/device/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: params,
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to start device auth: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as DeviceAuthResponse;
  }

  static async pollToken(
    authorityUrl: string,
    clientId: string,
    deviceCode: string,
  ): Promise<TokenResponse> {
    const params = JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: clientId,
      device_code: deviceCode,
    });

    const response = await fetch(`${authorityUrl}/device/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === "authorization_pending") {
        throw new ToolError("authorization_pending");
      }
      if (data.error === "slow_down") {
        throw new ToolError("slow_down");
      }
      if (data.error === "expired_token") {
        throw new ToolError("expired_token");
      }
      if (data.error === "access_denied") {
        throw new ToolError("access_denied");
      }

      throw new ToolError(
        `Failed to poll token: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`,
      );
    }

    return data as TokenResponse;
  }
}
