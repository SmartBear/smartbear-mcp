import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodTypeAny, z } from "zod";
import type { ToolParams } from "../../common/types.js";

export interface ZephyrTool {
  specification: ToolParams;
  handle: ToolCallback;
}

export const MaxResultsSchema = z
  .number()
  .min(1)
  .max(1000)
  .describe(`
    Specifies the maximum number of results to return in a single call. The default value is 10, and the maximum value that can be requested is 1000.

    Note that the server may enforce a lower limit than requested, depending on resource availability or other internal constraints.
    If this happens, the result set may be truncated. Always check the maxResults value in the response to confirm how many results were actually returned.
  `);

export const StartAtSchema = z
  .number()
  .min(0)
  .max(1000000)
  .describe(`
    Zero-indexed starting position used to paginate through results. Defaults to 0.
  `);

export const ZephyrProjectSchema = z.object({
  id: z.number(),
  jiraProjectId: z.number(),
  key: z.string(),
  enabled: z.boolean(),
});

export type ZephyrProject = z.infer<typeof ZephyrProjectSchema>;

export function createListSchema<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    next: z.string().nullable(),
    startAt: StartAtSchema,
    maxResults: MaxResultsSchema,
    total: z.number(),
    isLast: z.boolean(),
    values: z.array(itemSchema),
  });
}

export const ZephyrProjectListSchema = createListSchema(ZephyrProjectSchema);
export type ZephyrProjectList = z.infer<typeof ZephyrProjectListSchema>;
