import { QmetryToolsHandlers } from "../config/constants.ts";

/**
 * Configuration for auto-resolving viewId and folderPath for different QMetry modules
 * Each module defines which handler it applies to and which viewId path to extract from project info
 */
export interface ModuleAutoResolveConfig {
  /** The handler that requires auto-resolution */
  handler: string;
  /** Path in project info to extract viewId (e.g., 'latestViews.TC.viewId') */
  viewIdPath?: string;
  /** Path in project info to extract folder ID (e.g., 'rootFolders.TS.id') */
  folderIdPath?: string;
  /** Module name for error messages */
  moduleName: string;
  /** Field name for the folder ID (e.g., 'tsFolderID') */
  folderIdField?: string;
  /** When true, converts the resolved folder ID to a string (needed for tcFolderID, parentFolderId) */
  folderIdAsString?: boolean;
}

/**
 * Registry of all modules that support auto-resolution
 * Add new modules here to automatically support viewId/folderPath resolution
 */
export const AUTO_RESOLVE_MODULES: ModuleAutoResolveConfig[] = [
  {
    handler: QmetryToolsHandlers.FETCH_TEST_CASES,
    viewIdPath: "latestViews.TC.viewId",
    moduleName: "Test Cases",
  },
  {
    handler: QmetryToolsHandlers.CREATE_TEST_CASE,
    folderIdPath: "rootFolders.TC.id",
    folderIdField: "tcFolderID",
    folderIdAsString: true,
    moduleName: "Test Cases",
  },
  {
    handler: QmetryToolsHandlers.FETCH_REQUIREMENTS,
    viewIdPath: "latestViews.RQ.viewId",
    moduleName: "Requirements",
  },
  {
    handler: QmetryToolsHandlers.FETCH_TEST_SUITES,
    viewIdPath: "latestViews.TS.viewId",
    moduleName: "Test Suites",
  },
  {
    handler: QmetryToolsHandlers.FETCH_TESTCASE_RUNS_BY_TESTSUITE_RUN,
    viewIdPath: "latestViews.TE.viewId",
    moduleName: "Test Case Run By Test Suite Run",
  },
  {
    handler: QmetryToolsHandlers.FETCH_TEST_RUN_UDF_VALUES,
    viewIdPath: "latestViews.TE.viewId",
    moduleName: "Test Run UDF Values",
  },
  {
    handler: QmetryToolsHandlers.FETCH_EXECUTIONS_BY_TESTSUITE,
    viewIdPath: "latestViews.TEL.viewId",
    moduleName: "Executions By Test Suites",
  },
  {
    handler: QmetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE,
    viewIdPath: "latestViews.TSFS.viewId",
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "tsFolderID",
    moduleName: "Test Suites",
  },
  {
    handler: QmetryToolsHandlers.CREATE_TEST_SUITE,
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "parentFolderId",
    folderIdAsString: true,
    moduleName: "Test Suites",
  },
  {
    handler: QmetryToolsHandlers.UPDATE_TEST_SUITE,
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "TsFolderID",
    moduleName: "Test Suite",
  },
  {
    handler: QmetryToolsHandlers.FETCH_ISSUES,
    viewIdPath: "latestViews.IS.viewId",
    moduleName: "Issues",
  },
];

/**
 * Helper function to safely get nested property value using dot notation
 * @param obj - Object to traverse
 * @param path - Dot notation path (e.g., 'latestViews.TC.viewId')
 * @returns The value at the path or undefined if not found
 */
export function getNestedProperty(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") {
      // biome-ignore lint/complexity/noUselessUndefined: the reduce() callback must return a value on every path (lint/suspicious/useIterableCallbackReturn); an explicit `undefined` is required here to satisfy that rule
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Generic auto-resolve function for viewId, folderPath, and folderID
 * @param args - Tool arguments that may contain viewId/folderPath/folderID
 * @param projectInfo - Project information from QMetry API
 * @param config - Module configuration for this specific handler
 * @returns Updated args with resolved values
 */
export function autoResolveViewIdAndFolderPath(
  args: Record<string, unknown>,
  projectInfo: unknown,
  config: ModuleAutoResolveConfig,
): Record<string, unknown> {
  const updatedArgs = { ...args };
  let { viewId } = updatedArgs;
  const { folderPath } = updatedArgs;

  // Auto-resolve viewId if not provided and config has viewIdPath
  if (!viewId && config.viewIdPath) {
    viewId = getNestedProperty(projectInfo, config.viewIdPath);
    if (viewId) {
      updatedArgs.viewId = viewId;
    }
  }

  // Auto-resolve folderPath if not provided (defaults to root)
  if (folderPath === undefined) {
    updatedArgs.folderPath = "";
  }

  // Auto-resolve folder ID if not provided and config has folderIdPath
  if (
    config.folderIdPath &&
    config.folderIdField &&
    !updatedArgs[config.folderIdField]
  ) {
    const folderId = getNestedProperty(projectInfo, config.folderIdPath);
    if (folderId) {
      updatedArgs[config.folderIdField] = config.folderIdAsString
        ? String(folderId)
        : folderId;
    }
  }

  return updatedArgs;
}

/**
 * Find the auto-resolve configuration for a given handler
 * @param handler - The handler name to find config for
 * @returns Module configuration or undefined if not found
 */
export function findAutoResolveConfig(
  handler: string,
): ModuleAutoResolveConfig | undefined {
  return AUTO_RESOLVE_MODULES.find((module) => module.handler === handler);
}

/**
 * Extracts numeric project context from a project info response.
 * Returns scopeId (currentProjectId) and orgCode (clientCode) needed as HTTP headers
 * for endpoints that use scope+orgcode for project resolution instead of the project key.
 */
export function extractProjectContext(projectInfo: unknown): {
  scopeId: number | undefined;
  orgCode: string | undefined;
} {
  const info =
    projectInfo && typeof projectInfo === "object"
      ? (projectInfo as Record<string, unknown>)
      : undefined;
  const rawScopeId = info?.currentProjectId;
  const parsedScopeId =
    rawScopeId === undefined
      ? Number.NaN
      : Number(rawScopeId as string | number);
  return {
    scopeId: Number.isFinite(parsedScopeId) ? parsedScopeId : undefined,
    orgCode:
      info?.clientCode === undefined ? undefined : String(info.clientCode),
  };
}
