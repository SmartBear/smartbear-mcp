import {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { getProjectInfo } from "./client/project.js";
import { QMETRY_DEFAULTS } from "./config/constants.js";
import {
  fetchTestCaseDetails,
  fetchTestCases,
  fetchTestCaseSteps,
  fetchTestCaseVersionDetails,
} from "./client/testcase.js";
import { QMETRY_TOOLS } from "./client/tools.js";

export class QmetryClient implements Client {
  name = "QMetry";
  prefix = "qmetry";
  private token: string;
  private projectApiKey: string;
  private endpoint: string;
  constructor(token: string, endpoint?: string) {
    this.token = token;
    this.projectApiKey =  QMETRY_DEFAULTS.PROJECT_KEY;
    this.endpoint = endpoint || QMETRY_DEFAULTS.BASE_URL;
  }

  getToken() {
    return this.token;
  }

  getBaseUrl() {
    return this.endpoint;
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction
  ): void {
    const resolveContext = (args: Record<string, any>) => ({
      baseUrl: args.baseUrl ?? this.endpoint,
      projectKey: args.projectKey ?? this.projectApiKey,
    });

    const handleAsync = (fn: () => Promise<any>) =>
      fn().catch((err) => ({
        content: [
          { success: false, type: "text", text: `Error: ${err.message}` },
        ],
      }));
      
    // Set Project Info
    register(
      QMETRY_TOOLS.SET_PROJECT_INFO,
      (args) =>
        handleAsync(async () => {
          const { projectKey } = resolveContext(args as Record<string, any>);
          const response = await getProjectInfo(
            this.token,
            this.endpoint,
            projectKey
          );
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        })
    );

    // Fetch Project Info
    register(
      QMETRY_TOOLS.FETCH_PROJECT_INFO,      
      (args) =>
        handleAsync(async () => {
          const { projectKey } = resolveContext(args as Record<string, any>);
          const response = await getProjectInfo(
            this.token,
            this.endpoint,
            projectKey
          );
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        })
    );

    // Fetch Test Cases List
    register(
      QMETRY_TOOLS.FETCH_TEST_CASES,
      (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          let { baseUrl, projectKey } = resolveContext(a);
          
          // Auto-resolve viewId and folderPath if not provided
          let viewId = a.viewId;
          let folderPath = a.folderPath;
          
          if (!viewId || folderPath === undefined) {
            try {
              const projectInfo = await getProjectInfo(this.token, baseUrl, projectKey) as any;
              
              if (!viewId && projectInfo?.latestViews?.TC?.viewId) {
                viewId = projectInfo.latestViews.TC.viewId;
              }
              
              if (folderPath === undefined) {
                folderPath = "";
              }
            } catch (error) {
              throw new Error(
                `Failed to auto-resolve viewId for project ${projectKey}. ` +
                `Please ensure project access is correct or provide viewId manually. ` +
                `Error: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }

          const payload = {
            start: a.start ?? 0,
            page: a.page ?? 1,
            limit: a.limit ?? 100,
            scope: a.scope ?? "project",
            showRootOnly: a.showRootOnly ?? false,
            getSubEntities: a.getSubEntities ?? true,
            hideEmptyFolders: a.hideEmptyFolders ?? false,
            folderSortColumn: a.folderSortColumn ?? "name",
            folderSortOrder: a.folderSortOrder ?? "ASC",
            viewId: viewId,
            folderPath: folderPath,
            restoreDefaultColumns: a.restoreDefaultColumns ?? false,
            filter: a.filter ?? "[]",
            udfFilter: a.udfFilter ?? "[]",
            folderID: a.folderID ?? null,
          };

          const result = await fetchTestCases(
            this.token,
            baseUrl,
            projectKey,
            payload
          );
          
          // Enhance result with auto-resolution info
          const enhancedResult = {
            ...(typeof result === 'object' && result !== null ? result : { data: result }),
            _autoResolution: {
              projectKey: projectKey,
              viewIdAutoResolved: !a.viewId,
              folderPathAutoResolved: a.folderPath === undefined,
              usedViewId: viewId,
              usedFolderPath: folderPath
            }
          };
          
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(enhancedResult, null, 2),
              },
            ],
          };
        })
    );

    // Fetch Test Case Details
    register(
      QMETRY_TOOLS.FETCH_TEST_CASE_DETAILS,
      (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          const payload = {
            start: a.start ?? 0,
            page: a.page ?? 1,
            limit: a.limit ?? 50,
            tcID: a.tcID,
            filter: a.filter ?? "[]",
          };

          const result = await fetchTestCaseDetails(
            this.token,
            baseUrl,
            projectKey,
            payload
          );
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        })
    );

    // Fetch Test Case Version Details
    register(
      QMETRY_TOOLS.FETCH_TEST_CASE_VERSION_DETAILS,
      (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          const payload = {
            scope: a.scope ?? "project",
            id: a.id,
            version: a.version ?? 1,
            filter: a.filter ?? "[]",
          };

          const result = await fetchTestCaseVersionDetails(
            this.token,
            baseUrl,
            projectKey,
            payload
          );
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        })
    );

    // Fetch Test Case Steps
    register(
      QMETRY_TOOLS.FETCH_TEST_CASE_STEPS,
      (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

          const payload = {
            id: a.id,
            version: a.version ?? 1,
            start: a.start ?? 0,
            page: a.page ?? 1,
            limit: a.limit ?? 50,
          };

          const result = await fetchTestCaseSteps(
            this.token,
            baseUrl,
            projectKey,
            payload
          );
          return {
            content: [
              {
                success: true,
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        })
    );
  }
}
