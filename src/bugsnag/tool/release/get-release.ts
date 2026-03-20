import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import type { Build } from "../../client/api/index";
import { toolInputParameters } from "../../input-schemas";

interface StabilityData {
  user_stability: number;
  session_stability: number;
  stability_target_type: string;
  target_stability: number;
  critical_stability: number;
  meets_target_stability: boolean;
  meets_critical_stability: boolean;
}

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  releaseId: toolInputParameters.releaseId,
});

// Fetches a release by ID including its builds, with stability metrics appended to each.
export class GetRelease extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Release",
    summary:
      "Get more details for a specific release by its ID, including source control information and associated builds",
    purpose:
      "Retrieve detailed information about a release for analysis and debugging",
    useCases: [
      "View release metadata such as version, source control info, and error counts",
      "Analyze the stability data and targets for a release",
      "See the builds that make up the release",
    ],
    inputSchema,
    examples: [
      {
        description: "Get details for a specific release",
        parameters: {
          releaseId: "5f8d0d55c9e77c0017a1b2c3",
        },
        expectedOutput:
          "JSON object with release details including version, source control info, error counts and stability data.",
      },
    ],
    hints: ["Release IDs can be found using the List releases tool"],
    readOnly: true,
    idempotent: true,
    outputDescription:
      "JSON object containing release details along with stability metrics such as user and session stability, and whether it meets project targets",
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const releaseResponse = await this.client.projectApi.getReleaseGroup(
      params.releaseId,
    );
    if (!releaseResponse.body)
      throw new ToolError(`No release for ${params.releaseId} found.`);
    const release = this.client.addStabilityData(releaseResponse.body, project);
    let builds: (Build & StabilityData)[] = [];
    if (releaseResponse.body) {
      const buildsResponse = await this.client.projectApi.listBuildsInRelease(
        params.releaseId,
      );
      if (buildsResponse.body) {
        builds = buildsResponse.body.map((b) =>
          this.client.addStabilityData(b, project),
        );
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            release: release,
            builds: builds,
          }),
        },
      ],
    };
  };
}
