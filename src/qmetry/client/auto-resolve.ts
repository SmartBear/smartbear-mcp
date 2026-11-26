import { QMetryToolsHandlers } from "../config/constants";

/**
 * Configuration for auto-resolving a root folder ID for a QMetry tool.
 * When the caller omits `folderIdField`, it is filled from `folderIdPath` in
 * the project info response.
 */
export interface ModuleAutoResolveConfig {
  /** The handler that requires auto-resolution */
  handler: string;
  /** Path in project info to extract folder ID (e.g., 'rootFolders.TS.id') */
  folderIdPath: string;
  /** Payload field that receives the folder ID (e.g., 'tsFolderID') */
  folderIdField: string;
  /** Module name for error messages */
  moduleName: string;
  /** When true, converts the resolved folder ID to a string (needed for tcFolderID, parentFolderId) */
  folderIdAsString?: boolean;
}

/**
 * Registry of the tools whose root folder ID is auto-resolved from project info.
 * Add a tool here only when its endpoint needs a folder ID the caller usually won't know.
 */
export const AUTO_RESOLVE_MODULES: ModuleAutoResolveConfig[] = [
  {
    handler: QMetryToolsHandlers.CREATE_TEST_CASE,
    folderIdPath: "rootFolders.TC.id",
    folderIdField: "tcFolderID",
    folderIdAsString: true,
    moduleName: "Test Cases",
  },
  {
    handler: QMetryToolsHandlers.CREATE_REQUIREMENT,
    folderIdPath: "rootFolders.RQ.id",
    folderIdField: "rqFolderId",
    folderIdAsString: true,
    moduleName: "Requirements",
  },
  {
    handler: QMetryToolsHandlers.FETCH_TESTSUITES_FOR_TESTCASE,
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "tsFolderID",
    moduleName: "Test Suites",
  },
  {
    handler: QMetryToolsHandlers.CREATE_TEST_SUITE,
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "parentFolderId",
    folderIdAsString: true,
    moduleName: "Test Suites",
  },
  {
    handler: QMetryToolsHandlers.UPDATE_TEST_SUITE,
    folderIdPath: "rootFolders.TS.id",
    folderIdField: "TsFolderID",
    moduleName: "Test Suite",
  },
];

/**
 * Helper function to safely get nested property value using dot notation
 * @param obj - Object to traverse
 * @param path - Dot notation path (e.g., 'rootFolders.TS.id')
 * @returns The value at the path or undefined if not found
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Fills the configured folder ID field from project info when the caller left it out.
 * @param args - Tool arguments that may contain the folder ID field
 * @param projectInfo - Project information from QMetry API
 * @param config - Module configuration for this specific handler
 * @returns Updated args with the resolved folder ID
 */
export function autoResolveFolderIds(
  args: Record<string, any>,
  projectInfo: any,
  config: ModuleAutoResolveConfig,
): Record<string, any> {
  const updatedArgs = { ...args };

  if (!updatedArgs[config.folderIdField]) {
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
