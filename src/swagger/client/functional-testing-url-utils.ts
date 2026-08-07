const MAX_SANITIZED_NAME_LENGTH = 25;

export interface FunctionalTestingParameter {
  name: string;
  value?: string;
}

/**
 * Converts OAS-style `{pathParam}` placeholders into Reflect `${var(pathParam)}` references.
 * By default the variable name is the placeholder's own name; pass `resolveName` to remap it
 * (e.g. to a deduped/generated parameter name).
 */
export function convertPathVarsToReflectVars(
  value: string,
  resolveName: (name: string) => string = (name) => name,
): string {
  return value.replace(
    /{([^}]+)}/g,
    (_match, name) => `\${var(${resolveName(name)})}`,
  );
}

/** Strips non-alphanumeric characters and truncates so generated param names match the UI's naming convention. */
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
 * Mirrors the Functional Testing UI's behavior for MCP-created tests: extracts each step's
 * `baseUrl` into a definition-level `baseURL<Host>` parameter, templates it into the step's
 * `url`, and converts any remaining `{pathParam}` placeholders into `${var(pathParam)}`
 * definition-level parameters. Steps without a `baseUrl` are left completely untouched
 * (including any `{pathParam}` placeholders in their `url`) since there is no base URL to
 * split the OAS-style placeholders away from.
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
  const pathParamNames = new Map<string, string>();
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

    const normalizedBase = normalizeBaseUrl(baseUrl);
    let paramName = baseUrlParamNames.get(normalizedBase);
    if (!paramName) {
      paramName = generateUniqueParamName(
        `baseURL${sanitizeForParamName(hostnameFor(baseUrl))}`,
        usedNames,
      );
      baseUrlParamNames.set(normalizedBase, paramName);
      usedNames.add(paramName);
      generatedParams.push({ name: paramName, value: normalizedBase });
    }

    for (const match of remainder.matchAll(/{([^}]+)}/g)) {
      const pathParamName = match[1];
      if (pathParamNames.has(pathParamName)) {
        continue;
      }
      const uniquePathParamName = generateUniqueParamName(
        pathParamName,
        usedNames,
      );
      pathParamNames.set(pathParamName, uniquePathParamName);
      usedNames.add(uniquePathParamName);
      generatedParams.push({ name: uniquePathParamName, value: "" });
    }
    const templatedRemainder = convertPathVarsToReflectVars(
      remainder,
      (pathParamName) => pathParamNames.get(pathParamName) ?? pathParamName,
    );

    return { ...rest, url: `\${var(${paramName})}${templatedRemainder}` };
  });

  return {
    steps: resultSteps,
    parameters: [...generatedParams, ...(callerParameters ?? [])],
  };
}
