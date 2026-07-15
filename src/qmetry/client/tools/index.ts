// biome-ignore-all lint/performance/noBarrelFile: this module intentionally aggregates all Qmetry tool definitions into a single TOOLS array consumed by the MCP server registration
import { AUTOMATION_TOOLS } from "./automation-tools.ts";
import { ISSUE_TOOLS } from "./issue-tools.ts";
import { PROJECT_TOOLS } from "./project-tools.ts";
import { REQUIREMENT_TOOLS } from "./requirement-tools.ts";
import { TESTCASE_TOOLS } from "./testcase-tools.ts";
import { TESTSUITE_TOOLS } from "./testsuite-tools.ts";
import type { QmetryToolParams } from "./types.ts";
import { UDF_TOOLS } from "./udf-tools.ts";

export { AUTOMATION_TOOLS } from "./automation-tools.ts";
export { ISSUE_TOOLS } from "./issue-tools.ts";
export { PROJECT_TOOLS } from "./project-tools.ts";
export { REQUIREMENT_TOOLS } from "./requirement-tools.ts";
export { TESTCASE_TOOLS } from "./testcase-tools.ts";
export { TESTSUITE_TOOLS } from "./testsuite-tools.ts";
export type { QmetryToolParams } from "./types.ts";
export { UDF_TOOLS } from "./udf-tools.ts";

export const TOOLS: QmetryToolParams[] = [
  ...PROJECT_TOOLS,
  ...TESTCASE_TOOLS,
  ...REQUIREMENT_TOOLS,
  ...TESTSUITE_TOOLS,
  ...ISSUE_TOOLS,
  ...AUTOMATION_TOOLS,
  ...UDF_TOOLS,
];
