import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  ListFolders200Response,
  ListFoldersQueryParams,
} from "../../common/rest-api-schemas";

export class GetFolders extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Folders",
    toolset: "Folders",
    summary: "Get folders, optionally filtered by project and folder type",
    readOnly: true,
    idempotent: true,
    useCases: [
      "List folders in a Zephyr project",
      "Get Test Case folders for a project",
      "Get Test Plan folders for a project",
      "Get Test Cycle folders for a project",
      "Browse the folder structure in Zephyr",
    ],
    inputSchema: ListFoldersQueryParams,
    outputSchema: ListFolders200Response,
    examples: [
      {
        description: "Get the first 10 Folders",
        parameters: {
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "The first 10 Folders with their details",
      },
      {
        description: "Get Folders from the project SA",
        parameters: {
          projectKey: "SA",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput: "Folders belonging to project SA with their details",
      },
      {
        description: "Get Test Case Folders from the project MM2",
        parameters: {
          projectKey: "MM2",
          folderType: "TEST_CASE",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput:
          "Test Case Folders belonging to project MM2 with their details",
      },
      {
        description: "Get Test Cycle Folders across all projects",
        parameters: {
          folderType: "TEST_CYCLE",
          maxResults: 10,
          startAt: 0,
        },
        expectedOutput:
          "Test Cycle Folders from all projects with their details",
      },
    ],
  };

  handle: ToolHandler = async (args) => {
    const parsedArgs = ListFoldersQueryParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get("/folders", parsedArgs);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
