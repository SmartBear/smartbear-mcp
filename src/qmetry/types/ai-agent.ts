import { z } from "zod";
import { CommonFields } from "./common";

export const GetGateConfigurationArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,

  projectId: z.coerce
    .number()
    .describe(
      "Numeric project ID for which to fetch the quality gate configuration. " +
        "This is the internal numeric identifier, not the project key.",
    ),
  agentIdentifier: z
    .string()
    .describe(
      "Unique identifier of the AI agent whose gate configuration should be retrieved.",
    ),
});

export interface GetGateConfigurationPayload {
  projectId: number;
  agentIdentifier: string;
}

export const ExecuteGateReportArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,

  reportName: z
    .string()
    .describe("Report name identifier (e.g. 'RR' for Release Readiness)."),
  gateIdentifier: z
    .string()
    .describe("Gate identifier to execute the report against (e.g. 'GATE1')."),
  projectId: z.coerce
    .number()
    .describe("Numeric project ID for the report scope."),
  releaseId: z.coerce
    .number()
    .optional()
    .describe("Optional release ID to scope the report to a specific release."),
  cycleIds: z
    .array(z.coerce.number())
    .optional()
    .describe(
      "Optional array of cycle IDs to scope the report to specific cycles.",
    ),
  page: z.coerce
    .number()
    .optional()
    .describe("Optional page number for paginated report results."),
  limit: z.coerce
    .number()
    .optional()
    .default(100)
    .describe(
      "Maximum number of records to return per page. Defaults to 100 if not specified.",
    ),
});

export interface ExecuteGateReportPayload {
  reportName: string;
  gateIdentifier: string;
  projectId: number;
  releaseId?: number;
  cycleIds?: number[];
  page?: number;
  limit?: number;
}

export const ExportHtmlReportArgsSchema = z.object({
  projectKey: CommonFields.projectKeyOptional,

  htmlContent: z.string().describe("HTML content to be exported as a report."),
  fileName: z
    .string()
    .describe("Name for the exported report file (without extension)."),
});

export interface ExportHtmlReportPayload {
  htmlContent: string;
  fileName: string;
}
