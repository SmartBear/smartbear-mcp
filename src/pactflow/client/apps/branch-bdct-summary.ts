import type { McpAppParams } from "../../../common/types";
import { createPactFlowAppHtml } from "./resource";

export const BRANCH_BDCT_SUMMARY_APP: McpAppParams = {
  resourceUri: "ui://contract-testing/branch-bdct-summary",
  title: "Branch BDCT Summary",
  description:
    "Interactive branch-level summary of the latest version and cross-contract verification status.",
  html: createPactFlowAppHtml("branch-bdct-summary"),
};
