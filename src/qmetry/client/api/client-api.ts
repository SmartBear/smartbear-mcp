import { getUserAgent } from "../../../common/info";
import { QMETRY_DEFAULTS } from "../../config/constants";
import type { RequestOptions } from "../../types/common";
import {
  handleQMetryApiError,
  handleQMetryFetchError,
  readQMetryJson,
} from "./error-handler";

/**
 * QMetry API request function with centralized error handling.
 *
 * Every failure (non-2xx response, network error) throws a `QMetryApiError`,
 * which the common tool wrapper returns to the model as an `isError: true`
 * result.
 *
 * @param options Request configuration including authentication token
 * @returns Parsed JSON response from QMetry API
 * @throws QMetryApiError for failed calls; ToolError for unreadable 2xx bodies
 */
export async function qmetryRequest<T>({
  method = "GET",
  path,
  token,
  project,
  baseUrl,
  body,
  extraHeaders,
}: RequestOptions): Promise<T> {
  const url: string = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    "User-Agent": getUserAgent(),
    "qmetry-source": "smartbear-mcp",
  };
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const transportMode = process.env.MCP_TRANSPORT?.toLowerCase() || "stdio";
  if (transportMode === "http") {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers.apikey = token;
  }
  const init: RequestInit = {
    method,
    headers,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    init.body = JSON.stringify(body);
  }

  let res: Response;

  try {
    res = await fetch(url, init);
  } catch (error) {
    // No response at all: network failure or TLS error
    handleQMetryFetchError(error, url, baseUrl);
  }

  if (!res.ok) {
    await handleQMetryApiError(res, url);
  }

  return readQMetryJson<T>(res, url);
}
