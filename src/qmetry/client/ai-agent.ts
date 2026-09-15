import { QMETRY_PATHS } from "../config/rest-endpoints";
import type {
  ExecuteGateReportPayload,
  ExportHtmlReportPayload,
  GetGateConfigurationPayload,
} from "../types/ai-agent";
import { qmetryRequest } from "./api/client-api";
import { resolveDefaults } from "./utils";

export async function getGateConfiguration(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: GetGateConfigurationPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (!payload.projectId || Number.isNaN(Number(payload.projectId))) {
    throw new Error(
      "[getGateConfiguration] Missing or invalid required parameter: 'projectId'. Must be a valid numeric project ID.",
    );
  }

  if (!payload.agentIdentifier) {
    throw new Error(
      "[getGateConfiguration] Missing or invalid required parameter: 'agentIdentifier'.",
    );
  }

  const path = `${QMETRY_PATHS.AI_AGENT.GET_GATE_CONFIG.replace(
    ":projectId",
    String(payload.projectId),
  )}?agentIdentifier=${encodeURIComponent(payload.agentIdentifier)}`;

  return qmetryRequest<unknown>({
    method: "GET",
    path,
    token,
    baseUrl: resolvedBaseUrl,
    project: resolvedProject,
  });
}

export async function executeGateReport(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: ExecuteGateReportPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (!payload.reportName) {
    throw new Error(
      "[executeGateReport] Missing or invalid required parameter: 'reportName'.",
    );
  }

  if (!payload.gateIdentifier) {
    throw new Error(
      "[executeGateReport] Missing or invalid required parameter: 'gateIdentifier'.",
    );
  }

  if (!payload.projectId || Number.isNaN(Number(payload.projectId))) {
    throw new Error(
      "[executeGateReport] Missing or invalid required parameter: 'projectId'. Must be a valid numeric project ID.",
    );
  }

  const body: Record<string, unknown> = {
    reportName: payload.reportName,
    gateIdentifier: payload.gateIdentifier,
    projectId: payload.projectId,
  };

  if (payload.releaseId !== undefined) {
    body.releaseId = payload.releaseId;
  }

  if (payload.cycleIds !== undefined) {
    body.cycleIds = payload.cycleIds;
  }

  if (payload.page !== undefined) {
    body.page = payload.page;
  }

  body.limit = payload.limit ?? 100;

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.AI_AGENT.EXECUTE_REPORT,
    token,
    baseUrl: resolvedBaseUrl,
    project: resolvedProject,
    body,
  });
}

export async function exportHtmlReport(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: ExportHtmlReportPayload,
) {
  const { resolvedBaseUrl, resolvedProject } = resolveDefaults(
    baseUrl,
    project,
  );

  if (!payload.htmlContent) {
    throw new Error(
      "[exportHtmlReport] Missing required parameter: 'htmlContent'.",
    );
  }

  if (!payload.fileName) {
    throw new Error(
      "[exportHtmlReport] Missing required parameter: 'fileName'.",
    );
  }

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.AI_AGENT.EXPORT_HTML_REPORT,
    token,
    baseUrl: resolvedBaseUrl,
    project: resolvedProject,
    body: {
      htmlContent: payload.htmlContent,
      fileName: payload.fileName,
    },
  });
}
