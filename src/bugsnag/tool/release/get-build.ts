import { z } from "zod";
import { ToolError, TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  buildId: toolInputParameters.buildId,
});

// Fetches a single build by ID with stability metrics appended.
export const getBuild = new TypesafeTool(
  {
    title: "Get Build",
    summary: "Get more details for a specific build by its ID",
    purpose:
      "Retrieve detailed information about a build for analysis and debugging",
    useCases: [
      "View build metadata such as version, source control info, and error counts",
      "Analyze a specific build to correlate with error spikes or deployments",
      "See the stability targets for a project and if the build meets them",
    ],
    inputSchema,
    examples: [
      {
        description: "Get details for a specific build",
        parameters: {
          buildId: "5f8d0d55c9e77c0017a1b2c3",
        },
        expectedOutput:
          "JSON object with build details including version, source control info, error counts and stability data.",
      },
    ],
    hints: ["Build IDs can be found using the List builds tool"],
    readOnly: true,
    idempotent: true,
    outputDescription:
      "JSON object containing build details along with stability metrics such as user and session stability, and whether it meets project targets",
  },
  (client: BugsnagClient) => async (params, _extra) => {
    const project = await client.getInputProject(params.projectId);
    const response = await client.projectApi.getProjectReleaseById(
      project.id,
      params.buildId,
    );

    if (!response.body)
      throw new ToolError(`No build for ${params.buildId} found.`);
    const build = client.addStabilityData(response.body, project);
    return {
      content: [{ type: "text", text: JSON.stringify(build) }],
    };
  },
);
