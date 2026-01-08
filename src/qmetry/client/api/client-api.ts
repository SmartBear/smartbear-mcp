import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info";
import { QMETRY_DEFAULTS } from "../../config/constants";
import type { RequestOptions } from "../../types/common";
import {
  handleQMetryApiError,
  handleQMetryFetchError,
} from "./error-handler";

/**
 * QMetry API request function with centralized error handling.
 *
 * Handles authentication, project access, CORS, and generic API errors with
 * user-friendly messages and troubleshooting guidance.
 *
 * @param options Request configuration including authentication token
 * @returns Parsed JSON response from QMetry API
 * @throws User-friendly errors with detailed troubleshooting steps for various scenarios
 */
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

  let res: Response;

  try {
    res = await fetch(url, init);
  } catch (error) {
    // Handle fetch errors (CORS, network issues, SSL certificate issues, etc.)
    handleQMetryFetchError(
      error instanceof Error ? error : new Error(String(error)),
      baseUrl,
      project,
      path,
    );
  }

  if (!res.ok) {
    // Use centralized error handling
    await handleQMetryApiError(res, baseUrl, project, path);
  }

  return (await res.json()) as T;
}
