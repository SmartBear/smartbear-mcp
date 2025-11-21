import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../common/info.js";
import { QMETRY_DEFAULTS } from "../config/constants.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import type { ImportAutomationResultsPayload } from "../types/automation.js";
import { DEFAULT_IMPORT_AUTOMATION_PAYLOAD } from "../types/automation.js";
import { handleQMetryApiError } from "./api/error-handler.js";

/**
 * Imports automation test results into QMetry
 *
 * This function handles file upload via FormData to import automation test results
 * from various frameworks (TestNG, JUnit, Cucumber, Robot, etc.)
 *
 * CRITICAL NOTES:
 * - User MUST provide a valid result file (.json, .xml, or .zip up to 30 MB)
 * - File should be base64 encoded or provided as file path
 * - EntityType is required and determines the framework format
 * - Various parameters control test case/suite creation and linking behavior
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL
 * @param project - Project key (used in header, can be overridden by projectID in payload)
 * @param payload - Import configuration including file data, entityType, and optional parameters
 * @returns Promise resolving to import result with test suite and execution details
 */
export async function importAutomationResults(
  token: string,
  baseUrl: string,
  project: string,
  payload: ImportAutomationResultsPayload,
): Promise<any> {
  // Merge with defaults
  const finalPayload: ImportAutomationResultsPayload = {
    ...DEFAULT_IMPORT_AUTOMATION_PAYLOAD,
    ...payload,
  };

  // Create FormData for multipart/form-data upload
  const formData = new FormData();

  // Handle file upload
  // The file should be provided as base64 string or file content
  let fileBlob: Blob;

  if (finalPayload.file.startsWith("data:")) {
    // Base64 data URI format
    const base64Data = finalPayload.file.split(",")[1];
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    fileBlob = new Blob([bytes]);
  } else if (
    finalPayload.file.startsWith("/") ||
    finalPayload.file.includes(":\\")
  ) {
    // File path - read file from filesystem (Node.js only)
    try {
      const fs = await import("node:fs/promises");
      const fileBuffer = await fs.readFile(finalPayload.file);
      fileBlob = new Blob([new Uint8Array(fileBuffer)]);
    } catch (error) {
      throw new Error(
        `Failed to read file from path: ${finalPayload.file}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    // Assume raw base64 string
    try {
      const binaryData = atob(finalPayload.file);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      fileBlob = new Blob([bytes]);
    } catch (error) {
      throw new Error(
        "Invalid file format. Please provide base64 encoded file content or file path.",
      );
    }
  }

  // Add file to FormData
  formData.append("file", fileBlob, finalPayload.fileName);

  // Add required entityType
  formData.append("entityType", finalPayload.entityType);

  // Add optional parameters
  if (finalPayload.automationHierarchy) {
    formData.append("automationHierarchy", finalPayload.automationHierarchy);
  }
  if (finalPayload.testsuiteName) {
    formData.append("testsuiteName", finalPayload.testsuiteName);
  }
  if (finalPayload.testsuiteId) {
    formData.append("testsuiteId", finalPayload.testsuiteId);
  }
  if (finalPayload.tsFolderPath) {
    formData.append("tsFolderPath", finalPayload.tsFolderPath);
  }
  if (finalPayload.tcFolderPath) {
    formData.append("tcFolderPath", finalPayload.tcFolderPath);
  }
  if (finalPayload.platformID) {
    formData.append("platformID", finalPayload.platformID);
  }
  if (finalPayload.projectID) {
    formData.append("projectID", finalPayload.projectID);
  }
  if (finalPayload.releaseID) {
    formData.append("releaseID", finalPayload.releaseID);
  }
  if (finalPayload.cycleID) {
    formData.append("cycleID", finalPayload.cycleID);
  }
  if (finalPayload.buildID) {
    formData.append("buildID", finalPayload.buildID);
  }
  if (finalPayload.testcase_fields) {
    formData.append("testcase_fields", finalPayload.testcase_fields);
  }
  if (finalPayload.testsuite_fields) {
    formData.append("testsuite_fields", finalPayload.testsuite_fields);
  }
  if (finalPayload.skipWarning) {
    formData.append("skipWarning", finalPayload.skipWarning);
  }
  if (finalPayload.is_matching_required) {
    formData.append("is_matching_required", finalPayload.is_matching_required);
  }

  // Make API request
  const url = `${baseUrl || QMETRY_DEFAULTS.BASE_URL}${QMETRY_PATHS.AUTOMATION.IMPORT_RESULTS}`;

  const headers: Record<string, string> = {
    apikey: token,
    project: finalPayload.projectID || project || QMETRY_DEFAULTS.PROJECT_KEY,
    "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    // Note: Content-Type will be set automatically by fetch for FormData
  };

  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (error) {
    throw new Error(
      `Failed to import automation results. Network error: ${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n- QMetry server is accessible\n- File size is under 30 MB\n- File format is .json, .xml, or .zip`,
    );
  }

  if (!res.ok) {
    await handleQMetryApiError(
      res,
      baseUrl || QMETRY_DEFAULTS.BASE_URL,
      project || QMETRY_DEFAULTS.PROJECT_KEY,
      QMETRY_PATHS.AUTOMATION.IMPORT_RESULTS,
    );
  }

  return await res.json();
}
