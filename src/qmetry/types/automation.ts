import { z } from "zod";

/**
 * Entity types supported for automation result import
 */
export const EntityTypeEnum = z.enum([
  "TESTNG",
  "CUCUMBER",
  "JUNIT",
  "HPUFT",
  "QAF",
  "ROBOT",
]);

/**
 * Automation hierarchy options for TestNG and JUnit
 */
export const AutomationHierarchyEnum = z.enum(["1", "2", "3"]);

/**
 * Skip warning options
 */
export const SkipWarningEnum = z.enum(["0", "1"]);

/**
 * Test case/suite fields for JSON format
 * These can include system fields and user-defined fields
 */
export const TestAssetFieldsSchema = z
  .object({
    // Test Case System Fields
    component: z.array(z.string()).optional(),
    priority: z.string().optional(),
    testCaseState: z.string().optional(),
    testCaseType: z.string().optional(),
    testcaseOwner: z.string().optional(),
    estimatedTime: z.string().optional(),
    description: z.string().optional(),

    // Test Suite System Fields
    testSuiteState: z.string().optional(),
    testsuiteOwner: z.string().optional(),

    // User Defined Fields
    userDefinedFields: z
      .record(
        z.union([z.string(), z.number(), z.array(z.string()), z.boolean()]),
      )
      .optional(),
  })
  .optional();

/**
 * Import automation results payload schema
 *
 * CRITICAL: File upload is required and must be provided by the user
 * User should upload a valid result file (.json, .xml, or .zip up to 30 MB)
 */
export const ImportAutomationResultsPayloadSchema = z.object({
  // REQUIRED: File data as base64 string or file path
  file: z
    .string()
    .describe(
      "Base64 encoded file content or file path. User must upload result file (.json, .xml, .zip up to 30 MB)",
    ),

  // REQUIRED: Original filename with extension
  fileName: z
    .string()
    .describe("Original filename with extension (.json, .xml, or .zip)"),

  // REQUIRED: Entity type (format of result file)
  entityType: EntityTypeEnum.describe(
    "Format of result file: TESTNG, CUCUMBER, JUNIT, HPUFT, QAF, or ROBOT",
  ),

  // OPTIONAL: Automation hierarchy (applies to TestNG and JUnit only)
  automationHierarchy: AutomationHierarchyEnum.optional().describe(
    "TestNG/JUnit hierarchy: 1=Test Case-Test Step, 2=Test Case only, 3=Test Suite-Test Case. Default: 1",
  ),

  // OPTIONAL: Test suite name
  testsuiteName: z
    .string()
    .optional()
    .describe(
      "Custom test suite name. Ignored if automationHierarchy=3 for JUnit or =2 for ROBOT",
    ),

  // OPTIONAL: Test suite ID (reuse existing)
  testsuiteId: z
    .string()
    .optional()
    .describe(
      "Reuse existing Test Suite by ID or Entity Key. Ignored if automationHierarchy=3 for JUnit or =2 for ROBOT",
    ),

  // OPTIONAL: Test suite folder path
  tsFolderPath: z
    .string()
    .optional()
    .describe(
      "Test suite folder path. Creates folder if doesn't exist. Ignored if reusing test suite",
    ),

  // OPTIONAL: Test case folder path
  tcFolderPath: z
    .string()
    .optional()
    .describe(
      "Test case folder path. Creates folder if doesn't exist. Ignored if reusing test case",
    ),

  // OPTIONAL: Platform ID or name
  platformID: z
    .string()
    .optional()
    .describe("Platform ID or Platform Name. Default: 'No Platform'"),

  // OPTIONAL: Project ID or key (overrides header project)
  projectID: z
    .string()
    .optional()
    .describe(
      "Project ID, Project Key, or Project name. Overrides project in header",
    ),

  // OPTIONAL: Release ID or name
  releaseID: z
    .string()
    .optional()
    .describe("Release ID or Release name. Requires projectID if provided"),

  // OPTIONAL: Cycle ID or name
  cycleID: z
    .string()
    .optional()
    .describe(
      "Cycle ID or Cycle name. Requires releaseID and projectID if provided",
    ),

  // OPTIONAL: Build ID or name
  buildID: z.string().optional().describe("Build ID or Build name"),

  // OPTIONAL: Test case fields (JSON format)
  testcase_fields: z
    .string()
    .optional()
    .describe(
      'JSON string with test case system fields and UDFs. Ignored if reusing test case. Example: {"component":["com1"], "priority":"High"}',
    ),

  // OPTIONAL: Test suite fields (JSON format)
  testsuite_fields: z
    .string()
    .optional()
    .describe(
      'JSON string with test suite system fields and UDFs. Ignored if reusing test suite. Example: {"testSuiteState":"Open", "testsuiteOwner":"user"}',
    ),

  // OPTIONAL: Skip warning about summary length
  skipWarning: SkipWarningEnum.optional().describe(
    "0=Fail if summary >255 chars, 1=Truncate summary to 255 chars. Default: 0",
  ),

  // OPTIONAL: Matching requirement for test cases
  is_matching_required: z
    .string()
    .optional()
    .describe(
      "True=Create new TC if summary/steps don't match, False=Reuse linked TC. Default: True",
    ),
});

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
