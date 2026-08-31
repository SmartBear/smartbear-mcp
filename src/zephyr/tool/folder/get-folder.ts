import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  GetFolderParams,
  GetFolder200Response as GetFolderResponse,
} from "../../common/rest-api-schemas";

export class GetFolder extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Get Folder",
    toolset: "Folders",
    summary:
      "Get details of the folder specified by id in Zephyr. The response includes the folder's `parentId`, identifying the folder it sits under; use Get Folders to list siblings or to find the folders whose `parentId` is this folder's id.",
    readOnly: true,
    idempotent: true,
    inputSchema: GetFolderParams,
    outputSchema: GetFolderResponse,
    examples: [
      {
        description: "Get the folder with id 5",
        parameters: {
          folderId: 5,
        },
        expectedOutput:
          "The folder with its id, name, index, folderType, project and parentId",
      },
      {
        description:
          "Get the folder with id 53 to check which folder it is nested under",
        parameters: {
          folderId: 53,
        },
        expectedOutput:
          "The folder with its details, including the `parentId` of the folder that contains it",
      },
    ],
  };

  handle: ToolHandler = async (args) => {
    const { folderId } = GetFolderParams.parse(args);
    const response = await this.client
      .getApiClient()
      .get(`/folders/${folderId}`);
    return {
      structuredContent: response,
      content: [],
    };
  };
}