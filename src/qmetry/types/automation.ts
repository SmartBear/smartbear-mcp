import type { z } from "zod";
import type { ImportAutomationResultsPayloadSchema } from "./common";

// `projectKey` is a tool-level argument: the client strips it from the payload
// and sends it as the `project` header instead.
export type ImportAutomationResultsPayload = Omit<
  z.infer<typeof ImportAutomationResultsPayloadSchema>,
  "projectKey"
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
