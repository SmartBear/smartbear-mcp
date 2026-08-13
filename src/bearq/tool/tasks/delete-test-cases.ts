import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  testCaseIds: z
    .array(z.number().int().positive())
    .min(1)
    .describe("IDs of BearQ test cases to delete."),
});

export class DeleteTestCases extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Delete Test Cases",
    toolset: "Tasks",
    summary:
      "Deletes specific BearQ test cases by ID. Deletion is reversible — tests are archived and can be restored. Works on any unprotected test; protected tests are rejected.",
    inputSchema,
    readOnly: false,
    destructive: true,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseIds } = inputSchema.parse(args);
    const deleted: number[] = [];
    const failed: { testCaseId: number; error: string }[] = [];
    await Promise.all(
      testCaseIds.map(async (testCaseId) => {
        try {
          const res = await fetch(
            `${this.client.getBaseUrl()}/test-cases/${testCaseId}`,
            {
              method: "DELETE",
              headers: this.client.getHeaders(),
            },
          );
          if (res.ok) {
            deleted.push(testCaseId);
          } else {
            failed.push({
              testCaseId,
              error: `${res.status} ${res.statusText}`,
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed.push({
            testCaseId,
            error: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
          });
        }
      }),
    );
    return {
      content: [{ type: "text", text: JSON.stringify({ deleted, failed }) }],
    };
  };
}
