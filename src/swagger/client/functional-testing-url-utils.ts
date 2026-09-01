import type {
  CreateFunctionalTestingTestParameter,
  CreateFunctionalTestingTestStep,
} from "./functional-testing-types";

const MAX_SANITIZED_NAME_LENGTH = 25;

/** Returns the `{name}` placeholder names found in `url`, e.g. `/pet/{petId}` -> `["petId"]`. */
export function extractPathParamNames(url: string): string[] {
  return Array.from(url.matchAll(/{([^}]+)}/g), (m) => m[1]);
}

export function convertPathVarsToReflectVars(
  value: string,
  resolveName: (name: string) => string = (name) => name,
): string {
  return value.replace(
    /{([^}]+)}/g,
    (_match, name) => `\${var(${resolveName(name)})}`,
  );
}

/** Converts a hostname into a safe parameter name suffix by stripping non-alphanumeric characters and truncating. */
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
 * Derives the definition-level parameter name generated for a step's `baseUrl`.
 */
export function baseUrlParamName(baseUrl: string, apiName?: string): string {
  const suffix = sanitizeForParamName(apiName || hostnameFor(baseUrl));
  return `baseURL${suffix}`;
}

/**
 * Splits `url` into the portion following `baseUrl`, normalizing `/` boundaries.
 * Returns `null` when `url` does not start with `baseUrl`.
 */
export function splitUrlByBaseUrl(
  url: string,
  baseUrl: string,
): { normalizedBase: string; remainder: string } | null {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (url === normalizedBase) {
    return { normalizedBase, remainder: "/" };
  }
  if (url.startsWith(`${normalizedBase}/`)) {
    return { normalizedBase, remainder: url.slice(normalizedBase.length) };
  }
  return null;
}

/** Returns `base`, or `base` suffixed with the first unused numeric suffix. */
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

export type TemplatedFunctionalTestingTestStep = Omit<
  CreateFunctionalTestingTestStep,
  "baseUrl" | "apiName"
>;

interface BaseUrlTemplatingResult {
  steps: TemplatedFunctionalTestingTestStep[] | undefined;
  parameters: CreateFunctionalTestingTestParameter[];
}

/**
 * Extracts each step's `baseUrl` into a definition-level `baseURL<ApiName>` parameter (falling back to
 * `baseURL<Host>` when `apiName` is not set), templates it into the step's `url`, and converts any
 * remaining `{pathParam}` placeholders into `${var(pathParam)}` definition-level parameters.
 */
export function applyBaseUrlTemplating(
  steps: CreateFunctionalTestingTestStep[] | undefined,
  callerParameters: CreateFunctionalTestingTestParameter[] | undefined,
): BaseUrlTemplatingResult {
  const usedNames = new Set<string>(
    (callerParameters ?? []).map((p) => p.name),
  );
  const paramNamesByKey = new Map<string, string>();
  const generatedParams: CreateFunctionalTestingTestParameter[] = [];

  const getOrCreateParamName = (
    key: string,
    desiredName: string,
    value: string,
  ): string => {
    let paramName = paramNamesByKey.get(key);
    if (paramName) {
      return paramName;
    }
    if (usedNames.has(desiredName)) {
      // A caller-supplied parameter already carries this exact name (and its
      // value) — bind the step to it instead of minting an empty duplicate.
      paramName = desiredName;
      paramNamesByKey.set(key, paramName);
      return paramName;
    }
    paramName = generateUniqueParamName(desiredName, usedNames);
    paramNamesByKey.set(key, paramName);
    usedNames.add(paramName);
    generatedParams.push({ name: paramName, value });
    return paramName;
  };

  const resultSteps = steps?.map((step) => {
    const { baseUrl, apiName, url, ...rest } = step;

    let prefix = "";
    let remainder = url;

    if (baseUrl) {
      const split = splitUrlByBaseUrl(url, baseUrl);
      if (split === null) {
        throw new Error(
          `Step url "${url}" must start with its baseUrl "${baseUrl}"`,
        );
      }
      const paramName = getOrCreateParamName(
        `baseUrl:${split.normalizedBase}`,
        baseUrlParamName(baseUrl, apiName),
        split.normalizedBase,
      );
      prefix = `\${var(${paramName})}`;
      remainder = split.remainder;
    }

    // {pathParam} placeholders are always converted to ${var(name)}, whether
    // or not the step also has a baseUrl.
    const templatedRemainder = convertPathVarsToReflectVars(
      remainder,
      (pathParamName) =>
        getOrCreateParamName(`pathParam:${pathParamName}`, pathParamName, ""),
    );

    return { ...rest, url: `${prefix}${templatedRemainder}` };
  });

  return {
    steps: resultSteps,
    parameters: [...generatedParams, ...(callerParameters ?? [])],
  };
}
