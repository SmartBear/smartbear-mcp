import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../../common/tools";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import { UpdateTestCase } from "../../../../../qtm4j/tool/test-case/update-test-case";

describe("UpdateTestCase", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockUidResolver: any;
  let instance: UpdateTestCase;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  // Returns a mock resolver that resolves names → numeric IDs (via body mutation)
  function makeResolverMock(idMap: Record<string, number> = {}) {
    return {
      resolve: vi
        .fn()
        .mockImplementation(
          async (
            inputField: string,
            _resolverKey: string,
            body: Record<string, unknown>,
            _context: unknown,
            warnings: string[],
          ) => {
            const raw = body[inputField];
            if (raw == null) return;
            const isArray = Array.isArray(raw);
            const names = isArray ? (raw as string[]) : [raw as string];
            const ids: number[] = [];
            for (const name of names) {
              const id = idMap[name];
              if (id !== undefined) {
                ids.push(id);
              } else {
                warnings.push(
                  `Skipped ${inputField} '${name}' — not available in the current project.`,
                );
              }
            }
            if (ids.length > 0) {
              body[inputField] = isArray ? ids : ids[0];
            }
          },
        ),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockUidResolver = {
      resolveAndReturn: vi.fn().mockResolvedValue({
        "SCRUM-TC-145": { uid: "uid-abc-123", latestVersion: 2 },
      }),
    };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID) {
          return mockUidResolver;
        }
        return makeResolverMock();
      }),
    };
    mockApiClient = { put: vi.fn().mockResolvedValue({}) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new UpdateTestCase(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Update Test Case");
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(true);
    });

    it("should have use cases", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
    });

    it("should have hints that do not mention search_test_cases for id/versionNo", () => {
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
      const hints = instance.specification.hints?.join(" ");
      expect(hints).not.toContain("Obtain 'id'");
      expect(hints).not.toContain("Obtain 'versionNo'");
    });
  });

  describe("handle", () => {
    it("should resolve key via TestCaseUidResolver and PUT to correct endpoint", async () => {
      await instance.handle({ key: "SCRUM-TC-145", summary: "New summary" });

      expect(mockUidResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-TC-145",
      ]);
      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_CASE("uid-abc-123", 2),
        expect.objectContaining({ summary: "New summary" }),
      );
    });

    it("should use latestVersion when versionNo is not provided", async () => {
      await instance.handle({ key: "SCRUM-TC-145" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_CASE("uid-abc-123", 2),
        expect.any(Object),
      );
    });

    it("should use provided versionNo instead of latestVersion", async () => {
      await instance.handle({ key: "SCRUM-TC-145", versionNo: 1 });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_CASE("uid-abc-123", 1),
        expect.any(Object),
      );
    });

    it("should return structured confirmation with key and versionNo", async () => {
      const result = await instance.handle({
        key: "SCRUM-TC-145",
        summary: "Updated",
      });

      expect(result.structuredContent).toEqual({
        key: "SCRUM-TC-145",
        versionNo: 2,
        updated: true,
      });
      expect(result.content).toEqual([]);
    });

    it("should throw ToolError when key is not found", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        ToolError,
      );

      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        "SCRUM-TC-999",
      );
    });

    it("should resolve priority name to ID", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockUidResolver;
        if (key === ResolverKeys.CommonAttribute.PRIORITY)
          return makeResolverMock({ High: 1035 });
        return makeResolverMock();
      });

      await instance.handle({ key: "SCRUM-TC-145", priority: "High" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 1035 }),
      );
    });

    it("should resolve status name to ID", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockUidResolver;
        if (key === ResolverKeys.CommonAttribute.TESTCASE_STATUS)
          return makeResolverMock({ Done: 10 });
        return makeResolverMock();
      });

      await instance.handle({ key: "SCRUM-TC-145", status: "Done" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 10 }),
      );
    });

    it("should resolve labels.add and labels.delete names to IDs", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockUidResolver;
        if (key === ResolverKeys.SearchableField.LABEL)
          return makeResolverMock({ Release_2: 100, Release_1: 99 });
        return makeResolverMock();
      });

      await instance.handle({
        key: "SCRUM-TC-145",
        labels: { add: ["Release_2"], delete: ["Release_1"] },
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ labels: { add: [100], delete: [99] } }),
      );
    });

    it("should resolve components.add and components.delete names to IDs", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockUidResolver;
        if (key === ResolverKeys.SearchableField.COMPONENTS)
          return makeResolverMock({ UI: 200, Backend: 201 });
        return makeResolverMock();
      });

      await instance.handle({
        key: "SCRUM-TC-145",
        components: { add: ["UI"], delete: ["Backend"] },
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          components: { add: [200], delete: [201] },
        }),
      );
    });

    it("should push warning and skip unresolvable priority name", async () => {
      const result = await instance.handle({
        key: "SCRUM-TC-145",
        priority: "InvalidPriority",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("InvalidPriority"),
      });
      const calledBody = mockApiClient.put.mock.calls[0][1];
      expect(calledBody).not.toHaveProperty("priority");
    });

    it("should skip labels body field when all names fail to resolve", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockUidResolver;
        return makeResolverMock({}); // all resolutions fail
      });

      const result = await instance.handle({
        key: "SCRUM-TC-145",
        labels: { add: ["NonExistent"] },
      });

      const calledBody = mockApiClient.put.mock.calls[0][1];
      expect(calledBody).not.toHaveProperty("labels");
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("NonExistent");
    });

    it("should only include provided fields in the PUT body", async () => {
      await instance.handle({ key: "SCRUM-TC-145", summary: "Only summary" });

      const calledBody = mockApiClient.put.mock.calls[0][1];
      expect(calledBody).toHaveProperty("summary", "Only summary");
      expect(calledBody).not.toHaveProperty("description");
      expect(calledBody).not.toHaveProperty("priority");
      expect(calledBody).not.toHaveProperty("labels");
    });

    it("should pass description, precondition, assignee, and estimatedTime through", async () => {
      await instance.handle({
        key: "SCRUM-TC-145",
        description: "Updated desc",
        precondition: "User logged in",
        assignee: "user-account-id",
        estimatedTime: "01:30:00",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          description: "Updated desc",
          precondition: "User logged in",
          assignee: "user-account-id",
          estimatedTime: "01:30:00",
        }),
      );
    });

    it("should throw when project context is not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ key: "SCRUM-TC-145" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors from UID resolver", async () => {
      mockUidResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("Resolver Error"),
      );

      await expect(instance.handle({ key: "SCRUM-TC-145" })).rejects.toThrow(
        "Resolver Error",
      );
    });

    it("should propagate API errors from PUT", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ key: "SCRUM-TC-145", summary: "Test" }),
      ).rejects.toThrow("API Error");
    });

    it("should throw on missing required key", async () => {
      await expect(instance.handle({ summary: "Test" })).rejects.toThrow();
    });

    it("should throw on invalid estimatedTime format", async () => {
      await expect(
        instance.handle({ key: "SCRUM-TC-145", estimatedTime: "2h30m" }),
      ).rejects.toThrow();
    });
  });
});
