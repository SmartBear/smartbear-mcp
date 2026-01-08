export { AUTOMATION_TOOLS } from "./automation-tools";
export { ISSUE_TOOLS } from "./issue-tools";
export { PROJECT_TOOLS } from "./project-tools";
export { REQUIREMENT_TOOLS } from "./requirement-tools";
export { TESTCASE_TOOLS } from "./testcase-tools";
export { TESTSUITE_TOOLS } from "./testsuite-tools";
export type { QMetryToolParams } from "./types";

import { AUTOMATION_TOOLS } from "./automation-tools";
import { ISSUE_TOOLS } from "./issue-tools";
import { PROJECT_TOOLS } from "./project-tools";
import { REQUIREMENT_TOOLS } from "./requirement-tools";
import { TESTCASE_TOOLS } from "./testcase-tools";
import { TESTSUITE_TOOLS } from "./testsuite-tools";
import type { QMetryToolParams } from "./types";

export const TOOLS: QMetryToolParams[] = [
  ...PROJECT_TOOLS,
  ...TESTCASE_TOOLS,
  ...REQUIREMENT_TOOLS,
  ...TESTSUITE_TOOLS,
  ...ISSUE_TOOLS,
  ...AUTOMATION_TOOLS,
];
