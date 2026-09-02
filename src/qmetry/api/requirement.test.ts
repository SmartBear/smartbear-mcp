import { beforeEach, describe, expect, it, vi } from "vitest";
import { QMETRY_HANDLER_MAP } from "../client/handlers.js";
import {
  createRequirement,
  fetchRequirementDetails,
  fetchRequirements,
  updateRequirement,
} from "../client/requirement.js";
import { fetchTestCasesLinkedToRequirement } from "../client/testcase.js";
import { QMetryToolsHandlers } from "../config/constants.js";
import { DEFAULT_FETCH_REQUIREMENTS_PAYLOAD } from "../types/requirements.js";

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

    it("should have createRequirement mapped to CREATE_REQUIREMENT handler", () => {
      expect(QMETRY_HANDLER_MAP[QMetryToolsHandlers.CREATE_REQUIREMENT]).toBe(
        createRequirement,
      );
    });

    it("should have updateRequirement mapped to UPDATE_REQUIREMENT handler", () => {
      expect(QMETRY_HANDLER_MAP[QMetryToolsHandlers.UPDATE_REQUIREMENT]).toBe(
        updateRequirement,
      );
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

  // createRequirement/updateRequirement both call getProjectInfo (GET) first as a
  // external-integration gate check, then send the actual create/update request.
  // Tests that don't care about the gate use a "not externally integrated" project info
  // response for that first call.
  const notExternallyIntegratedProjectInfo = {
    isExtTrackerConfigured: false,
    extTrackerType: 0,
    isRQConfigured: false,
  };

  const mockGateThenResponse = (
    response: any,
    projectInfo: any = notExternallyIntegratedProjectInfo,
  ) => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockOk(projectInfo))
      .mockResolvedValueOnce(response);
  };

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

      const payload = {
        viewId: 54321,
        folderPath: "",
        isFilterSaveRequired: false,
      };

      await expect(
        fetchRequirements(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/QMetry Authorization Error: Insufficient permissions/);
    });
  });

  describe("createRequirement", () => {
    it("should POST with correct URL, headers, and body", async () => {
      const mockResponse = {
        id: 2073,
        entityKey: "MAC-RQ-730",
        name: "New login requirement",
      };

      mockGateThenResponse(mockOk(mockResponse));

      const payload = {
        name: "New login requirement",
        priority: 688864,
        component: [689030],
        requirementOwner: 8,
        requirementState: 688912,
        releaseCycleMapping: [
          { release: 1628, cycle: [1839, 1840], version: 1 },
        ],
        rqFolderId: "633",
      };

      const result = await createRequirement(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/requirements`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining("New login requirement"),
        }),
      );

      expect(result).toHaveProperty("id", 2073);
      expect(result).toHaveProperty("entityKey", "MAC-RQ-730");
    });

    it("should spread udfFields flat onto the request body", async () => {
      mockGateThenResponse(mockOk({ id: 2073 }));

      await createRequirement(token, baseUrl, projectKey, {
        name: "New login requirement",
        udfFields: { custom_text: "value" },
      } as any);

      const createCall = (global.fetch as any).mock.calls.find(
        ([url]: [string]) => url === `${baseUrl}/rest/requirements`,
      );
      const [, options] = createCall;
      const sentBody = JSON.parse(options.body);
      expect(sentBody.custom_text).toBe("value");
      expect(sentBody.udfFields).toBeUndefined();
    });

    it("should throw error when name is missing", async () => {
      const payload = { priority: 688864 };

      await expect(
        createRequirement(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[createRequirement] Missing or invalid required parameter: 'name'.",
      );
    });

    it("should handle API errors gracefully", async () => {
      mockGateThenResponse(mockFail(403, "Access denied"));

      await expect(
        createRequirement(token, baseUrl, projectKey, {
          name: "New login requirement",
        }),
      ).rejects.toThrow(/QMetry Authorization Error: Insufficient permissions/);
    });

    describe("external-integration hard gate", () => {
      it("should block create when project is Jira-integrated and Requirement is synced with Jira", async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockOk({
            isExtTrackerConfigured: true,
            extTrackerType: 1,
            isRQConfigured: true,
          }),
        );

        await expect(
          createRequirement(token, baseUrl, projectKey, {
            name: "New login requirement",
          }),
        ).rejects.toThrow(
          "[createRequirement] Blocked: This project is Jira-integrated and the Requirement module is " +
            "configured to sync with Jira issue types. Requirements must be created in Jira, not QMetry, " +
            "for this project.",
        );

        // Only the project-info GET should have happened — the create POST must never fire.
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("should block create when project is Azure-integrated and Requirement is synced with Azure", async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockOk({
            isExtTrackerConfigured: true,
            extTrackerType: 3,
            isRQConfigured: true,
          }),
        );

        await expect(
          createRequirement(token, baseUrl, projectKey, {
            name: "New login requirement",
          }),
        ).rejects.toThrow(
          "[createRequirement] Blocked: This project is Azure-integrated and the Requirement module is " +
            "configured to sync with Azure. Requirements must be created in Azure, not QMetry, " +
            "for this project.",
        );

        // Only the project-info GET should have happened — the create POST must never fire.
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("should NOT block when external tracker is configured but it is neither Jira nor Azure (e.g. Rally)", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }), {
          isExtTrackerConfigured: true,
          extTrackerType: 2, // Rally, not Jira
          isRQConfigured: true,
        });

        await expect(
          createRequirement(token, baseUrl, projectKey, {
            name: "New login requirement",
          }),
        ).resolves.toHaveProperty("id", 2073);
      });

      it("should NOT block when Jira is configured but Requirement module isn't synced with it", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }), {
          isExtTrackerConfigured: true,
          extTrackerType: 1,
          isRQConfigured: false,
        });

        await expect(
          createRequirement(token, baseUrl, projectKey, {
            name: "New login requirement",
          }),
        ).resolves.toHaveProperty("id", 2073);
      });

      it("should NOT block when the project has no external tracker configured", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }));

        await expect(
          createRequirement(token, baseUrl, projectKey, {
            name: "New login requirement",
          }),
        ).resolves.toHaveProperty("id", 2073);
      });
    });
  });

  describe("updateRequirement", () => {
    it("should PUT with correct URL, headers, and body", async () => {
      const mockResponse = {
        id: 2073,
        entityKey: "MAC-RQ-730",
        priority: 688865,
      };

      mockGateThenResponse(mockOk(mockResponse));

      const payload = {
        rqId: 2073,
        rqVersionId: 2087,
        updateWithVersion: false,
        priority: 688865,
      };

      const result = await updateRequirement(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/requirements`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining("688865"),
        }),
      );

      expect(result).toHaveProperty("id", 2073);
      expect(result).toHaveProperty("priority", 688865);
    });

    it("should spread udfFields flat onto the request body", async () => {
      mockGateThenResponse(mockOk({ id: 2073 }));

      await updateRequirement(token, baseUrl, projectKey, {
        rqId: 2073,
        rqVersionId: 2087,
        udfFields: { custom_text: "value" },
      } as any);

      const updateCall = (global.fetch as any).mock.calls.find(
        ([url]: [string]) => url === `${baseUrl}/rest/requirements`,
      );
      const [, options] = updateCall;
      const sentBody = JSON.parse(options.body);
      expect(sentBody.custom_text).toBe("value");
      expect(sentBody.udfFields).toBeUndefined();
    });

    it("should PUT with name, description, component, owner, and state", async () => {
      mockGateThenResponse(
        mockOk({
          id: 2073,
          entityKey: "MAC-RQ-730",
          name: "Updated login requirement",
        }),
      );

      const payload = {
        rqId: 2073,
        rqVersionId: 2087,
        name: "Updated login requirement",
        description: "Users must be able to log in with SSO.",
        component: [689030],
        requirementOwner: 8,
        requirementState: 688912,
      };

      await updateRequirement(token, baseUrl, projectKey, payload);

      const updateCall = (global.fetch as any).mock.calls.find(
        ([url]: [string]) => url === `${baseUrl}/rest/requirements`,
      );
      const [, options] = updateCall;
      const sentBody = JSON.parse(options.body);
      expect(sentBody.name).toBe("Updated login requirement");
      expect(sentBody.description).toBe(
        "Users must be able to log in with SSO.",
      );
      expect(sentBody.component).toEqual([689030]);
      expect(sentBody.requirementOwner).toBe(8);
      expect(sentBody.requirementState).toBe(688912);
    });

    it("should throw error when rqId is missing", async () => {
      const payload = { rqVersionId: 2087 };

      await expect(
        updateRequirement(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[updateRequirement] Missing or invalid required parameter: 'rqId'.",
      );
    });

    it("should throw error when rqVersionId is missing", async () => {
      const payload = { rqId: 2073 };

      await expect(
        updateRequirement(token, baseUrl, projectKey, payload as any),
      ).rejects.toThrow(
        "[updateRequirement] Missing or invalid required parameter: 'rqVersionId'.",
      );
    });

    it("should handle API errors gracefully", async () => {
      mockGateThenResponse(mockFail(404, "Requirement not found"));

      await expect(
        updateRequirement(token, baseUrl, projectKey, {
          rqId: 99999,
          rqVersionId: 1,
        }),
      ).rejects.toThrow(
        /QMetry API Invalid URL Error: The API endpoint appears to be incorrect/,
      );
    });

    describe("external-integration hard gate", () => {
      it("should block update when project is Jira-integrated and Requirement is synced with Jira", async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockOk({
            isExtTrackerConfigured: true,
            extTrackerType: 1,
            isRQConfigured: true,
          }),
        );

        await expect(
          updateRequirement(token, baseUrl, projectKey, {
            rqId: 2073,
            rqVersionId: 2087,
            priority: 688865,
          }),
        ).rejects.toThrow(
          "[updateRequirement] Blocked: This project is Jira-integrated and the Requirement module is " +
            "configured to sync with Jira issue types. Requirements must be updated in Jira, not QMetry, " +
            "for this project.",
        );

        // Only the project-info GET should have happened — the update PUT must never fire.
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("should block update when project is Azure-integrated and Requirement is synced with Azure", async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockOk({
            isExtTrackerConfigured: true,
            extTrackerType: 3,
            isRQConfigured: true,
          }),
        );

        await expect(
          updateRequirement(token, baseUrl, projectKey, {
            rqId: 2073,
            rqVersionId: 2087,
            priority: 688865,
          }),
        ).rejects.toThrow(
          "[updateRequirement] Blocked: This project is Azure-integrated and the Requirement module is " +
            "configured to sync with Azure. Requirements must be updated in Azure, not QMetry, " +
            "for this project.",
        );

        // Only the project-info GET should have happened — the update PUT must never fire.
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("should NOT block when external tracker is configured but it is neither Jira nor Azure (e.g. Rally)", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }), {
          isExtTrackerConfigured: true,
          extTrackerType: 2, // Rally, not Jira
          isRQConfigured: true,
        });

        await expect(
          updateRequirement(token, baseUrl, projectKey, {
            rqId: 2073,
            rqVersionId: 2087,
            priority: 688865,
          }),
        ).resolves.toHaveProperty("id", 2073);
      });

      it("should NOT block when Jira is configured but Requirement module isn't synced with it", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }), {
          isExtTrackerConfigured: true,
          extTrackerType: 1,
          isRQConfigured: false,
        });

        await expect(
          updateRequirement(token, baseUrl, projectKey, {
            rqId: 2073,
            rqVersionId: 2087,
            priority: 688865,
          }),
        ).resolves.toHaveProperty("id", 2073);
      });

      it("should NOT block when the project has no external tracker configured", async () => {
        mockGateThenResponse(mockOk({ id: 2073 }));

        await expect(
          updateRequirement(token, baseUrl, projectKey, {
            rqId: 2073,
            rqVersionId: 2087,
            priority: 688865,
          }),
        ).resolves.toHaveProperty("id", 2073);
      });
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
        /QMetry API Invalid URL Error: The API endpoint appears to be incorrect/,
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
