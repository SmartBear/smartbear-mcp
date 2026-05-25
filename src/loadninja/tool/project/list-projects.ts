import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

export class ListProjects extends Tool<LoadNinjaClient> {
  specification: ToolParams = {
    title: "List Projects",
    summary:
      "Returns all projects available to the authenticated LoadNinja account.",
    useCases: [
      "Browse available projects to find a project ID for further operations",
      "List all projects to get an overview of the LoadNinja account",
    ],
  };

  handle: ToolCallback<ZodRawShape> = async () => {
    console.info("LoadNinja list");
    console.log("get projects list from url", this.client.getBaseUrl());
    const res = await fetch(`${this.client.getBaseUrl()}/project`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });
    console.dir(res, { depth: null });
    if (!res.ok)
      throw new ToolError(
        `GET /project failed: ${res.status} ${res.statusText}`,
      );

    const responseJson = await res.json();
    console.log("LoadNinja projects", responseJson);
    return {
      content: [{ type: "text", text: JSON.stringify(responseJson) }],
    };
  };
}
