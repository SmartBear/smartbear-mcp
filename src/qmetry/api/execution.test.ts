import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateExecutionStatus } from "../client/testsuite.js";
import type { BulkUpdateExecutionStatusPayload } from "../types/testsuite.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

const STATUS_URL = `${baseUrl}/rest/execution/runstatus/bulkupdate`;
const METADATA_URL = `${baseUrl}/rest/admin/udf/metadata`;
const RUNS_URL = `${baseUrl}/rest/execution/list/viewColumns`;
const UDF_URL = `${baseUrl}/rest/execution/udf/bulkupdate`;

const mockOk = (data: any) => ({
  ok: true,
  json: async () => data,
});

const metadataWith = (fields: Record<string, any>) => ({
  qmUDF: { TCR: fields },
  qmUDFList: {},
});

const NO_MANDATORY_METADATA = metadataWith({
  "FLD.notes": {
    projectUserFieldID: 11,
    name: "notes",
    fieldLabel: "Notes",
    fieldTypeName: "STRING",
    allowBlank: true,
  },
});

const MANDATORY_METADATA = metadataWith({
  "FLD.test_env": {
    projectUserFieldID: 101,
    name: "test_env",
    fieldLabel: "Test Env",
    fieldTypeName: "STRING",
    allowBlank: false,
  },
  "FLD.notes": {
    projectUserFieldID: 11,
    name: "notes",
    fieldLabel: "Notes",
    fieldTypeName: "STRING",
    allowBlank: true,
  },
});

const runRow = (tcRunID: number, udfs: Record<string, unknown> = {}) => ({
  tcRunID,
  entityKey: `TC-${tcRunID}`,
  udfjson: JSON.stringify(udfs),
});

/**
 * Routes mocked fetch calls by URL so tests can assert call order and bodies.
 * `runPages` are returned in order for successive viewColumns calls.
 */
function mockQmetry(opts: {
  metadata: any;
  runPages?: any[];
  udfFailsOnCall?: number;
}) {
  let runPage = 0;
  let udfCall = 0;
  globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url === METADATA_URL) return mockOk(opts.metadata);
    if (url === RUNS_URL) return mockOk(opts.runPages?.[runPage++] ?? {});
    if (url === UDF_URL) {
      udfCall++;
      if (opts.udfFailsOnCall === udfCall) {
        return {
          ok: false,
          status: 500,
          statusText: "Server Error",
          json: async () => ({ message: "boom" }),
          text: async () => "boom",
        };
      }
      return mockOk({ code: "CO.BULK_TC_EXECUTION_UDF_UPDATE_STARTED" });
    }
    if (url === STATUS_URL) return mockOk({ success: true });
    throw new Error(`Unexpected URL ${url}`);
  });
}

const calls = () =>
  (globalThis.fetch as any).mock.calls.map(([url, options]: any) => ({
    url,
    method: options.method,
    body: options.body ? JSON.parse(options.body) : undefined,
  }));

const basePayload: BulkUpdateExecutionStatusPayload = {
  entityIDs: "66095069,66095075",
  entityType: "TCR",
  qmTsRunId: "2720260",
  runStatusID: 123268,
  isBulkOperation: true,
  viewId: 555,
};

describe("testsuite bulk update execution status API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("bulkUpdateExecutionStatus", () => {
    it("should PUT bulk execution status update with correct payload when no UDF is mandatory", async () => {
      mockQmetry({ metadata: NO_MANDATORY_METADATA });

      const result = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        { ...basePayload, comments: "All test cases passed successfully" },
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        STATUS_URL,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            apikey: token,
            project: projectKey,
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("66095069,66095075"),
        }),
      );
      expect(calls().map((c: any) => c.url)).toEqual([
        METADATA_URL,
        STATUS_URL,
      ]);
      expect(result).toEqual({
        success: true,
        udfUpdates: [],
        statusUpdate: { success: true },
      });
    });

    it("should not send gate-only fields in the status body", async () => {
      mockQmetry({ metadata: NO_MANDATORY_METADATA });

      await bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
        ...basePayload,
        entityIDs: "66095087",
        isBulkOperation: false,
        dropID: 947,
        scopeId: 9,
        orgCode: "ORG",
        folderPath: "",
      } as BulkUpdateExecutionStatusPayload);

      const status = calls().find((c: any) => c.url === STATUS_URL);
      expect(status.body).toEqual({
        entityType: "TCR",
        qmRunObj: "",
        entityIDs: "66095087",
        qmTsRunId: "2720260",
        runStatusID: 123268,
        isBulkOperation: false,
        dropID: 947,
      });
    });

    it("should update status when mandatory UDFs are already populated", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [
          {
            total: 2,
            data: [
              runRow(66095069, { test_env: "QA" }),
              runRow(66095075, { test_env: "UAT" }),
            ],
          },
        ],
      });

      const result: any = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        basePayload,
      );

      expect(calls().map((c: any) => c.url)).toEqual([
        METADATA_URL,
        RUNS_URL,
        STATUS_URL,
      ]);
      expect(calls()[1].body).toEqual({
        tsrunID: "2720260",
        viewId: 555,
        start: 0,
        page: 1,
        limit: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should block the whole request when any run is missing a mandatory UDF", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [
          {
            total: 2,
            data: [
              runRow(66095069, { test_env: "QA" }),
              runRow(66095075, { test_env: "" }),
            ],
          },
        ],
      });

      const result: any = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        basePayload,
      );

      expect(result).toMatchObject({
        success: false,
        code: "MANDATORY_TEST_RUN_UDF_MISSING",
        statusUpdated: false,
        runsMissingFields: [
          {
            tcRunID: 66095075,
            entityKey: "TC-66095075",
            missingFields: [
              {
                name: "test_env",
                label: "Test Env",
                fieldID: 101,
                fieldType: "STRING",
              },
            ],
          },
        ],
      });
      const urls = calls().map((c: any) => c.url);
      expect(urls).not.toContain(STATUS_URL);
      expect(urls).not.toContain(UDF_URL);
    });

    it("should block when supplied values do not cover every missing run", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [{ total: 2, data: [runRow(66095069), runRow(66095075)] }],
      });

      const result: any = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        {
          ...basePayload,
          udfValuesByRun: { "66095069": { test_env: { value: "QA" } } },
        },
      );

      expect(result.code).toBe("MANDATORY_TEST_RUN_UDF_MISSING");
      expect(result.runsMissingFields.map((r: any) => r.tcRunID)).toEqual([
        66095075,
      ]);
      expect(calls().map((c: any) => c.url)).not.toContain(UDF_URL);
    });

    it("should write supplied UDFs first (fieldID auto-filled) and then update status", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [{ total: 2, data: [runRow(66095069), runRow(66095075)] }],
      });

      const result: any = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        {
          ...basePayload,
          udfValuesByRun: {
            "66095069": { test_env: { value: "QA" } },
            "66095075": { test_env: { value: "QA" } },
          },
        },
      );

      expect(calls().map((c: any) => c.url)).toEqual([
        METADATA_URL,
        RUNS_URL,
        UDF_URL,
        STATUS_URL,
      ]);
      expect(calls()[2].body).toEqual({
        tcRunIDs: [66095069, 66095075],
        UDF: { test_env: { fieldID: 101, value: "QA" } },
      });
      expect(result.success).toBe(true);
      expect(result.udfUpdates).toHaveLength(1);
      expect(result.udfUpdates[0].tcRunIDs).toEqual([66095069, 66095075]);
    });

    it("should send one UDF bulk call per distinct value set", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [{ total: 2, data: [runRow(66095069), runRow(66095075)] }],
      });

      await bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
        ...basePayload,
        udfValuesByRun: {
          "66095069": { test_env: { value: "QA" } },
          "66095075": { test_env: { value: "UAT" } },
        },
      });

      const udfBodies = calls()
        .filter((c: any) => c.url === UDF_URL)
        .map((c: any) => c.body);
      expect(udfBodies).toEqual([
        {
          tcRunIDs: [66095069],
          UDF: { test_env: { fieldID: 101, value: "QA" } },
        },
        {
          tcRunIDs: [66095075],
          UDF: { test_env: { fieldID: 101, value: "UAT" } },
        },
      ]);
      expect(calls().at(-1).url).toBe(STATUS_URL);
    });

    it("should find runs on later pages", async () => {
      const filler = Array.from({ length: 100 }, (_, i) => runRow(1000 + i));
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [
          { total: 101, data: filler },
          { total: 101, data: [runRow(66095069, { test_env: "QA" })] },
        ],
      });

      const result: any = await bulkUpdateExecutionStatus(
        token,
        baseUrl,
        projectKey,
        { ...basePayload, entityIDs: "66095069" },
      );

      const runCalls = calls().filter((c: any) => c.url === RUNS_URL);
      expect(runCalls.map((c: any) => c.body.start)).toEqual([0, 100]);
      expect(result.success).toBe(true);
    });

    it("should throw when a run is not in the test suite run", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [{ total: 1, data: [runRow(66095069, { test_env: "QA" })] }],
      });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, basePayload),
      ).rejects.toThrow("tcRunID(s) 66095075 not found in test suite run");
      expect(calls().map((c: any) => c.url)).not.toContain(STATUS_URL);
    });

    it("should throw on udfValuesByRun keys not in entityIDs", async () => {
      mockQmetry({ metadata: MANDATORY_METADATA });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
          ...basePayload,
          udfValuesByRun: { "999": { test_env: { value: "QA" } } },
        }),
      ).rejects.toThrow("not in 'entityIDs': 999");
    });

    it("should throw on unknown UDF field names", async () => {
      mockQmetry({ metadata: MANDATORY_METADATA });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
          ...basePayload,
          udfValuesByRun: { "66095069": { not_a_field: { value: "x" } } },
        }),
      ).rejects.toThrow("unknown Test Run UDF field names: not_a_field");
    });

    it("should not update status when a UDF bulk update fails", async () => {
      mockQmetry({
        metadata: MANDATORY_METADATA,
        runPages: [{ total: 2, data: [runRow(66095069), runRow(66095075)] }],
        udfFailsOnCall: 2,
      });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
          ...basePayload,
          udfValuesByRun: {
            "66095069": { test_env: { value: "QA" } },
            "66095075": { test_env: { value: "UAT" } },
          },
        }),
      ).rejects.toThrow(
        /failed for tcRunIDs 66095075; execution status was NOT updated\. UDF updates already applied for tcRunIDs: 66095069/,
      );
      expect(calls().map((c: any) => c.url)).not.toContain(STATUS_URL);
    });

    it("should skip the gate for TCSR step runs", async () => {
      mockQmetry({ metadata: MANDATORY_METADATA });

      await bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
        ...basePayload,
        entityType: "TCSR",
      });

      expect(calls().map((c: any) => c.url)).toEqual([STATUS_URL]);
    });

    it("should reject udfValuesByRun for TCSR", async () => {
      mockQmetry({ metadata: MANDATORY_METADATA });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
          ...basePayload,
          entityType: "TCSR",
          udfValuesByRun: { "66095069": { test_env: { value: "QA" } } },
        }),
      ).rejects.toThrow("only supported when entityType is 'TCR'");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should require viewId when mandatory UDFs exist", async () => {
      mockQmetry({ metadata: MANDATORY_METADATA });

      await expect(
        bulkUpdateExecutionStatus(token, baseUrl, projectKey, {
          ...basePayload,
          viewId: undefined,
        }),
      ).rejects.toThrow("'viewId'");
    });
  });
});
