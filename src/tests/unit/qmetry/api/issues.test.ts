import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIssuesLinkedToTestCase } from "../../../../qmetry/client/issues.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("issues API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  const mockFail = (status = 400, errorText = "Bad Request") => ({
    ok: false,
    status,
    text: async () => errorText,
    headers: new Map([["content-type", "text/plain"]]),
  });

  describe("fetchIssuesLinkedToTestCase", () => {
    it("should POST with correct URL and required tcID parameter", async () => {
      const payload = {
        tcID: 3878816,
      };
      const mockResponse = {
        data: [
          {
            id: 1001,
            summary: "Login button not working",
            issueType: "Bug",
            issuePriority: "High",
            issueState: "Open",
            linkageLevel: "Test Case",
            executedVersion: "1",
            owner: "john.doe",
          },
          {
            id: 1002,
            summary: "UI alignment issue",
            issueType: "Enhancement",
            issuePriority: "Medium",
            issueState: "In Progress",
            linkageLevel: "Test Step",
            executedVersion: "2",
            owner: "jane.smith",
          },
        ],
        totalCount: 2,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchIssuesLinkedToTestCase(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/issues/list/ForTC`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining('"tcID":3878816'),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(2);
      expect((result as any).data[0]).toHaveProperty(
        "summary",
        "Login button not working",
      );
      expect((result as any).data[1]).toHaveProperty(
        "summary",
        "UI alignment issue",
      );
    });

    it("should include optional parameters in the request", async () => {
      const payload = {
        tcID: 3878816,
        filter:
          '[{"value":"authentication","type":"string","field":"summary"}]',
        limit: 20,
        page: 2,
        start: 20,
        getLinked: false,
      };
      const mockResponse = {
        data: [
          {
            id: 1003,
            summary: "Authentication timeout",
            issueType: "Bug",
            issuePriority: "High",
            issueState: "Open",
            linkageLevel: "Test Case",
            executedVersion: "3",
            owner: "test.user",
          },
        ],
        totalCount: 1,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchIssuesLinkedToTestCase(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/issues/list/ForTC`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(
            '"filter":"[{\\"value\\":\\"authentication\\",\\"type\\":\\"string\\",\\"field\\":\\"summary\\"}]"',
          ),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/issues/list/ForTC`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"limit":20'),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/issues/list/ForTC`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"page":2'),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/issues/list/ForTC`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"getLinked":false'),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(1);
      expect((result as any).data[0]).toHaveProperty(
        "summary",
        "Authentication timeout",
      );
    });

    it("should handle API errors gracefully with enhanced URL error detection", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockFail(404, "Test case not found"));

      const payload = {
        tcID: 99999,
      };

      await expect(
        fetchIssuesLinkedToTestCase(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        /QMetry API Invalid URL Error: The API endpoint appears to be incorrect/,
      );
    });

    it("should throw error when tcID is missing", async () => {
      const payload = {} as any; // Missing required tcID

      await expect(
        fetchIssuesLinkedToTestCase(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcID'/);
    });

    it("should throw error when tcID is invalid", async () => {
      const payload = {
        tcID: "invalid" as any,
      };

      await expect(
        fetchIssuesLinkedToTestCase(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcID'/);
    });

    it("should throw error when tcID is not a number", async () => {
      const payload = {
        tcID: null as any,
      };

      await expect(
        fetchIssuesLinkedToTestCase(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcID'/);
    });
  });
});
