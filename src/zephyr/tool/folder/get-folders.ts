import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  ListFoldersQueryParams,
  ListFolders200Response as ListFoldersResponse,
} from "../../common/rest-api-schemas";

export class GetFolders extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Folders",
    toolset: "Folders",
    summary:
      "Get folders in Zephyr. Each returned folder includes its `parentId`, so the sub-folders of folder X are the entries whose `parentId` equals X (root folders have no parent). Use this to discover folder IDs and to walk nested folder trees by repeatedly matching `parentId` against the IDs found at the previous level.",
    readOnly: true,
    idempotent: true,
    inputSchema: ListFoldersQueryParams,
    outputSchema: ListFoldersResponse,
    examples: [
      {
        description:
          "Get the first 50 TEST_CASE Folders from the project with projectKey SA",
        parameters: {
          projectKey: "SA",
          folderType: "TEST_CASE",
          maxResults: 50,
          startAt: 0,
        },
        expectedOutput:
          "The first 50 TEST_CASE Folders of project SA, each with its id, name, index, folderType and parentId",
      },
      {
        description:
          "Get the next page of TEST_CASE Folders in project SA to continue building the folder tree",
        parameters: {
          projectKey: "SA",
          folderType: "TEST_CASE",
          maxResults: 50,
          startAt: 50,
        },
        expectedOutput:
          "The second page of 50 TEST_CASE Folders of project SA; keep paging while `isLast` is false to see every folder in the tree",
      },
      {
        description:
          "Find the sub-folders of folder ID 5 in project MM2: list the TEST_PLAN folders and keep the entries whose parentId is 5",
        parameters: {
          projectKey: "MM2",
          folderType: "TEST_PLAN",
          maxResults: 100,
          startAt: 0,
        },
        expectedOutput:
          "All TEST_PLAN Folders of project MM2; the direct children of folder 5 are the values with `parentId` === 5, and their own IDs can be matched against `parentId` again to walk deeper levels",
      },
    ],
  };

  handle: ToolHandler = async (args) => {
    const getFoldersInput = ListFoldersQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/folders", getFoldersInput);
    return {
      structuredContent: response,
      content: [],
    };
  };
}