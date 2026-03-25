import { ToolError } from "../../../common/tools";
import { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

// Returns the currently configured project, or throws if no project is set.
export default BugsnagClient.createTool(
  {
    title: "Get Current Project",
    summary:
      "Retrieve the 'current' project on which tools should operate by default. This allows BugSnag tools to be called with no projectId parameter.",
    purpose:
      "Gets information about the 'current' BugSnag project, including ID and API key",
    useCases: ["Understand if a current project has been set"],
    inputSchema: toolInputParameters.empty,
    hints: [
      "If a project is returned, it can be assumed that the user expects interactions with BugSnag tools to refer to this project",
      "If this tool returns no current project then other BugSnag tools will require an explicit project ID parameter",
      "Call the List Projects tool to see all projects that the user has access to. Get the project ID from this list either by asking the user for the project name or slug",
      "You might find a BugSnag API key in the user's code where they configure the BugSnag SDK that can be matched to a project 'apiKey' field from the project list",
    ],
  },
  async ({ client }) => {
    const project = await client.getCurrentProject();
    if (!project) {
      throw new ToolError(
        "No current project is configured in the MCP server - use List Projects to see the available projects and use the project ID as a parameter to other BugSnag tools. You can ask the user to select the project based on the name or slug, or use the apiKey field and see if there's a BugSnag API key set in the user's code when they configure the BugSnag SDK",
      );
    }
    return {
      content: [{ type: "text", text: JSON.stringify(project) }],
    };
  },
);
