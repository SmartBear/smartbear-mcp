import { z } from "zod";

import {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { getProjectInfo } from "./client/project.js";
import { ENTITY_KEYS, QMETRY_DEFAULTS } from "./config/constants.js";
import {
  fetchTestCaseDetails,
  fetchTestCases,
  fetchTestCaseSteps,
  fetchTestCaseVersionDetails,
} from "./client/testcase.js";
import { getParams } from "./parameters/utils.js";

export class QmetryClient implements Client {
  name = "QMetry";
  prefix = "qmetry";
  private token: string;
  private projectApiKey: string;
  private endpoint: string;
  constructor(token: string, projectApiKey?: string, endpoint?: string) {
    this.token = token;
    this.projectApiKey = projectApiKey || QMETRY_DEFAULTS.PROJECT_KEY;
    this.endpoint = endpoint || QMETRY_DEFAULTS.BASE_URL;
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

    // Fetch Project Info
    register(
      {
        title: "Fetch QMetry Project Info",
        summary: "Fetch details of a QMetry project",
        parameters: [
          {
            name: "projectKey",
            type: z.string().optional(),
            description: "The project key. Defaults to 'default'.",
            required: false,
          },
        ],
      },
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
      {
        title: "Fetch Test Cases",
        summary: "Fetch a list of all test cases (viewColumns) from QMetry.",
        parameters: getParams(ENTITY_KEYS.TESTCASE, [
          "projectKey",
          "baseUrl",
          "viewId",
          "folderPath",
          "limit",
          "page",
          "start",
          "scope",
          "showRootOnly",
          "getSubEntities",
          "hideEmptyFolders",
          "folderSortColumn",
          "folderSortOrder",
          "restoreDefaultColumns",
          "filter",
          "udfFilter",
          "folderID",
        ]),
      },
      (args) =>
        handleAsync(async () => {
          const a = args as Record<string, any>;
          const { baseUrl, projectKey } = resolveContext(a);

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
            viewId: a.viewId,
            folderPath: a.folderPath,
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

    // Fetch Test Case Details
    register(
      {
        title: "Fetch Test Case Details",
        summary:
          "Fetch detailed information for a specific test case from QMetry.",
        parameters: getParams(ENTITY_KEYS.TESTCASE, [
          "projectKey",
          "baseUrl",
          "tcID",
          "start",
          "page",
          "limit",
          "filter",
        ]),
      },
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
      {
        title: "Fetch Test Case Version Details",
        summary:
          "Fetch detailed information for a specific version of a test case from QMetry.",
        parameters: getParams(ENTITY_KEYS.TESTCASE, [
          "projectKey",
          "baseUrl",
          "id",
          "version",
          "scope",
          "filter",
        ]),
      },
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
      {
        title: "Fetch Test Case Steps",
        summary: "Fetch steps for a specific test case from QMetry.",
        parameters: getParams(ENTITY_KEYS.TESTCASE, [
          "projectKey",
          "baseUrl",
          "id",
          "version",
          "start",
          "page",
          "limit",
        ]),
      },
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
