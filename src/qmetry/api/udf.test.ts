import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkUpdateTestRunUdfs,
  fetchTestRunUdfMetadata,
  fetchTestRunUdfValues,
} from "../client/udf.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("UDF API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  describe("bulkUpdateTestRunUdfs", () => {
    const mockSuccessResponse = {
      success: true,
      code: "CO.BULK_TC_EXECUTION_UDF_UPDATE_STARTED",
      message:
        'Bulk updates to execution UDF values will run in the background. Go to "Scheduled Task" to track the process.',
    };

    it("should PUT to correct endpoint with tcRunIDs and UDF payload", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      const result = await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006, 41572009, 41572013],
        UDF: {
          "8190_String": { fieldID: 229241, value: "test" },
        },
        scopeId: 42307,
        orgCode: "2O5API",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/execution/udf/bulkupdate`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
          }),
        }),
      );

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.tcRunIDs).toEqual([41572006, 41572009, 41572013]);
      expect(body.UDF["8190_String"].fieldID).toBe(229241);
      expect(body.UDF["8190_String"].value).toBe("test");

      expect((result as any).success).toBe(true);
    });

    it("should apply default multiSelectAction 'append' for array values when not specified", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006],
        UDF: {
          m_selections: { fieldID: 229223, value: [5158524, 5158525] },
        },
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.UDF.m_selections.multiSelectAction).toBe("append");
    });

    it("should preserve explicit multiSelectAction 'replace' for multi-select fields", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006, 41572009],
        UDF: {
          mullt_env: {
            fieldID: 229425,
            value: [5108697, 5108698],
            multiSelectAction: "replace",
          },
        },
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.UDF.mullt_env.multiSelectAction).toBe("replace");
    });

    it("should not include multiSelectAction for non-array values", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006],
        UDF: {
          defaultNum: { fieldID: 229003, value: 3 },
        },
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.UDF.defaultNum.multiSelectAction).toBeUndefined();
    });

    it("should handle cascading list value with parent and child", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006, 41572009],
        UDF: {
          cascade_mcp: {
            fieldID: 229426,
            value: { parent: 5126498, child: 5126499 },
          },
        },
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.UDF.cascade_mcp.value).toEqual({
        parent: 5126498,
        child: 5126499,
      });
    });

    it("should handle bulk update with multiple UDF fields of different types", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockSuccessResponse));

      await bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
        tcRunIDs: [41572006, 41572009, 41572013, 41572015, 41579875, 41666420],
        UDF: {
          "8190_String": { fieldID: 229241, value: "test" },
          "8260LUP": { fieldID: 228563, value: 5108697 },
          cascade_mcp: {
            fieldID: 229426,
            value: { parent: 5126498, child: 5126499 },
          },
          defaultNum: { fieldID: 229003, value: 3 },
          KN_DATE: { fieldID: 229255, value: "06-20-2026" },
          m_selections: {
            fieldID: 229223,
            value: [5158524, 5158525],
            multiSelectAction: "append",
          },
          mullt_env: {
            fieldID: 229425,
            value: [5108697, 5108698],
            multiSelectAction: "replace",
          },
        },
        scopeId: 42307,
        orgCode: "2O5API",
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.tcRunIDs).toHaveLength(6);
      expect(Object.keys(body.UDF)).toHaveLength(7);
      expect(body.UDF.KN_DATE.value).toBe("06-20-2026");
      expect(body.UDF.m_selections.multiSelectAction).toBe("append");
      expect(body.UDF.mullt_env.multiSelectAction).toBe("replace");
    });

    it("should throw when tcRunIDs is empty", async () => {
      await expect(
        bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
          tcRunIDs: [],
          UDF: { "8190_String": { fieldID: 229241, value: "test" } },
        }),
      ).rejects.toThrow(/tcRunIDs.*non-empty array/);
    });

    it("should throw when UDF object is empty", async () => {
      await expect(
        bulkUpdateTestRunUdfs(token, baseUrl, projectKey, {
          tcRunIDs: [41572006],
          UDF: {},
        }),
      ).rejects.toThrow(/UDF.*at least one/);
    });
  });

  describe("fetchTestRunUdfMetadata", () => {
    const mockMetaResponse = {
      qmUDF: {
        TCR: {
          "FLD.planned_execution_date": {
            projectUserFieldID: 229460,
            name: "planned_execution_date",
            fieldLabel: "Planned Execution Date",
            fieldTypeName: "DATETIMEPICKER",
            allowBlank: true,
          },
          "FLD.test_env": {
            projectUserFieldID: 229461,
            name: "test_env",
            fieldLabel: "Test Environment",
            fieldTypeName: "STRING",
            allowBlank: false,
          },
        },
      },
      qmUDFList: {},
    };

    it("should POST to metadata endpoint with entityType=TCR and special headers", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockMetaResponse));

      await fetchTestRunUdfMetadata(token, baseUrl, projectKey, {
        scopeId: 46270,
        orgCode: "2O5API",
      });

      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, opts] = (global.fetch as any).mock.calls[0];
      expect(url).toContain("/rest/admin/udf/metadata");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toMatchObject({ entityType: "TCR" });
      expect(opts.headers.action).toBe("fetch-steps");
      expect(opts.headers.screenname).toBe("EXECUTION RUN");
    });

    it("should return normalized fields array with fieldID and label", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockMetaResponse));

      const result = (await fetchTestRunUdfMetadata(
        token,
        baseUrl,
        projectKey,
        {},
      )) as any;

      expect(result.fields).toHaveLength(2);
      const dateField = result.fields.find(
        (f: any) => f.name === "planned_execution_date",
      );
      expect(dateField).toBeDefined();
      expect(dateField.fieldID).toBe(229460);
      expect(dateField.label).toBe("Planned Execution Date");
      expect(dateField.fieldType).toBe("DATETIMEPICKER");
    });

    it("should return empty fields array when no TCR UDFs exist", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockOk({ qmUDF: { TCR: {} }, qmUDFList: {} }));

      const result = (await fetchTestRunUdfMetadata(
        token,
        baseUrl,
        projectKey,
        {},
      )) as any;

      expect(result.fields).toEqual([]);
    });

    it("should include _note with fieldID usage instructions", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockMetaResponse));

      const result = (await fetchTestRunUdfMetadata(
        token,
        baseUrl,
        projectKey,
        {},
      )) as any;

      expect(result._note).toContain("fieldID");
    });
  });

  describe("fetchTestRunUdfValues", () => {
    const mockRunsResponse = {
      hasTcRunUdf: true,
      total: 1,
      data: [
        {
          tcRunID: 41667465,
          entityKey: "TC-001",
          summary: "Test Case 1",
          runStatus: "Not Run",
          udfjson: JSON.stringify({ planned_execution_date: "06-23-2026" }),
        },
      ],
    };

    const mockMetaResponse = {
      qmUDF: {
        TCR: {
          "FLD.planned_execution_date": {
            projectUserFieldID: 229460,
            name: "planned_execution_date",
            fieldLabel: "Planned Execution Date",
            fieldTypeName: "DATETIMEPICKER",
            allowBlank: true,
          },
        },
      },
      qmUDFList: {},
    };

    it("should call both runs API and metadata API when hasTcRunUdf is true", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(mockRunsResponse))
        .mockResolvedValueOnce(mockOk(mockMetaResponse));

      await fetchTestRunUdfValues(token, baseUrl, projectKey, {
        tsrunID: "731600",
        viewId: 87039,
        scopeId: 46270,
        orgCode: "2O5API",
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should return hasTcRunUdf=false immediately when project has no UDFs", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          mockOk({ hasTcRunUdf: false, total: 2, data: [] }),
        );

      const result = (await fetchTestRunUdfValues(token, baseUrl, projectKey, {
        tsrunID: "731600",
        viewId: 87039,
      })) as any;

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.hasTcRunUdf).toBe(false);
      expect(result.runs).toEqual([]);
      expect(result._note).toContain("No Test Run UDFs");
    });

    it("should enrich UDF values with label and fieldID from metadata", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(mockRunsResponse))
        .mockResolvedValueOnce(mockOk(mockMetaResponse));

      const result = (await fetchTestRunUdfValues(token, baseUrl, projectKey, {
        tsrunID: "731600",
        viewId: 87039,
      })) as any;

      expect(result.runs).toHaveLength(1);
      const udf = result.runs[0].testRunUdfs[0];
      expect(udf.name).toBe("planned_execution_date");
      expect(udf.label).toBe("Planned Execution Date");
      expect(udf.fieldID).toBe(229460);
      expect(udf.value).toBe("06-23-2026");
    });

    it("should throw when tsrunID is missing", async () => {
      await expect(
        fetchTestRunUdfValues(token, baseUrl, projectKey, {
          tsrunID: "",
          viewId: 87039,
        }),
      ).rejects.toThrow("tsrunID");
    });

    it("should throw when viewId is missing", async () => {
      await expect(
        fetchTestRunUdfValues(token, baseUrl, projectKey, {
          tsrunID: "731600",
          viewId: undefined as any,
        }),
      ).rejects.toThrow("viewId");
    });

    it("should include availableUdfFields in response", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(mockRunsResponse))
        .mockResolvedValueOnce(mockOk(mockMetaResponse));

      const result = (await fetchTestRunUdfValues(token, baseUrl, projectKey, {
        tsrunID: "731600",
        viewId: 87039,
      })) as any;

      expect(result.availableUdfFields).toHaveLength(1);
      expect(result.availableUdfFields[0].fieldID).toBe(229460);
    });
  });
});
