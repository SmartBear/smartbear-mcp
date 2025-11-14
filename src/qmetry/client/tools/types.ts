import type { ToolParams } from "../../../common/types.js";

export interface QMetryToolParams extends ToolParams {
  handler: string;
  formatResponse?: (result: any) => any;
}
