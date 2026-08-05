import { QMetryToolsHandlers } from "../../config/constants";
import {
  ExecuteGateReportArgsSchema,
  ExportHtmlReportArgsSchema,
  GetGateConfigurationArgsSchema,
} from "../../types/ai-agent";
import type { QMetryToolParams } from "./types";

export const AI_AGENT_TOOLS: QMetryToolParams[] = [
  {
    handler: QMetryToolsHandlers.FETCH_GATE_CONFIGURATION,
    title: "Fetch Quality Gate Configuration",
    toolset: "AI Agent",
    summary:
      "Fetch the quality gate configuration for a project and AI agent, including assessment scope and gate criteria.",
    purpose:
      "Retrieves the quality gate configuration for a given project and AI agent identifier. " +
      "The backend validates AI Agent enablement, resolves the project and agent, " +
      "and returns the project-specific or default gate configuration with assessment scope injected.",
    inputSchema: GetGateConfigurationArgsSchema,
    useCases: [
      "Retrieve gate criteria and thresholds before generating a quality gate report",
      "Check which quality gates are configured for a project and agent",
      "Inspect assessment scope and gate parameters for release readiness evaluation",
    ],
    examples: [
      {
        description:
          "Fetch gate configuration for project 45851 and agent 'claude'",
        parameters: {
          projectId: 45851,
          agentIdentifier: "claude",
        },
        expectedOutput:
          "Gate configuration object with assessment scope, gate criteria, and thresholds.",
      },
    ],
    hints: [
      "REQUIRED: 'projectId' must be a valid numeric project ID (not the project key).",
      "REQUIRED: 'agentIdentifier' must match a registered AI agent identifier.",
      "Call this tool before 'Execute Quality Gate Report' to understand the gate criteria and available gates.",
      "If AI Agent is not enabled for the project, the backend will return an appropriate error.",
    ],
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
  {
    handler: QMetryToolsHandlers.EXECUTE_GATE_REPORT,
    title: "Execute Quality Gate Report",
    toolset: "AI Agent",
    summary:
      "Execute a quality gate report by forwarding the request to the backend analytics engine and returning the results.",
    purpose:
      "Submits a quality gate report request to the backend. " +
      "The backend validates AI Agent provisioning, resolves the report and gate query, " +
      "substitutes SQL tokens, validates parameters, executes the analytics query, " +
      "and returns the report data. The MCP tool simply forwards the request and returns the response.",
    inputSchema: ExecuteGateReportArgsSchema,
    useCases: [
      "Generate a release readiness report for a specific project, release, and cycle",
      "Execute a quality gate assessment to evaluate project health against gate criteria",
      "Run a gate report scoped to specific cycles within a release",
      "Produce analytics data for quality gate evaluation and decision-making",
    ],
    examples: [
      {
        description:
          "Execute a release readiness report for project 45851, release 90698, cycle 129140",
        parameters: {
          reportName: "RR",
          gateIdentifier: "GATE1",
          projectId: 45851,
          releaseId: 90698,
          cycleIds: [129140],
        },
        expectedOutput:
          '{ "data": [...], "total": 0, "success": true, "page": {} }',
      },
      {
        description: "Execute a gate report without release/cycle scoping",
        parameters: {
          reportName: "RR",
          gateIdentifier: "GATE1",
          projectId: 45851,
        },
        expectedOutput:
          '{ "data": [...], "total": 0, "success": true, "page": {} }',
      },
    ],
    hints: [
      "REQUIRED: 'reportName' identifies the report type (e.g. 'RR' for Release Readiness).",
      "REQUIRED: 'gateIdentifier' identifies which gate to evaluate (e.g. 'GATE1').",
      "REQUIRED: 'projectId' must be a valid numeric project ID.",
      "OPTIONAL: 'releaseId' scopes the report to a specific release.",
      "OPTIONAL: 'cycleIds' scopes the report to specific test cycles within the release.",
      "OPTIONAL: 'page' specifies the page number for paginated report results.",
      "OPTIONAL: 'limit' sets the maximum number of records per page (defaults to 100).",
      "Call 'Fetch Quality Gate Configuration' first to discover available gates and report parameters.",
      "The response is returned exactly as received from the backend — no transformation is applied.",
    ],
    readOnly: true,
    destructive: false,
    idempotent: true,
  },
  {
    handler: QMetryToolsHandlers.EXPORT_HTML_REPORT,
    title: "Export HTML Report",
    toolset: "AI Agent",
    summary:
      "Export HTML content as a downloadable report file via the backend.",
    purpose:
      "Submits HTML content and a file name to the backend, which generates and returns a report file. " +
      "Use this to export AI-generated reports (e.g. release readiness) as shareable HTML documents.",
    inputSchema: ExportHtmlReportArgsSchema,
    useCases: [
      "Export a generated release readiness report as an HTML file",
      "Save AI-generated quality gate analysis as a downloadable report",
      "Create a shareable HTML document from report content",
    ],
    examples: [
      {
        description: "Export a release readiness report",
        parameters: {
          htmlContent:
            "<h1>Release Readiness Report</h1><p>Generated by AI Agent.</p>",
          fileName: "release-readiness-report",
        },
        expectedOutput: "Report file generated and returned by the backend.",
      },
    ],
    hints: [
      "REQUIRED: 'htmlContent' is the full HTML string to export.",
      "REQUIRED: 'fileName' is the report file name (without extension).",
      "Typically called after generating report content from 'Execute Quality Gate Report' results.",
    ],
    readOnly: false,
    destructive: false,
    idempotent: true,
  },
];
