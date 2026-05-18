import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import type { Release } from "../../client/api/index";
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
  releaseStage: toolInputParameters.releaseStage,
  visibleOnly: z
    .boolean()
    .describe(
      "Whether to only include releases that are marked as visible in the dashboard",
    )
    .default(false),
  perPage: toolInputParameters.perPage,
  nextUrl: toolInputParameters.nextUrl,
});

// Lists release groups for a project with stability metrics appended to each result.
export class ListReleases extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Releases",
    toolset: "Releases",
    summary: "List releases for a project",
    purpose:
      "Retrieve a list of release summaries to analyze deployment history and associated errors",
    useCases: [
      "View recent releases to correlate with error spikes",
      "Filter releases by stage (e.g. production, staging) for targeted analysis",
    ],
    inputSchema,
    examples: [
      {
        description: "List production releases for a project",
        parameters: {},
        expectedOutput: "JSON array of release objects in the production stage",
      },
      {
        description: "List staging releases for a project",
        parameters: {
          releaseStage: "staging",
        },
        expectedOutput: "JSON array of release objects in the staging stage",
      },
      {
        description: "Get the next page of results",
        parameters: {
          nextUrl:
            "/projects/515fb9337c1074f6fd000003/releases?offset=30&per_page=30",
        },
        expectedOutput:
          "JSON array of release objects with metadata from the next page",
      },
    ],
    hints: [
      "Use the Get Release tool to get more details on a specific release, including the builds it contains",
      "The release stage defaults to 'production' if not specified",
      "Use visibleOnly to filter out releases that have been marked as hidden in the dashboard",
    ],
    readOnly: true,
    idempotent: true,
    outputDescription:
      "JSON array of release summary objects with metadata, with a URL to the next page if more results are available",
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const response = await this.client.projectApi.listProjectReleaseGroups(
      project.id,
      params.releaseStage,
      false, // Not top-only
      params.visibleOnly,
      params.perPage,
      params.nextUrl,
    );

    let releases: (Release & StabilityData)[] = [];
    if (response.body) {
      releases = response.body.map((r) =>
        this.client.addStabilityData(r, project),
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            data: releases,
            next_url: response.nextUrl ?? undefined,
            data_count: releases.length,
            total_count: response.totalCount ?? undefined,
          }),
        },
      ],
    };
  };
}
