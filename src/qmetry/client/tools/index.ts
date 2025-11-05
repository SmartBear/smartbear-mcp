export { ISSUE_TOOLS } from "./issue-tools.js";
export { PROJECT_TOOLS } from "./project-tools.js";
export { REQUIREMENT_TOOLS } from "./requirement-tools.js";
export { TESTCASE_TOOLS } from "./testcase-tools.js";
export { TESTSUITE_TOOLS } from "./testsuite-tools.js";
export type { QMetryToolParams } from "./types.js";

import { ISSUE_TOOLS } from "./issue-tools.js";
import { PROJECT_TOOLS } from "./project-tools.js";
import { REQUIREMENT_TOOLS } from "./requirement-tools.js";
import { TESTCASE_TOOLS } from "./testcase-tools.js";
import { TESTSUITE_TOOLS } from "./testsuite-tools.js";
import type { QMetryToolParams } from "./types.js";

export const TOOLS: QMetryToolParams[] = [
  ...PROJECT_TOOLS,
  ...TESTCASE_TOOLS,
  ...REQUIREMENT_TOOLS,
  ...TESTSUITE_TOOLS,
  ...ISSUE_TOOLS,
];
