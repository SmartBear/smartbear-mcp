import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ZephyrClient } from "../../client";
import {
  CreateTestCaseWebLinkBody,
  CreateTestCaseWebLinkParams,
  CreateTestCaseWebLink201Response as CreateTestCaseWebLinkResponse,
} from "../../common/rest-api-schemas";
export class CreateTestCaseWebLink extends Tool<ZephyrClient> {
  specification: ToolParams = {
    title: "Create Test Case Web Link",
    toolset: "Test Cases",
    summary: "Create a new Web Link for a Test Case in Zephyr",
    readOnly: false,
    idempotent: false,
    inputSchema: CreateTestCaseWebLinkBody.extend({
      testCaseKey: CreateTestCaseWebLinkParams.shape.testCaseKey,
      description: CreateTestCaseWebLinkBody.shape.description.describe(
        "The web link description, shown as the link text in Zephyr. Optional; defaults to the URL.",
      ),
    }),
    outputSchema: CreateTestCaseWebLinkResponse,
    examples: [
      {
        description:
          "Add a web link 'https://www.atlassian.com' to test case SA-T1 without a description",
        parameters: {
          testCaseKey: "SA-T1",
          url: "https://www.atlassian.com",
        },
        expectedOutput:
          "The newly created Web Link with its ID and self link; the URL is used as the link text",
      },
      {
        description:
          "Create a web link for test case SA-T1 pointing to Atlassian's homepage",
        parameters: {
          testCaseKey: "SA-T1",
          url: "https://www.atlassian.com",
          description: "Link to Atlassian's homepage",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
      {
        description:
          "Attach a documentation link to test case MM2-T15 for pump specifications",
        parameters: {
          testCaseKey: "MM2-T15",
          url: "https://docs.atlassian.com",
          description: "Documentation for pump specifications",
        },
        expectedOutput: "The newly created Web Link with its ID and self link",
      },
    ],
  };
  handle: ToolHandler = async (args) => {
    const fullInputSchema = CreateTestCaseWebLinkBody.extend({
      testCaseKey: CreateTestCaseWebLinkParams.shape.testCaseKey,
    });
    const parsed = fullInputSchema.parse(args);
    const { testCaseKey, description, ...rest } = parsed;
    const body = {
      ...rest,
      description: description?.trim() ? description : rest.url,
    };
    const response = await this.client
      .getApiClient()
      .post(`/testcases/${testCaseKey}/links/weblinks`, body);
    return {
      structuredContent: response,
      content: [],
    };
  };
}
