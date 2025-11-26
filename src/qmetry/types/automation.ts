import type { z } from "zod";
import type { ImportAutomationResultsPayloadSchema } from "./common.js";

export type ImportAutomationResultsPayload = z.infer<
  typeof ImportAutomationResultsPayloadSchema
>;

/**
 * Default payload values for import automation results
 */
export const DEFAULT_IMPORT_AUTOMATION_PAYLOAD: Partial<ImportAutomationResultsPayload> =
  {
    automationHierarchy: "1",
    skipWarning: "0",
    is_matching_required: "true",
  };
