import type { ToolParams } from "../../../common/types.ts";

export interface QmetryToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: unknown) => unknown;
}
