import { beforeEach, describe, expect, it, vi } from "vitest";
import { QMETRY_HANDLER_MAP } from "../../../../qmetry/client/handlers.js";
import {
  fetchRequirementDetails,
  fetchRequirements,
} from "../../../../qmetry/client/requirement.js";
import { fetchTestCasesLinkedToRequirement } from "../../../../qmetry/client/testcase.js";
import { QMetryToolsHandlers } from "../../../../qmetry/config/constants.js";
import { DEFAULT_FETCH_REQUIREMENTS_PAYLOAD } from "../../../../qmetry/types/requirements.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("requirement API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Handler mapping tests
  describe("Handler Mappings", () => {
    it("should have fetchRequirements mapped to FETCH_REQUIREMENTS handler", () => {
      expect(QMETRY_HANDLER_MAP[QMetryToolsHandlers.FETCH_REQUIREMENTS]).toBe(
        fetchRequirements,
      );
    });

    it("should have fetchRequirementDetails mapped to FETCH_REQUIREMENT_DETAILS handler", () => {
      expect(
        QMETRY_HANDLER_MAP[QMetryToolsHandlers.FETCH_REQUIREMENT_DETAILS],
      ).toBe(fetchRequirementDetails);
    });

    it("should export fetchRequirements function", () => {
      expect(typeof fetchRequirements).toBe("function");
    });

    it("should export fetchRequirementDetails function", () => {
      expect(typeof fetchRequirementDetails).toBe("function");
    });
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  const mockFail = (status = 400, errorText = "Bad Request") => ({
    ok: false,
    status,
    headers: new Map([["content-type", "text/plain"]]),
    text: async () => errorText,
  });

  describe("fetchRequirements", () => {
    it("should POST with correct URL and headers", async () => {
      const payload = {
        ...DEFAULT_FETCH_REQUIREMENTS_PAYLOAD,
        viewId: 54321,
        folderPath: "",
      };
      const mockResponse = {
        data: [
          { id: 1, entityKey: "MAC-RQ-748", name: "Accessories & OS" },
          { id: 2, entityKey: "MAC-RQ-749", name: "Login System" },
        ],
        total: 2,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchRequirements(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/requirements/list/viewColumns`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining("54321"),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(2);
      expect((result as any).total).toBe(2);
    });

    it("should throw error when viewId is missing", async () => {
      const payload = { folderPath: "" };

      await expect(
        fetchRequirements(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[fetchRequirements] Missing or invalid required parameter: 'viewId'.",
      );
    });

    it("should throw error when folderPath is missing", async () => {
      const payload = { viewId: 54321 };

      await expect(
        fetchRequirements(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[fetchRequirements] Missing or invalid required parameter: 'folderPath'.",
      );
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFail(403, "Access denied"));

      const payload = { viewId: 54321, folderPath: "" };

      await expect(
        fetchRequirements(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        /QMetry API Authentication Failed: Invalid or expired API key/,
      );
    });
  });

  describe("fetchRequirementDetails", () => {
    it("should POST with correct URL and headers for requirement details", async () => {
      const mockResponse = {
        id: 2499315,
        entityKey: "MAC-RQ-748",
        name: "Accessories & OS",
        summary: "Requirement for accessories and OS compatibility",
        version: 1,
        status: "Active",
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const payload = { id: 2499315, version: 1 };
      const result = await fetchRequirementDetails(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/requirements/detail/data`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining("2499315"),
        }),
      );

      expect(result).toHaveProperty("id", 2499315);
      expect(result).toHaveProperty("entityKey", "MAC-RQ-748");
      expect(result).toHaveProperty("name", "Accessories & OS");
    });

    it("should throw error when id is missing", async () => {
      const payload = { version: 1 };

      await expect(
        fetchRequirementDetails(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[fetchRequirementDetails] Missing or invalid required parameter: 'id'.",
      );
    });

    it("should throw error when version is missing", async () => {
      const payload = { id: 2499315 };

      await expect(
        fetchRequirementDetails(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[fetchRequirementDetails] Missing or invalid required parameter: 'version'.",
      );
    });

    it("should throw error when id is not a number", async () => {
      const payload = { id: "invalid-id", version: 1 };

      await expect(
        fetchRequirementDetails(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[fetchRequirementDetails] Missing or invalid required parameter: 'id'.",
      );
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockFail(404, "Requirement not found"));

      const payload = { id: 99999, version: 1 };

      await expect(
        fetchRequirementDetails(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        /QMetry API request failed \(404\): Requirement not found/,
      );
    });

    it("should handle JSON error responses", async () => {
      const errorResponse = { error: "Invalid requirement ID", code: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([["content-type", "application/json"]]),
        json: async () => errorResponse,
      });

      const payload = { id: 2499315, version: 1 };

      await expect(
        fetchRequirementDetails(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/QMetry API request failed \(400\):/);
    });
  });

  describe("QMetry Test Cases Linked to Requirement Handler", () => {
    it("should have fetchTestCasesLinkedToRequirement mapped to FETCH_TESTCASES_LINKED_TO_REQUIREMENT handler", () => {
      expect(
        QMETRY_HANDLER_MAP[
          QMetryToolsHandlers.FETCH_TESTCASES_LINKED_TO_REQUIREMENT
        ],
      ).toBe(fetchTestCasesLinkedToRequirement);
    });

    it("should export fetchTestCasesLinkedToRequirement function", () => {
      expect(typeof fetchTestCasesLinkedToRequirement).toBe("function");
    });

    describe("fetchTestCasesLinkedToRequirement", () => {
      it("should throw error when rqID is missing", async () => {
        const mockPayload = {
          getLinked: true,
          // rqID is missing
        };

        await expect(
          fetchTestCasesLinkedToRequirement(
            "token",
            "baseUrl",
            "project",
            mockPayload as any,
          ),
        ).rejects.toThrow(
          "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
        );
      });

      it("should throw error when rqID is not a number", async () => {
        const mockPayload = {
          rqID: "invalid-id",
          getLinked: true,
        };

        await expect(
          fetchTestCasesLinkedToRequirement(
            "token",
            "baseUrl",
            "project",
            mockPayload as any,
          ),
        ).rejects.toThrow(
          "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
        );
      });

      it("should throw error when rqID is null", async () => {
        const mockPayload = {
          rqID: null,
          getLinked: true,
        };

        await expect(
          fetchTestCasesLinkedToRequirement(
            "token",
            "baseUrl",
            "project",
            mockPayload as any,
          ),
        ).rejects.toThrow(
          "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
        );
      });
    });
  });
});
