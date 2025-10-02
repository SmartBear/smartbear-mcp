import { z, type ZodTypeAny } from 'zod';

export const ZephyrProjectSchema = z.object({
  id: z.number(),
  jiraProjectId: z.number(),
  key: z.string(),
  enabled: z.boolean(),
});

export type ZephyrProject = z.infer<typeof ZephyrProjectSchema>;

export function createListSchema<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    next: z.string(),
    startAt: z.number(),
    maxResults: z.number(),
    total: z.number(),
    isLast: z.boolean(),
    values: z.array(itemSchema),
  });
}

export const ZephyrProjectListSchema = createListSchema(ZephyrProjectSchema);
export type ZephyrProjectList = z.infer<typeof ZephyrProjectListSchema>;
