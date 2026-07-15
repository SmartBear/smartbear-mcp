/**
 * QTM4J Link Bugs Schemas
 *
 * testCase level → PUT /rest/api/latest/testcycles/{testCycleKey}/testcase-executions/{testCaseExecutionId}/defects
 * testStep level → PUT /rest/api/latest/testcycles/{testCycleKey}/teststep-executions/{testStepExecutionId}/defects
 *
 * Links Jira bugs to a test case or test step execution. Bug keys are resolved to numeric
 * defect IDs via DefectIdResolver and sent as defectIDs in the request body. The test cycle
 * key is used directly as the path parameter; execution IDs are resolved from the cycle and
 * test case keys (and, for steps, the step sequence number) before the call.
 */
import * as zod from "zod";

const testCycleKey = zod
  .string()
  .describe(
    "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
      "Used directly as the API path parameter.",
  );

const testCaseKey = zod
  .string()
  .describe(
    "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'.",
  );

const defectIDs = zod
  .array(zod.string().min(1))
  .transform((arr) => [...new Set(arr)])
  .describe(
    "Jira issue keys of the bugs to link (e.g. ['PROJ-456', 'PROJ-789']). Pass Jira keys — not numeric IDs. Required if filter.jql is not provided; duplicates removed automatically.",
  );

const returnLinkedDefectCount = zod
  .boolean()
  .default(true)
  .describe(
    "When true, the response includes linkedDefectCount (the number of bugs linked). Defaults to true.",
  );

const filter = zod
  .object({
    jql: zod
      .string()
      .describe(
        "JQL expression to filter which bugs are linked (e.g. 'project = PROJ AND issuetype = Bug'). " +
          "Passed through to the API unchanged — correct or normalize JQL before calling this tool.",
      ),
  })
  .optional()
  .describe(
    "JQL filter to select which bugs should be linked. Use instead of or in addition to defectIDs.",
  );

export const LinkTestCaseBugsBody = zod
  .object({
    testCycleKey,
    testCaseKey,
    defectIDs: defectIDs.optional(),
    filter,
    returnLinkedDefectCount,
  })
  .refine((data) => data.defectIDs?.length || data.filter?.jql, {
    message: "At least one of defectIDs or filter.jql must be provided.",
    path: ["defectIDs"],
  });

export const LinkTestStepBugsBody = zod
  .object({
    testCycleKey,
    testCaseKey,
    testStepSeqNo: zod
      .number()
      .int()
      .positive("testStepSeqNo must be a positive integer.")
      .describe(
        "sequence number of the test step within the test case (e.g. 2 = the second step).",
      ),
    defectIDs: defectIDs.optional(),
    filter,
    returnLinkedDefectCount,
  })
  .refine((data) => data.defectIDs?.length || data.filter?.jql, {
    message: "At least one of defectIDs or filter.jql must be provided.",
    path: ["defectIDs"],
  });

export const LinkBugsResponse = zod.object({
  testCycleKey: zod
    .string()
    .describe(
      "Test cycle Key of the execution the bugs were linked to (e.g. 'SCRUM-TR-101').",
    ),
  testCaseKey: zod
    .string()
    .describe(
      "Test case key of the execution the bugs were linked to (e.g. 'SCRUM-TC-145').",
    ),
  linked: zod
    .literal(true)
    .describe("True — confirms the link request was accepted."),
  linkedDefectCount: zod
    .number()
    .optional()
    .describe(
      "Number of bugs successfully linked. Present when returnLinkedDefectCount is true (default).",
    ),
  warningMessages: zod
    .array(zod.string())
    .optional()
    .describe(
      "Per-bug warnings reported by the server (e.g. a bug key not accessible in Jira). Present only when issues occurred; the remaining bugs are still linked.",
    ),
});

export type LinkTestCaseBugsBodyType = zod.infer<typeof LinkTestCaseBugsBody>;
export type LinkTestStepBugsBodyType = zod.infer<typeof LinkTestStepBugsBody>;
export type LinkBugsResponseType = zod.infer<typeof LinkBugsResponse>;
