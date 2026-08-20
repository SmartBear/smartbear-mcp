import type {
  CreateFunctionalTestingTestParameter,
  CreateFunctionalTestingTestStep,
} from "./functional-testing-types";

const MAX_SANITIZED_NAME_LENGTH = 25;

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
  "baseUrl"
>;

interface BaseUrlTemplatingResult {
  steps: TemplatedFunctionalTestingTestStep[] | undefined;
  parameters: CreateFunctionalTestingTestParameter[];
}

/**
 * Extracts each step's `baseUrl` into a definition-level `baseURL<Host>` parameter, templates it into the step's
 * `url`, and converts any remaining `{pathParam}` placeholders into `${var(pathParam)}`
 * definition-level parameters.
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
    if (!paramName) {
      paramName = generateUniqueParamName(desiredName, usedNames);
      paramNamesByKey.set(key, paramName);
      usedNames.add(paramName);
      generatedParams.push({ name: paramName, value });
    }
    return paramName;
  };

  const resultSteps = steps?.map((step) => {
    const { baseUrl, url, ...rest } = step;

    if (!baseUrl) {
      return { ...rest, url };
    }

    const remainder = splitUrlByBaseUrl(url, baseUrl);
    if (remainder === null) {
      throw new Error(
        `Step url "${url}" must start with its baseUrl "${baseUrl}"`,
      );
    }

    const normalizedBase = normalizeBaseUrl(baseUrl);
    const paramName = getOrCreateParamName(
      `baseUrl:${normalizedBase}`,
      `baseURL${sanitizeForParamName(hostnameFor(baseUrl))}`,
      normalizedBase,
    );

    const templatedRemainder = convertPathVarsToReflectVars(
      remainder,
      (pathParamName) =>
        getOrCreateParamName(`pathParam:${pathParamName}`, pathParamName, ""),
    );

    return { ...rest, url: `\${var(${paramName})}${templatedRemainder}` };
  });

  return {
    steps: resultSteps,
    parameters: [...generatedParams, ...(callerParameters ?? [])],
  };
}
