import { QMetryToolsHandlers } from "../config/constants.js";

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
}

/**
 * Registry of all modules that support auto-resolution
 * Add new modules here to automatically support viewId/folderPath resolution
 */
export const AUTO_RESOLVE_MODULES: ModuleAutoResolveConfig[] = [
  {
    handler: QMetryToolsHandlers.FETCH_TEST_CASES,
    viewIdPath: "latestViews.TC.viewId",
    moduleName: "Test Cases",
  },
  {
    handler: QMetryToolsHandlers.FETCH_REQUIREMENTS,
    viewIdPath: "latestViews.RQ.viewId",
    moduleName: "Requirements",
  },
  {
    handler: QMetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE,
    viewIdPath: "latestViews.TSFS.viewId",
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "tsFolderID",
    moduleName: "Test Suites",
  },
];

/**
 * Helper function to safely get nested property value using dot notation
 * @param obj - Object to traverse
 * @param path - Dot notation path (e.g., 'latestViews.TC.viewId')
 * @returns The value at the path or undefined if not found
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Generic auto-resolve function for viewId, folderPath, and folderID
 * @param args - Tool arguments that may contain viewId/folderPath/folderID
 * @param projectInfo - Project information from QMetry API
 * @param config - Module configuration for this specific handler
 * @returns Updated args with resolved values
 */
export function autoResolveViewIdAndFolderPath(
  args: Record<string, any>,
  projectInfo: any,
  config: ModuleAutoResolveConfig,
): Record<string, any> {
  const updatedArgs = { ...args };
  let viewId = updatedArgs.viewId;
  const folderPath = updatedArgs.folderPath;

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
      updatedArgs[config.folderIdField] = folderId;
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
