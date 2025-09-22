import { QMETRY_DEFAULTS } from "../../config/constants.js";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  token: string;
  project?: string;
  baseUrl: string;
  body?: any;
}

export async function qmetryRequest<T>({
  method = "GET",
  path,
  token,
  project,
  baseUrl,
  body,
}: RequestOptions): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    apikey: token,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
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

  const res = await fetch(url, init);

  if (!res.ok) {
 let errorText: string;
 try {
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await res.json();
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
