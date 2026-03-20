import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

// Replaces all network endpoint grouping rules for a project with the provided URL patterns.
export class SetNetworkEndpointGroupings extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Set Network Endpoint Groupings",
    summary: "Set the network endpoint grouping rules for a project",
    purpose:
      "Configure URL patterns to control how network spans are grouped in performance monitoring",
    useCases: [
      "Consolidate similar API endpoints into single span groups",
      "Group dynamic URLs using path parameters (e.g., /api/users/{userId} groups /api/users/123, /api/users/456)",
      "Match multiple subdomains using wildcards (e.g., https://*.example.com groups api.example.com, cdn.example.com)",
      "Simplify performance monitoring by reducing span group clutter",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
      endpoints: z
        .array(z.string())
        .describe(
          "Array of URL patterns by which network spans are grouped. " +
            "Endpoints follow OpenAPI path templating syntax (https://swagger.io/specification/#path-templating) where path parameters use curly braces (e.g., /users/{id}). " +
            "If you encounter colon-prefixed parameters (e.g., :userId from Express/React Router), convert them to curly braces (e.g., {userId}). " +
            "Wildcards (*) can be used in domains (e.g., https://*.example.com) to match multiple subdomains.",
        ),
    }),
    examples: [
      {
        description: "Group API endpoints with path parameters",
        parameters: {
          endpoints: [
            "/api/users/{userId}",
            "/api/products/{productId}",
            "/api/orders/{orderId}/items/{itemId}",
          ],
        },
        expectedOutput: "Success response confirming the update",
      },
      {
        description:
          "Group endpoints with domain wildcards and path parameters",
        parameters: {
          endpoints: [
            "https://*.example.com/api/v1/{resourceId}",
            "https://api.example.com/v2/users/{userId}",
            "/graphql",
          ],
        },
        expectedOutput: "Success response confirming the update",
      },
      {
        description:
          "Convert colon-prefixed parameters to curly braces (e.g., from Express/React Router)",
        parameters: {
          endpoints: [
            "/{organizationSlug}/{projectSlug}/performance/view-load",
            "/api/{version}/items/{itemId}",
          ],
        },
        expectedOutput: "Success response confirming the update",
      },
    ],
    hints: [
      "Use Get Network Grouping first to see current patterns",
      "Use OpenAPI path templating with curly braces for path parameters: /users/{userId}, /orders/{orderId}/items/{itemId}",
      "Convert colon-prefixed parameters to curly braces: :organizationSlug becomes {organizationSlug}, :projectSlug becomes {projectSlug}",
      "Wildcards (*) can be used in domains to match subdomains: https://*.example.com/api",
      "This replaces all existing patterns - include all patterns you want to keep",
      "Well-designed patterns reduce noise in performance monitoring",
    ],
    readOnly: false,
    idempotent: true,
  };

  constructor(client: BugsnagClient) {
    super(client);
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      projectId: toolInputParameters.projectId,
      endpoints: z
        .array(z.string())
        .describe(
          "Array of URL patterns by which network spans are grouped. " +
            "Endpoints follow OpenAPI path templating syntax (https://swagger.io/specification/#path-templating) where path parameters use curly braces (e.g., /users/{id}). " +
            "If you encounter colon-prefixed parameters (e.g., :userId from Express/React Router), convert them to curly braces (e.g., {userId}). " +
            "Wildcards (*) can be used in domains (e.g., https://*.example.com) to match multiple subdomains.",
        ),
    });
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const result =
      await this.client.projectApi.updateProjectNetworkGroupingRuleset(
        project.id,
        params.endpoints,
      );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: result.status === 200 || result.status === 204,
            projectId: project.id,
            endpoints: params.endpoints,
          }),
        },
      ],
    };
  };
}
