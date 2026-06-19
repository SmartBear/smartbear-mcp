import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkUpdateTestRunUdfs,
  createUdf,
  fetchCustomLists,
  fetchUdfFieldTypes,
} from "../../../../qmetry/client/udf.js";
import { UDF_FIELD_TYPES } from "../../../../qmetry/config/constants.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

const mockProjectInfoResponse = {
  currentProjectId: 42307,
  clientCode: "2O5API",
  projectName: "Test Project",
  latestViews: { TC: { viewId: 1001 } },
};

describe("UDF API clients", () => {
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

  describe("createUdf", () => {
    it("should POST with correct URL and required fields when scopeId is provided", async () => {
      const successResponse = {
        success: true,
        code: "AD.ADD_USERDEFINEDFIELD_SUCCESS",
        message: "User defined field created successfully.",
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(successResponse));

      const result = await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 6,
        name: "test_field",
        label: "Test Field",
        fieldLength: 50,
        modules: [3],
        scopeId: 42307,
        orgCode: "2O5API",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/admin/userdefinefield/create`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
            scope: "42307",
            orgcode: "2O5API",
          }),
          body: expect.stringContaining('"fieldTypeID":6'),
        }),
      );

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.name).toBe("test_field");
      expect(body.label).toBe("Test Field");
      expect(body.fieldLength).toBe(50);
      expect(body.data[0].projectID).toBe(42307);
      expect(body.data[0].modules[0].moduleID).toBe(3);
      expect(body.data[0].modules[0].mandatory).toBe(false);

      expect(result).toHaveProperty("success", true);
    });

    it("should fetch project info when scopeId is not provided", async () => {
      const successResponse = {
        success: true,
        code: "AD.ADD_USERDEFINEDFIELD_SUCCESS",
        message: "User defined field created successfully.",
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockOk(mockProjectInfoResponse))
        .mockResolvedValueOnce(mockOk(successResponse));

      await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 2,
        name: "notes_udf",
        label: "Notes",
        modules: [3, 32],
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      // First call fetches project info
      expect((global.fetch as any).mock.calls[0][0]).toContain(
        "/rest/admin/project/getinfo",
      );
      // Second call creates UDF
      expect((global.fetch as any).mock.calls[1][0]).toContain(
        "/rest/admin/userdefinefield/create",
      );

      const body = JSON.parse(
        (global.fetch as any).mock.calls[1][1].body as string,
      );
      expect(body.data[0].projectID).toBe(42307);
    });

    it("should include lookuplistId for LOOKUPLIST field type", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockOk({
          success: true,
          message: "User defined field created successfully.",
        }),
      );

      await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 3,
        name: "lookup_field",
        label: "Lookup Field",
        lookuplistId: 2398198,
        modules: [3],
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.lookuplistId).toBe(2398198);
      expect(body.fieldTypeID).toBe(3);
    });

    it("should include listValues, defaultValue, defaultChildValue for CASCADINGLIST", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockOk({
          success: true,
          message: "User defined field created successfully.",
        }),
      );

      await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 7,
        name: "cascade_mcp2",
        label: "cascade_mcp2",
        lookuplistId: 2381199,
        modules: [32],
        listValues: [
          { id: 5126498, name: "abc", projectID: 42307 },
          { id: 5126500, name: "vkc", projectID: 42307 },
        ],
        defaultValue: [5126498],
        defaultChildValue: [5126499],
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.fieldTypeID).toBe(7);
      expect(body.lookuplistId).toBe(2381199);
      expect(body.data[0].listValues).toHaveLength(2);
      expect(body.data[0].listValues[0].id).toBe(5126498);
      expect(body.data[0].defaultValue).toEqual([5126498]);
      expect(body.data[0].defaultChildValue).toEqual([5126499]);
    });

    it("should include defaultValue for LOOKUPLIST without listValues or defaultChildValue", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockOk({
          success: true,
          message: "User defined field created successfully.",
        }),
      );

      await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 3,
        name: "card_type_field",
        label: "Card Type",
        lookuplistId: 2398198,
        modules: [3],
        defaultValue: [2398200],
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.data[0].defaultValue).toEqual([2398200]);
      expect(body.data[0].listValues).toBeUndefined();
      expect(body.data[0].defaultChildValue).toBeUndefined();
    });

    it("should set mandatory=true for modules when specified", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockOk({
          success: true,
          message: "User defined field created successfully.",
        }),
      );

      await createUdf(token, baseUrl, projectKey, {
        fieldTypeID: 5,
        name: "count_field",
        label: "Count",
        modules: [3, 6],
        mandatory: true,
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.data[0].modules[0].mandatory).toBe(true);
      expect(body.data[0].modules[1].mandatory).toBe(true);
    });

    it("should throw error when field name contains invalid characters", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 6,
          name: "invalid field name!",
          label: "Invalid",
          modules: [3],
          scopeId: 42307,
        }),
      ).rejects.toThrow(
        /Field name can only contain alphanumeric characters and underscore/,
      );
    });

    it("should throw error when fieldTypeID is missing", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: "not-a-number" as any,
          name: "valid_name",
          label: "Label",
          modules: [3],
          scopeId: 42307,
        }),
      ).rejects.toThrow(/Missing or invalid required parameter: 'fieldTypeID'/);
    });

    it("should throw error when modules array is empty", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 6,
          name: "valid_name",
          label: "Label",
          modules: [],
          scopeId: 42307,
        }),
      ).rejects.toThrow(/Missing or invalid required parameter: 'modules'/);
    });

    it("should throw error when lookuplistId is missing for LOOKUPLIST type", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 3,
          name: "lookup_field",
          label: "Lookup",
          modules: [3],
          scopeId: 42307,
        }),
      ).rejects.toThrow(/lookuplistId.*is required/);
    });

    it("should throw error when lookuplistId is missing for MULTILOOKUPLIST type", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 4,
          name: "multi_field",
          label: "Multi",
          modules: [3],
          scopeId: 42307,
        }),
      ).rejects.toThrow(/lookuplistId.*is required/);
    });

    it("should throw error when lookuplistId is missing for CASCADINGLIST type", async () => {
      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 7,
          name: "cascade_field",
          label: "Cascade",
          modules: [32],
          scopeId: 42307,
        }),
      ).rejects.toThrow(/lookuplistId.*is required/);
    });

    it("should handle API error gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFail(400, "Bad Request"));

      await expect(
        createUdf(token, baseUrl, projectKey, {
          fieldTypeID: 6,
          name: "test_field",
          label: "Test",
          modules: [3],
          scopeId: 42307,
        }),
      ).rejects.toThrow();
    });
  });

  describe("fetchCustomLists", () => {
    it("should POST with correct URL and default pagination", async () => {
      const mockResponse = {
        data: [
          {
            Id: 2398198,
            fieldName: "CardType",
            Listname: "Card Type",
            SystemDefine: false,
            noofitems: 3,
            isEditable: true,
            listType: "Normal",
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchCustomLists(token, baseUrl, projectKey, {
        scopeId: 42307,
        orgCode: "2O5API",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/admin/customlist/list`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
          }),
        }),
      );

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.start).toBe(0);
      expect(body.limit).toBe(50);
      expect(body.page).toBe(1);

      expect((result as any).data).toHaveLength(1);
      expect((result as any).data[0].Id).toBe(2398198);
    });

    it("should include listName filter when provided", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));

      await fetchCustomLists(token, baseUrl, projectKey, {
        listName: "Card Type",
        scopeId: 42307,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.filter).toContain("Card Type");
      expect(body.filter).toContain("Listname");
    });

    it("should use custom pagination parameters", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));

      await fetchCustomLists(token, baseUrl, projectKey, {
        start: 10,
        page: 2,
        limit: 25,
      });

      const body = JSON.parse(
        (global.fetch as any).mock.calls[0][1].body as string,
      );
      expect(body.start).toBe(10);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(25);
    });
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

  describe("fetchUdfFieldTypes", () => {
    it("should return constant field types when API response matches", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk([...UDF_FIELD_TYPES]));

      const result = (await fetchUdfFieldTypes(token, baseUrl, projectKey, {
        scopeId: 42307,
      })) as any[];

      expect(result).toHaveLength(UDF_FIELD_TYPES.length);
      expect(result.find((t) => t.Fieldtype === "STRING")).toBeDefined();
      expect(result.find((t) => t.Fieldtype === "LARGETEXT")).toBeDefined();
    });

    it("should merge new field types from API not in constant", async () => {
      const newType = {
        Id: 99,
        Fieldtype: "NEWTYPE",
        Description: "A brand new field type from the API.",
        Preview: "ad-new-ico",
      };

      global.fetch = vi
        .fn()
        .mockResolvedValue(mockOk([...UDF_FIELD_TYPES, newType]));

      const result = (await fetchUdfFieldTypes(token, baseUrl, projectKey, {
        scopeId: 42307,
      })) as any[];

      expect(result).toHaveLength(UDF_FIELD_TYPES.length + 1);
      expect(result.find((t) => t.Fieldtype === "NEWTYPE")).toBeDefined();
    });

    it("should fall back to constant when API call fails", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFail(500, "Server Error"));

      const result = (await fetchUdfFieldTypes(
        token,
        baseUrl,
        projectKey,
        {},
      )) as any[];

      expect(result).toHaveLength(UDF_FIELD_TYPES.length);
    });

    it("should call the field types API endpoint", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk([...UDF_FIELD_TYPES]));

      await fetchUdfFieldTypes(token, baseUrl, projectKey, {});

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/admin/userdefinefieldtype/list`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
