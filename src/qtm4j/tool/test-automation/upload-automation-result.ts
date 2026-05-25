import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import {
  AUTOMATION_RESULT_DIRS,
  ENDPOINTS,
  TOOL_NAMES,
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
    summary: TOOL_NAMES.UPLOAD_AUTOMATION_RESULT.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: UploadAutomationResultBody,
    outputSchema: UploadAutomationResultResponse,
    purpose:
      "Upload an automation result file from disk to QTM4J and map results to a test cycle. " +
      `Filesystem state can change between turns, so always scan fresh before every call — never reuse a path from prior turns — searching: ${AUTOMATION_RESULT_DIRS.join(", ")}. ` +
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
    ],
    hints: [
      "NO PROJECT CONTEXT REQUIRED: Do NOT call set_project_context and do NOT ask the user for a project key, project ID, or any other project details. This tool works independently — never prompt the user for project information.",
      `FILE DISCOVERY: Always scan fresh before every upload — never reuse a path from any prior turn. Scan: ${AUTOMATION_RESULT_DIRS.join(", ")}. Skip scan only if user provides a path in their current message. If multiple files found, list all of them and do NOT call this tool until the user explicitly selects one — do not auto-select by recency, size, or any other criteria. If none found, ask for the path.`,
      "FORMAT INFERENCE: .json → cucumber, .zip → qaf (unambiguous). For .xml, infer from the file name — 'junit'/'surefire' → junit, 'testng' → testng, 'specflow' → specflow, 'hpuft'/'uft' → hpuft. If the file name gives no clear signal, ask the user to confirm the format.",
      "UNSUPPORTED VALUES: If a field value is completely unrecognized (not a case issue), inform the user, suggest the closest valid alternative, and wait for confirmation before retrying.",
      "TEST CYCLE: Only ask for testCycleToReuse if the user explicitly wants to link to an existing cycle. If not mentioned, omit it — QTM4J creates a new test cycle automatically.",
      "DATE FORMAT: plannedStartDate and plannedEndDate in fields.testCycle MUST be formatted as 'dd/MMM/yyyy HH:mm' (e.g. '14/May/2026 10:30'). Convert any user-provided date (ISO, natural language, relative) to this exact format before sending.",
      "FOLDER ID: folderId in fields.testCycle and fields.testCase is a numeric ID. Tell the user they can get it by right-clicking the target folder in QTM4J and selecting 'Copy Folder Id'. Always ask the user for the numeric ID directly — never try to look it up.",
      "ASSIGNEE / REPORTER: assignee and reporter in fields.testCycle and fields.testCase require a Jira Account ID (not a display name or email). Ask the user to provide their Account ID directly.",
      "Import processing is asynchronous — use the returned trackingId to poll progress.",
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

    const apiClient = this.client.getApiClient();

    // Step 1 — POST with automation API key to get upload URL and trackingId
    const importBody: Record<string, unknown> = {
      format,
      isZip: isZip ?? false,
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
