import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  createFolderBody,
  createFolder201Response as createFolderResponse,
} from "../../common/rest-api-schemas";

export class CreateFolder extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Folder",
    summary: "Create a new Folder in Zephyr specified project",
    readOnly: false,
    idempotent: false,
    inputSchema: createFolderBody,
    outputSchema: createFolderResponse,
    examples: [
      {
        description:
          "Create a root Folder in project SA for organizing test cases",
        parameters: {
          parentId: null,
          name: "Axial Pump Tests",
          projectKey: "SA",
          folderType: "TEST_CASE",
        },
        expectedOutput: "The newly created Folder with its ID and self link",
      },
      {
        description:
          "Create a sub-folder under folder ID 5 in project MM2 for test plans related to pumps",
        parameters: {
          parentId: 5,
          name: "Pump Test Plans",
          projectKey: "MM2",
          folderType: "TEST_PLAN",
        },
        expectedOutput: "The newly created Folder with its ID and self link",
      },
      {
        description:
          "Create a root Folder in project TIS for organizing test cycles",
        parameters: {
          parentId: null,
          name: "Regression Cycles",
          projectKey: "TIS",
          folderType: "TEST_CYCLE",
        },
        expectedOutput: "The newly created Folder with its ID and self link",
      },
      {
        description:
          "Create a sub-folder under folder ID 12 in project SA for axial pump automation tests",
        parameters: {
          parentId: 12,
          name: "Axial Pump Automation",
          projectKey: "SA",
          folderType: "TEST_CASE",
        },
        expectedOutput: "The newly created Folder with its ID and self link",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const body = createFolderBody.parse(args);
    const response = await this.client.getApiClient().post(`/folders/`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
