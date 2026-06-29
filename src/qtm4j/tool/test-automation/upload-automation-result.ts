import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import {
  AUTOMATION_LIMITS,
  AUTOMATION_RESULT_DIRS,
  CLIENT_CONFIG,
  ENDPOINTS,
  IMPORT_BODY_FIELDS,
  TOOL_NAMES,
  TOOLSETS,
} from "../../config/constants.ts";
import {
  UploadAutomationResultBody,
  UploadAutomationResultResponse,
  type UploadAutomationResultResponseType,
} from "../../schema/automation.schema.ts";

/** Supported file extensions */
const SUPPORTED_EXTENSIONS = new Set([".xml", ".json", ".zip"]);

export class UploadAutomationResult extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UPLOAD_AUTOMATION_RESULT.TITLE,
    toolset: TOOLSETS.TEST_AUTOMATION,
    summary: TOOL_NAMES.UPLOAD_AUTOMATION_RESULT.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: UploadAutomationResultBody,
    outputSchema: UploadAutomationResultResponse,
    purpose:
      "Upload an automation result file from disk to QTM4J and map results to a test cycle. " +
      "No set_project_context call is required — this tool works independently of any project context. " +
      `When the user asks to upload or import automation results, search these directories: ${AUTOMATION_RESULT_DIRS.join(", ")}. ` +
      "Infer the format from the file name where possible; confirm with the user only when the format is ambiguous. " +
      "Returns a trackingId to track the asynchronous import progress.",
    useCases: [
      "Upload automation results to QTM4J",
      "Import test results from a CI/CD pipeline run",
      "Link test results to an existing test cycle",
      "Create a new test cycle from automation results",
      "Upload JUnit, TestNG, Cucumber, QAF, HP UFT, or SpecFlow result files",
    ],
    examples: [
      {
        description:
          "User says 'upload my test results to QTM4J' — scan workspace, find single result file, confirm and upload",
        parameters: {
          filePath: "./target/surefire-reports/TEST-results.xml",
          format: "junit",
        },
        expectedOutput:
          "trackingId returned; import processing started in QTM4J",
      },
      {
        description: "User wants results linked to an existing test cycle",
        parameters: {
          filePath: "./reports/cucumber.json",
          format: "cucumber",
          testCycleToReuse: "TR-PRJ-5",
          environment: "Chrome",
          build: "2.1.0",
        },
        expectedOutput: "Results mapped to test cycle TR-PRJ-5",
      },
      {
        description: "Upload QAF ZIP and set test cycle metadata",
        parameters: {
          filePath: "./results/qaf-results.zip",
          format: "qaf",
          isZip: true,
          fields: {
            testCycle: {
              summary: "Regression Run 2024-Q1",
              labels: ["regression"],
              priority: "High",
            },
          },
        },
        expectedOutput:
          "ZIP uploaded; test cycle created with summary, labels, and priority",
      },
      {
        description:
          "User provides an unrecognised priority value — do NOT silently map to a similar word; ask the user first",
        parameters: {
          filePath: "./reports/cucumber.json",
          format: "cucumber",
          fields: { testCycle: { priority: "critical" } },
        },
        expectedOutput:
          "Tool is NOT called yet. Inform the user that 'critical' was not recognised as a valid priority and ask them to confirm the correct value (e.g. from the available options). Do not map 'critical' to 'Blocker' or any other value without explicit user confirmation.",
      },
    ],
    hints: [
      "NO PROJECT CONTEXT REQUIRED: Do NOT call set_project_context and do NOT ask the user for a project key, project ID, or any other project details. This tool works independently — never prompt the user for project information.",
      `FILE DISCOVERY: Always do a fresh scan — never reuse a path from a previous turn. If no path is provided, search in order: ${AUTOMATION_RESULT_DIRS.join(", ")}. If exactly one file is found, show the path and inferred format to the user and confirm before uploading. If multiple files are found, list them all and wait for the user to pick one. If nothing is found, ask for the path. Never pick or upload silently.`,
      "FORMAT INFERENCE: .json → cucumber (unambiguous). For .xml, infer from the file name — 'junit'/'surefire' → junit, 'testng' → testng, 'specflow' → specflow, 'hpuft'/'uft' → hpuft. For .zip, ALWAYS set isZip: true, but do NOT assume qaf — the zip could contain junit, testng, or cucumber results; if the format cannot be determined from the file name, ask the user. If the file name gives no clear signal for .xml either, ask the user to confirm the format.",
      "TEST CYCLE: Only ask for testCycleToReuse if the user explicitly wants to link to an existing cycle. If not mentioned, omit it — QTM4J creates a new test cycle automatically.",
      "DATE FORMAT: plannedStartDate and plannedEndDate in fields.testCycle MUST be formatted as 'dd/MMM/yyyy HH:mm' (e.g. '14/May/2026 10:30'). Convert any user-provided date (ISO, natural language, relative) to this exact format before sending.",
      "FOLDER ID: folderId is a numeric ID. Apply it ONLY to the level the user specifies; if unspecified, default to fields.testCycle only — never copy it to both levels. Get the ID from the user directly (right-click folder in QTM4J → 'Copy Folder Id').",
      "ASSIGNEE / REPORTER: assignee and reporter in fields.testCycle and fields.testCase require a Jira Account ID (not a display name or email). Ask the user to provide their Account ID directly.",
      "FIELD MAPPING CONFIRMATION: Apply formatting transformations (case correction, date/time conversion) automatically. Only ask for user confirmation when you cannot find a recognised match and need to substitute an unrecognised value with a guessed alternative — never silently substitute in that case.",
      "TRACKING: Import processing is asynchronous. To check status, call get_automation_history and find the record whose trackingId matches the one returned from this tool.",
    ],
    outputDescription:
      "trackingId to poll import status, a message from the API, the filePath uploaded, and the format used.",
  };

  handle = async (rawArgs: any) => {
    const args = UploadAutomationResultBody.parse(rawArgs);
    const { filePath, format, isZip, fields, ...rest } = args;

    // Validate file extension
    const ext = extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new ToolError(
        `Unsupported file extension '${ext}'. Supported extensions: .xml, .json, .zip`,
      );
    }

    // QAF requires a ZIP
    if (format === "qaf" && !isZip) {
      throw new ToolError(
        "QAF format requires a ZIP file. Set isZip: true and provide a .zip file.",
      );
    }

    // Read file from disk
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filePath);
    } catch (err: any) {
      throw new ToolError(
        `Could not read file at '${filePath}': ${err.message}`,
      );
    }

    // Enforce maximum file size
    if (fileBuffer.byteLength > AUTOMATION_LIMITS.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (fileBuffer.byteLength / (1024 * 1024)).toFixed(2);
      throw new ToolError(
        `File is too large (${sizeMB} MB). Maximum allowed size is 10 MB.`,
      );
    }

    const apiClient = this.client.getApiClient();

    // Step 1 — POST with automation API key to get upload URL and trackingId
    const importBody: Record<string, unknown> = {
      format,
      isZip,
      [IMPORT_BODY_FIELDS.REQUEST_SOURCE_TYPE]: CLIENT_CONFIG.SOURCE_VALUE,
      [IMPORT_BODY_FIELDS.ALLOW_TRACKING]: true,
      ...rest,
      ...(fields ? { fields } : {}),
    };

    const initResponse = await apiClient.postAutomation(
      ENDPOINTS.AUTOMATION_IMPORT,
      importBody,
    );

    const uploadUrl: string | undefined = initResponse?.url;
    const trackingId: string | undefined = initResponse?.trackingId;

    if (!uploadUrl || !trackingId) {
      throw new ToolError(
        "QTM4J did not return a valid upload URL. Check your API key and project configuration.",
      );
    }

    // Step 2 — PUT file as raw binary with Content-Type: multipart/form-data to the pre-signed S3 URL
    await apiClient.uploadFileMultipart(uploadUrl, fileBuffer);

    const result: UploadAutomationResultResponseType = {
      trackingId,
      message:
        initResponse.message ??
        "File uploaded successfully. Import is processing.",
      filePath,
      format,
    };

    return {
      structuredContent: UploadAutomationResultResponse.parse(result),
      content: [],
    };
  };
}
