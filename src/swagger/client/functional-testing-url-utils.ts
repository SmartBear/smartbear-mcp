const MAX_SANITIZED_NAME_LENGTH = 25;

export interface FunctionalTestingParameter {
  name: string;
  value?: string;
}

/** Converts OAS-style `{pathParam}` placeholders into Reflect `${var(pathParam)}` references. */
export function convertPathVarsToReflectVars(value: string): string {
  return value.replace(/{([^}]+)}/g, "${var($1)}");
}

/** Mirrors the frontend's `sanitizedApiName` logic so generated param names match the UI's convention. */
export function sanitizeForParamName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, MAX_SANITIZED_NAME_LENGTH);
}

export function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Splits `url` into the portion following `baseUrl`, normalizing `/` boundaries.
 * Returns `null` when `url` does not start with `baseUrl`.
 */
export function splitUrlByBaseUrl(url: string, baseUrl: string): string | null {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (url === normalizedBase) {
    return "/";
  }
  if (url.startsWith(`${normalizedBase}/`)) {
    return url.slice(normalizedBase.length);
  }
  return null;
}

/** Returns `base`, or `base` suffixed with the first unused numeric suffix starting at 2. */
export function generateUniqueParamName(
  base: string,
  usedNames: Set<string>,
): string {
  if (!usedNames.has(base)) {
    return base;
  }
  let counter = 2;
  while (usedNames.has(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
}

export interface BaseUrlTemplatingResult {
  steps: Record<string, unknown>[] | undefined;
  parameters: FunctionalTestingParameter[];
}

/**
 * Mirrors `apiHubIntegration.ts`'s UI behavior for MCP-created tests: extracts each step's
 * `baseUrl` into a definition-level `baseURL<Host>` parameter, templates it into the step's
 * `url`, and converts any remaining `{pathParam}` placeholders into `${var(pathParam)}`
 * definition-level parameters. Steps without a `baseUrl` are left verbatim (minus the field).
 *
 * Throws if a step declares a `baseUrl` that its `url` does not start with.
 */
export function applyBaseUrlTemplating(
  steps: Record<string, unknown>[] | undefined,
  callerParameters: FunctionalTestingParameter[] | undefined,
): BaseUrlTemplatingResult {
  const usedNames = new Set<string>(
    (callerParameters ?? []).map((p) => p.name),
  );
  const baseUrlParamNames = new Map<string, string>();
  const generatedParams: FunctionalTestingParameter[] = [];

  const resultSteps = steps?.map((step) => {
    const { baseUrl, url, ...rest } = step as {
      baseUrl?: string;
      url?: string;
    } & Record<string, unknown>;

    if (!baseUrl || typeof url !== "string") {
      return { ...rest, url };
    }

    const remainder = splitUrlByBaseUrl(url, baseUrl);
    if (remainder === null) {
      throw new Error(
        `Step url "${url}" must start with its baseUrl "${baseUrl}"`,
      );
    }

    let paramName = baseUrlParamNames.get(baseUrl);
    if (!paramName) {
      paramName = generateUniqueParamName(
        `baseURL${sanitizeForParamName(hostnameFor(baseUrl))}`,
        usedNames,
      );
      baseUrlParamNames.set(baseUrl, paramName);
      usedNames.add(paramName);
      generatedParams.push({ name: paramName, value: baseUrl });
    }

    const templatedRemainder = convertPathVarsToReflectVars(remainder);
    for (const match of remainder.matchAll(/{([^}]+)}/g)) {
      const pathParamName = match[1];
      if (!usedNames.has(pathParamName)) {
        usedNames.add(pathParamName);
        generatedParams.push({ name: pathParamName, value: "" });
      }
    }

    return { ...rest, url: `\${var(${paramName})}${templatedRemainder}` };
  });

  return {
    steps: resultSteps,
    parameters: [...generatedParams, ...(callerParameters ?? [])],
  };
}
