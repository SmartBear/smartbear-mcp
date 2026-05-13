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
      `When the user asks to upload or import automation results, search these directories: ${AUTOMATION_RESULT_DIRS.join(", ")}. ` +
      "Infer the format from the file name where possible; confirm with the user only when the format is ambiguous. " +
      "Returns a trackingId to track the asynchronous import progress. " +
      "No set_project_context call is required — do NOT ask the user for project details.",
    useCases: [
      "User asks to upload or import automation results to QTM4J",
      "User asks to import test results from a CI/CD pipeline run",
      "User asks to link test results to an existing test cycle in QTM4J",
      "User asks to create a new test cycle from automation results",
      "User asks to upload JUnit, TestNG, Cucumber, QAF, HP UFT, or SpecFlow results",
    ],
    examples: [
      {
        description: "User says 'upload my test results to QTM4J' — scan workspace, find single result file, confirm and upload",
        parameters: {
          filePath: "./target/surefire-reports/TEST-results.xml",
          format: "junit",
        },
        expectedOutput: "trackingId returned; import processing started in QTM4J",
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
        expectedOutput: "ZIP uploaded; test cycle created with summary, labels, and priority",
      },
    ],
    hints: [
      "NO PROJECT CONTEXT REQUIRED: Do NOT call set_project_context and do NOT ask the user for a project key, project ID, or any other project details. This tool works independently — never prompt the user for project information.",
      `FILE DISCOVERY: If the user does not provide a file path, search these directories in order: ${AUTOMATION_RESULT_DIRS.join(", ")}. If multiple files are found, present the list and ask the user to choose. If nothing is found, ask the user to provide the path. NEVER pick a file silently.`,
      "FORMAT INFERENCE: .json → cucumber, .zip → qaf (unambiguous). For .xml, infer from the file name — 'junit'/'surefire' → junit, 'testng' → testng, 'specflow' → specflow, 'hpuft'/'uft' → hpuft. If the file name gives no clear signal, ask the user to confirm the format.",
      "TEST CYCLE: Only ask for testCycleToReuse if the user explicitly wants to link to an existing cycle. If not mentioned, omit it — QTM4J creates a new test cycle automatically.",
      "QAF format requires isZip: true and a .zip file.",
      "fields.testCycle is ignored when testCycleToReuse is provided — cycle fields are not updated on reuse.",
      "DATE FORMAT: plannedStartDate and plannedEndDate in fields.testCycle MUST be formatted as 'dd/MMM/yyyy HH:mm' (e.g. '14/May/2026 10:30'). Convert any user-provided date (ISO, natural language, relative) to this exact format before sending.",
      "appendTestName applies to JUnit and TestNG only — appends suite/test name to method name in the test case summary.",
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
      message: initResponse.message ?? "File uploaded successfully. Import is processing.",
      filePath,
      format,
    };

    return {
      structuredContent: UploadAutomationResultResponse.parse(result),
      content: [],
    };
  };
}
