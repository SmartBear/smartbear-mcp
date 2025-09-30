import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info.ts";
import { QMETRY_DEFAULTS } from "../../config/constants.ts";
import type { RequestOptions } from "../../types/common.ts";

export async function qmetryRequest<T>({
  method = "GET",
  path,
  token,
  project,
  baseUrl,
  body,
}: RequestOptions): Promise<T> {
  const url: string = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    apikey: token,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const init: RequestInit = {
    method,
    headers,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    init.body = JSON.stringify(body);
  }

  const res: Response = await fetch(url, init);

  if (!res.ok) {
    let errorText: string;
    try {
      const contentType: string | null = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json: Record<string, any> = await res.json();
        errorText = JSON.stringify(json);
      } else {
        errorText = await res.text();
      }
    } catch {
      errorText = res.statusText;
    }
    throw new Error(`QMetry API request failed (${res.status}): ${errorText}`);
  }

  return (await res.json()) as T;
}
