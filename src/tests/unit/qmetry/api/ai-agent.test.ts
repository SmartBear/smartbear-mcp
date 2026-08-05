import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeGateReport,
  exportHtmlReport,
  getGateConfiguration,
} from "../../../../qmetry/client/ai-agent.js";
import type {
  ExecuteGateReportPayload,
  ExportHtmlReportPayload,
  GetGateConfigurationPayload,
} from "../../../../qmetry/types/ai-agent.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

const mockOk = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

describe("AI Agent API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.MCP_TRANSPORT;
  });

  // ─── getGateConfiguration ──────────────────────────────────────────

  describe("getGateConfiguration", () => {
    it("should GET gate config with correct URL and query param", async () => {
      const payload: GetGateConfigurationPayload = {
        projectId: 45851,
        agentIdentifier: "RR",
      };

      const mockResponse = {
        gates: [{ id: "GATE1", name: "Release Readiness" }],
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await getGateConfiguration(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (globalThis.fetch as any).mock.calls[0];

      expect(url).toBe(
        `${baseUrl}/rest/aiagent/project/45851/gate-config?agentIdentifier=RR`,
      );
      expect(options.method).toBe("GET");
      expect(options.headers).toMatchObject({
        apikey: token,
        project: projectKey,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should encode agentIdentifier in query param", async () => {
      const payload: GetGateConfigurationPayload = {
        projectId: 100,
        agentIdentifier: "agent with spaces",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await getGateConfiguration(token, baseUrl, projectKey, payload);

      const [url] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toContain("agentIdentifier=agent%20with%20spaces");
    });

    it("should throw when projectId is missing", async () => {
      const payload = {
        projectId: 0,
        agentIdentifier: "RR",
      } as GetGateConfigurationPayload;

      await expect(
        getGateConfiguration(token, baseUrl, projectKey, payload),
      ).rejects.toThrow("Missing or invalid required parameter: 'projectId'");
    });

    it("should throw when projectId is NaN", async () => {
      const payload = {
        projectId: Number.NaN,
        agentIdentifier: "RR",
      } as GetGateConfigurationPayload;

      await expect(
        getGateConfiguration(token, baseUrl, projectKey, payload),
      ).rejects.toThrow("Missing or invalid required parameter: 'projectId'");
    });

    it("should throw when agentIdentifier is missing", async () => {
      const payload = {
        projectId: 123,
        agentIdentifier: "",
      } as GetGateConfigurationPayload;

      await expect(
        getGateConfiguration(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        "Missing or invalid required parameter: 'agentIdentifier'",
      );
    });
  });

  // ─── executeGateReport ─────────────────────────────────────────────

  describe("executeGateReport", () => {
    it("should POST report with required fields and default limit", async () => {
      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
      };

      const mockResponse = { data: [], total: 0, success: true };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await executeGateReport(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (globalThis.fetch as any).mock.calls[0];

      expect(url).toBe(`${baseUrl}/rest/aiagent/report`);
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
        limit: 100,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should include optional releaseId and cycleIds in body", async () => {
      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
        releaseId: 90698,
        cycleIds: [129140, 129141],
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await executeGateReport(token, baseUrl, projectKey, payload);

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.releaseId).toBe(90698);
      expect(body.cycleIds).toEqual([129140, 129141]);
    });

    it("should include optional page in body", async () => {
      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
        page: 2,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await executeGateReport(token, baseUrl, projectKey, payload);

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.page).toBe(2);
    });

    it("should use provided limit instead of default", async () => {
      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
        limit: 50,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await executeGateReport(token, baseUrl, projectKey, payload);

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.limit).toBe(50);
    });

    it("should default limit to 100 when not provided", async () => {
      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await executeGateReport(token, baseUrl, projectKey, payload);

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.limit).toBe(100);
    });

    it("should throw when reportName is missing", async () => {
      const payload = {
        reportName: "",
        gateIdentifier: "GATE1",
        projectId: 45851,
      } as ExecuteGateReportPayload;

      await expect(
        executeGateReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        "Missing or invalid required parameter: 'reportName'",
      );
    });

    it("should throw when gateIdentifier is missing", async () => {
      const payload = {
        reportName: "RR",
        gateIdentifier: "",
        projectId: 45851,
      } as ExecuteGateReportPayload;

      await expect(
        executeGateReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        "Missing or invalid required parameter: 'gateIdentifier'",
      );
    });

    it("should throw when projectId is missing", async () => {
      const payload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 0,
      } as ExecuteGateReportPayload;

      await expect(
        executeGateReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        "Missing or invalid required parameter: 'projectId'",
      );
    });

    it("should throw when projectId is NaN", async () => {
      const payload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: Number.NaN,
      } as ExecuteGateReportPayload;

      await expect(
        executeGateReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        "Missing or invalid required parameter: 'projectId'",
      );
    });
  });

  // ─── exportHtmlReport ──────────────────────────────────────────────

  describe("exportHtmlReport", () => {
    it("should POST html content and fileName to correct endpoint", async () => {
      const payload: ExportHtmlReportPayload = {
        htmlContent: "<h1>Report</h1><p>Content here.</p>",
        fileName: "release-readiness-report",
      };

      const mockResponse = { success: true };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await exportHtmlReport(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (globalThis.fetch as any).mock.calls[0];

      expect(url).toBe(`${baseUrl}/rest/aiagent/htmlreport`);
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        apikey: token,
        project: projectKey,
        "Content-Type": "application/json",
      });

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        htmlContent: "<h1>Report</h1><p>Content here.</p>",
        fileName: "release-readiness-report",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw when htmlContent is missing", async () => {
      const payload = {
        htmlContent: "",
        fileName: "report",
      } as ExportHtmlReportPayload;

      await expect(
        exportHtmlReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow("Missing required parameter: 'htmlContent'");
    });

    it("should throw when fileName is missing", async () => {
      const payload = {
        htmlContent: "<h1>Test</h1>",
        fileName: "",
      } as ExportHtmlReportPayload;

      await expect(
        exportHtmlReport(token, baseUrl, projectKey, payload),
      ).rejects.toThrow("Missing required parameter: 'fileName'");
    });
  });

  // ─── OAuth / HTTP transport ────────────────────────────────────────

  describe("OAuth transport header", () => {
    it("should send Bearer token in Authorization header when MCP_TRANSPORT=http", async () => {
      process.env.MCP_TRANSPORT = "http";

      const payload: GetGateConfigurationPayload = {
        projectId: 100,
        agentIdentifier: "RR",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await getGateConfiguration(token, baseUrl, projectKey, payload);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${token}`);
      expect(options.headers.apikey).toBeUndefined();
    });

    it("should send apikey header when MCP_TRANSPORT is not http (stdio)", async () => {
      delete process.env.MCP_TRANSPORT;

      const payload: GetGateConfigurationPayload = {
        projectId: 100,
        agentIdentifier: "RR",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await getGateConfiguration(token, baseUrl, projectKey, payload);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.headers.apikey).toBe(token);
      expect(options.headers.Authorization).toBeUndefined();
    });

    it("should send Bearer token for POST requests (executeGateReport) when MCP_TRANSPORT=http", async () => {
      process.env.MCP_TRANSPORT = "http";

      const payload: ExecuteGateReportPayload = {
        reportName: "RR",
        gateIdentifier: "GATE1",
        projectId: 45851,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await executeGateReport(token, baseUrl, projectKey, payload);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${token}`);
      expect(options.headers.apikey).toBeUndefined();
    });

    it("should send Bearer token for exportHtmlReport when MCP_TRANSPORT=http", async () => {
      process.env.MCP_TRANSPORT = "http";

      const payload: ExportHtmlReportPayload = {
        htmlContent: "<p>Test</p>",
        fileName: "test-report",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await exportHtmlReport(token, baseUrl, projectKey, payload);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${token}`);
      expect(options.headers.apikey).toBeUndefined();
    });

    it("should handle MCP_TRANSPORT=HTTP (case insensitive)", async () => {
      process.env.MCP_TRANSPORT = "HTTP";

      const payload: ExportHtmlReportPayload = {
        htmlContent: "<p>Test</p>",
        fileName: "test-report",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockOk({}));

      await exportHtmlReport(token, baseUrl, projectKey, payload);

      const [, options] = (globalThis.fetch as any).mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    });
  });
});
