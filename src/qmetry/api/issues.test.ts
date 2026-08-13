import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchIssueExecutions,
  fetchIssuesLinkedToTestCase,
} from "../client/issues.js";

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

  describe("fetchIssueExecutions", () => {
    const mockExecutionResponse = {
      data: [
        {
          tcRunID: 39605534,
          tcID: 4551203,
          dfID: 9598240,
          linkageLevel: "Test Case",
          executedVersion: 1,
          tcEntityKey: "VKT-TC-17",
          tcName: "test story - updated from vk",
          runStatusName: "failed",
          platformID: 95443,
          platformName: "Chrome",
          tsName: "test story - updated from vk",
          cycleName: "My_Cycle1.2",
          releaseName: "My_Relase1.2",
          executedAt: "03-18-2026 10:47:52",
          executionCreatedByLoginAlias: "ronak",
          isArchived: false,
          isTestSuiteArchived: false,
          udfjson: '{"TRString":"tesr","dateTimePicker1010":"05-22-2026"}',
        },
      ],
      hasTcRunUdf: true,
      total: 1,
    };

    const mockMetadataResponse = {
      qmUDF: {
        TCR: {
          "FLD.TRString": {
            name: "TRString",
            fieldLabel: "TR String",
            projectUserFieldID: 229241,
            fieldTypeName: "STRING",
          },
          "FLD.dateTimePicker1010": {
            name: "dateTimePicker1010",
            fieldLabel: "Execution Date",
            projectUserFieldID: 229255,
            fieldTypeName: "DATETIMEPICKER",
          },
        },
      },
    };

    it("should POST with correct URL when using linkedAssetId", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(mockExecutionResponse))
        .mockResolvedValueOnce(mockOk(mockMetadataResponse));

      const result = await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAssetId: 9598240,
      } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/execution/getExecutionsForIssue`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining('"id":9598240'),
        }),
      );

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.linkedAsset).toEqual({ type: "DF", id: 9598240 });
      expect(result).toHaveProperty("data");
      expect((result as any).hasTcRunUdf).toBe(true);
      expect((result as any).total).toBe(1);
      expect((result as any).data[0].udfjson).toBeUndefined();
      expect((result as any).data[0].testRunUdfs).toEqual([
        expect.objectContaining({ name: "TRString", value: "tesr" }),
        expect.objectContaining({
          name: "dateTimePicker1010",
          value: "05-22-2026",
        }),
      ]);
    });

    it("should preserve UDF values when udfjson is already an object", async () => {
      const executionResponseWithObjectUdfs = {
        ...mockExecutionResponse,
        data: [
          {
            ...mockExecutionResponse.data[0],
            tcRunID: 24201,
            udfjson: {
              TE_TE_String: "configured value",
            },
          },
        ],
      };
      const metadataResponse = {
        qmUDF: {
          TCR: {
            "FLD.TE_TE_String": {
              name: "TE_TE_String",
              fieldLabel: "TE_String",
              projectUserFieldID: 9840,
              fieldTypeName: "STRING",
            },
            "FLD.TE_TE_Radio": {
              name: "TE_TE_Radio",
              fieldLabel: "TE_Radio",
              projectUserFieldID: 9841,
              fieldTypeName: "LOOKUPLIST",
              listMasterID: 701,
              qmListName: "radio_list",
            },
          },
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(executionResponseWithObjectUdfs))
        .mockResolvedValueOnce(mockOk(metadataResponse));

      const result = (await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAssetId: 1528,
      } as any)) as any;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.data[0].udfjson).toBeUndefined();
      expect(result.data[0].testRunUdfs).toEqual([
        {
          name: "TE_TE_String",
          label: "TE_String",
          fieldID: 9840,
          fieldType: "STRING",
          value: "configured value",
        },
        {
          name: "TE_TE_Radio",
          label: "TE_Radio",
          fieldID: 9841,
          fieldType: "LOOKUPLIST",
          value: null,
          rawValue: null,
        },
      ]);
    });

    it("should resolve lookup IDs to labels and paginate shared list values once", async () => {
      const executionResponse = {
        data: [
          {
            tcRunID: 24201,
            udfjson: {
              priority: 1001,
              environments: [1002, 9999],
              retryCount: 3,
            },
          },
        ],
        hasTcRunUdf: true,
        total: 1,
      };
      const metadataResponse = {
        qmUDF: {
          TCR: {
            "FLD.priority": {
              name: "priority",
              fieldLabel: "Priority",
              projectUserFieldID: 9841,
              fieldTypeName: "LOOKUPLIST",
              listMasterID: 700,
              qmListName: "shared_list",
            },
            "FLD.environments": {
              name: "environments",
              fieldLabel: "Environments",
              projectUserFieldID: 9842,
              fieldTypeName: "MULTILOOKUPLIST",
              listMasterID: 700,
              qmListName: "shared_list",
            },
            "FLD.retryCount": {
              name: "retryCount",
              fieldLabel: "Retry Count",
              projectUserFieldID: 9843,
              fieldTypeName: "NUMBER",
            },
          },
        },
        qmUDFList: {},
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(executionResponse))
        .mockResolvedValueOnce(mockOk(metadataResponse))
        .mockResolvedValueOnce(
          mockOk({
            data: [{ id: 1001, name: "High" }],
            total: 2,
          }),
        )
        .mockResolvedValueOnce(
          mockOk({
            data: [{ Id: 1002, Alias: "Chrome" }],
            total: 2,
          }),
        );

      const result = (await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAssetId: 1528,
        scopeId: 347,
        orgCode: "TEST_ORG",
      } as any)) as any;

      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect((global.fetch as any).mock.calls[0][1].body).not.toContain(
        "scopeId",
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        `${baseUrl}/rest/admin/customlist/listval`,
        expect.objectContaining({
          headers: expect.objectContaining({
            scope: "347",
            orgcode: "TEST_ORG",
          }),
        }),
      );

      const firstListRequest = JSON.parse(
        (global.fetch as any).mock.calls[2][1].body as string,
      );
      const secondListRequest = JSON.parse(
        (global.fetch as any).mock.calls[3][1].body as string,
      );
      expect(firstListRequest).toMatchObject({
        qmMasterId: 700,
        start: 0,
        page: 1,
        params: { showArchive: false },
      });
      expect(secondListRequest).toMatchObject({
        qmMasterId: 700,
        start: 1,
        page: 2,
      });

      expect(result.data[0].testRunUdfs).toEqual([
        expect.objectContaining({
          name: "priority",
          value: "High",
          rawValue: 1001,
        }),
        expect.objectContaining({
          name: "environments",
          value: ["Chrome", 9999],
          rawValue: [1002, 9999],
        }),
        expect.objectContaining({
          name: "retryCount",
          value: 3,
        }),
      ]);
      expect(result.data[0].testRunUdfs[2]).not.toHaveProperty("rawValue");
    });

    it("should resolve lookup IDs from inline metadata without another request", async () => {
      const executionResponse = {
        data: [{ tcRunID: 24201, udfjson: { executionType: "42" } }],
        hasTcRunUdf: true,
        total: 1,
      };
      const metadataResponse = {
        qmUDF: {
          TCR: {
            "FLD.executionType": {
              name: "executionType",
              fieldLabel: "Execution Type",
              projectUserFieldID: 9841,
              fieldTypeName: "LOOKUPLIST",
              listMasterID: 701,
              qmListName: "execution_type_list",
            },
          },
        },
        qmUDFList: {
          execution_type_list: [
            { id: 42, uniqueLabel: "Automated", name: "AUTOMATED" },
          ],
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(executionResponse))
        .mockResolvedValueOnce(mockOk(metadataResponse));

      const result = (await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAssetId: 1528,
      } as any)) as any;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.data[0].testRunUdfs[0]).toEqual(
        expect.objectContaining({
          value: "Automated",
          rawValue: "42",
        }),
      );
    });

    it("should retain raw lookup IDs when list-value enrichment fails", async () => {
      const executionResponse = {
        data: [{ tcRunID: 24201, udfjson: { priority: 1001 } }],
        hasTcRunUdf: true,
        total: 1,
      };
      const metadataResponse = {
        qmUDF: {
          TCR: {
            "FLD.priority": {
              name: "priority",
              fieldLabel: "Priority",
              projectUserFieldID: 9841,
              fieldTypeName: "LOOKUPLIST",
              listMasterID: 700,
              qmListName: "priority_list",
            },
          },
        },
        qmUDFList: {},
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(executionResponse))
        .mockResolvedValueOnce(mockOk(metadataResponse))
        .mockRejectedValueOnce(new Error("List API unavailable"));

      const result = (await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAssetId: 1528,
      } as any)) as any;

      expect(result.data[0].testRunUdfs[0]).toEqual(
        expect.objectContaining({
          value: 1001,
          rawValue: 1001,
        }),
      );
    });

    it("should POST with correct URL when using linkedAsset directly", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockExecutionResponse));

      await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAsset: { type: "DF", id: 9598240 },
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.linkedAsset).toEqual({ type: "DF", id: 9598240 });
    });

    it("should include filter and pagination in request body", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockExecutionResponse));

      await fetchIssueExecutions(token, baseUrl, projectKey, {
        linkedAsset: { type: "DF", id: 9509016 },
        filter:
          '[{"type":"list","field":"runStatusName","value":["failed","passed"]}]',
        page: 1,
        start: 0,
        limit: 20,
        platformID: "100145",
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.filter).toContain("runStatusName");
      expect(body.limit).toBe(20);
      expect(body.platformID).toBe("100145");
    });

    it("should throw when linkedAssetId is missing", async () => {
      await expect(
        fetchIssueExecutions(token, baseUrl, projectKey, {} as any),
      ).rejects.toThrow(
        /Missing or invalid required parameter: 'linkedAssetId'/,
      );
    });

    it("should throw when linkedAssetId is not a number", async () => {
      await expect(
        fetchIssueExecutions(token, baseUrl, projectKey, {
          linkedAssetId: "invalid",
        } as any),
      ).rejects.toThrow(
        /Missing or invalid required parameter: 'linkedAssetId'/,
      );
    });
  });
});
