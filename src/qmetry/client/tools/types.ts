import type { ToolParams } from "../../../common/types.ts";

export interface QMetryToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}
