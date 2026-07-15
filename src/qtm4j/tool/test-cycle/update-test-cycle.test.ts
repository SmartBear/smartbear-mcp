// biome-ignore-all lint/security/noSecrets: this file contains many high-entropy API action-name / wire-format / fixture string constants that trip the noSecrets entropy heuristic; none are real secrets
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import {
  UpdateTestCycleBody,
  UpdateTestCycleResponse,
} from "../../schema/update-test-cycle.schema.ts";
import { UpdateTestCycle } from "./update-test-cycle.ts";

interface MockApiClient {
  put: Mock;
}

interface MockRegistry {
  requireProjectContext: Mock;
  getResolver: Mock;
}

interface MockClient {
  getApiClient: Mock;
  getResolverRegistry: Mock;
}

describe("UpdateTestCycle", () => {
  let mockClient: MockClient;
  let mockApiClient: MockApiClient;
  let mockRegistry: MockRegistry;
  let instance: UpdateTestCycle;

  const mockContext = {
    projectKey: "PROJ",
    projectId: 10_066,
    projectName: "Test Project",
  };

  /** Builds a resolver mock that maps name strings → numeric IDs via body mutation. */
  function makeResolverMock(idMap: Record<string, number> = {}) {
    return {
      resolve: vi.fn().mockImplementation(
        // biome-ignore lint/complexity/useMaxParams: mirrors the real Resolver.resolve() signature shared across all resolvers/callers
        (
          inputField: string,
          _resolverKey: string,
          body: Record<string, unknown>,
          _context: unknown,
          warnings: string[],
        ) => {
          const raw = body[inputField];
          if (raw === null || raw === undefined) {
            return; // null/undefined passes through untouched
          }
          const isArray = Array.isArray(raw);
          const names = isArray ? (raw as string[]) : [raw as string];
          const ids: number[] = [];
          for (const name of names) {
            const id = idMap[name];
            if (id === undefined) {
              warnings.push(
                `Skipped ${inputField} '${name}' — not available in the current project.`,
              );
            } else {
              ids.push(id);
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

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockReturnValue(makeResolverMock()),
    };
    mockApiClient = { put: vi.fn().mockResolvedValue({}) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new UpdateTestCycle(mockClient as unknown as Qtm4jClient);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Update Test Cycle");
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(true);
    });

    it("should have use cases", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
    });

    it("should have hints", () => {
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // handle — validation
  // ---------------------------------------------------------------------------

  describe("handle — validation", () => {
    it("should throw when key is missing", async () => {
      await expect(instance.handle({ summary: "New name" })).rejects.toThrow();
    });

    it("should throw when project context is not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(
        instance.handle({ key: "PROJ-TR-26", summary: "New name" }),
      ).rejects.toThrow("No active project set");
    });

    it("should throw on invalid plannedStartDate format", async () => {
      await expect(
        instance.handle({ key: "PROJ-TR-26", plannedStartDate: "2026-05-15" }),
      ).rejects.toThrow();
    });

    it("should throw on invalid plannedEndDate format", async () => {
      await expect(
        instance.handle({
          key: "PROJ-TR-26",
          plannedEndDate: "15-May-2026 09:00",
        }),
      ).rejects.toThrow();
    });

    it("should throw on blank summary", async () => {
      await expect(
        instance.handle({ key: "PROJ-TR-26", summary: "" }),
      ).rejects.toThrow();
    });

    it("should throw on summary exceeding 255 characters", async () => {
      await expect(
        instance.handle({ key: "PROJ-TR-26", summary: "a".repeat(256) }),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // handle — at-least-one field acceptance
  // ---------------------------------------------------------------------------

  describe("handle — at-least-one field acceptance", () => {
    const fieldsToTest = [
      { label: "summary", args: { summary: "New name" } },
      { label: "description (string)", args: { description: "Updated desc" } },
      { label: "description (null)", args: { description: null } },
      { label: "status", args: { status: "In Progress" } },
      { label: "status (null)", args: { status: null } },
      { label: "priority", args: { priority: "High" } },
      { label: "priority (null)", args: { priority: null } },
      {
        label: "plannedStartDate",
        args: { plannedStartDate: "15/May/2026 09:00" },
      },
      { label: "plannedStartDate (null)", args: { plannedStartDate: null } },
      {
        label: "plannedEndDate",
        args: { plannedEndDate: "30/May/2026 18:00" },
      },
      { label: "plannedEndDate (null)", args: { plannedEndDate: null } },
      { label: "assignee", args: { assignee: "user-abc" } },
      { label: "assignee (null)", args: { assignee: null } },
      { label: "reporter", args: { reporter: "user-abc" } },
      { label: "reporter (null)", args: { reporter: null } },
      { label: "labels", args: { labels: { add: ["Regression"] } } },
      { label: "components", args: { components: { delete: ["UI"] } } },
    ] as const;

    for (const { label, args } of fieldsToTest) {
      it(`should accept update with only '${label}' field`, async () => {
        await expect(
          instance.handle({ key: "PROJ-TR-26", ...args }),
        ).resolves.toBeDefined();
      });
    }
  });

  // ---------------------------------------------------------------------------
  // handle — endpoint
  // ---------------------------------------------------------------------------

  describe("handle — endpoint", () => {
    it("should PUT to the correct endpoint using the key directly", async () => {
      await instance.handle({ key: "PROJ-TR-26", summary: "Updated" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_CYCLE("PROJ-TR-26"),
        expect.any(Object),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handle — field resolution
  // ---------------------------------------------------------------------------

  describe("handle — field resolution", () => {
    it("should resolve status name to numeric ID", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.CommonAttribute.TEST_CYCLE_STATUS) {
          return makeResolverMock({ "In Progress": 44_893 });
        }
        return makeResolverMock();
      });

      await instance.handle({ key: "PROJ-TR-26", status: "In Progress" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 44_893 }),
      );
    });

    it("should resolve priority name to numeric ID", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.CommonAttribute.PRIORITY) {
          return makeResolverMock({ High: 25_510 });
        }
        return makeResolverMock();
      });

      await instance.handle({ key: "PROJ-TR-26", priority: "High" });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 25_510 }),
      );
    });

    it("should resolve labels.add and labels.delete names to IDs", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.LABEL) {
          return makeResolverMock({ Regression: 1001, Sprint1: 1003 });
        }
        return makeResolverMock();
      });

      await instance.handle({
        key: "PROJ-TR-26",
        labels: { add: ["Regression"], delete: ["Sprint1"] },
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ labels: { add: [1001], delete: [1003] } }),
      );
    });

    it("should resolve components.add and components.delete names to IDs", async () => {
      mockRegistry.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.COMPONENTS) {
          return makeResolverMock({ Backend: 2001, Frontend: 2002 });
        }
        return makeResolverMock();
      });

      await instance.handle({
        key: "PROJ-TR-26",
        components: { add: ["Backend"], delete: ["Frontend"] },
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          components: { add: [2001], delete: [2002] },
        }),
      );
    });

    it("should pass null status through to the body (clears the field)", async () => {
      await instance.handle({ key: "PROJ-TR-26", status: null });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).toHaveProperty("status", null);
    });

    it("should pass null priority through to the body (clears the field)", async () => {
      await instance.handle({ key: "PROJ-TR-26", priority: null });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).toHaveProperty("priority", null);
    });

    it("should pass null assignee through to the body (unassigns owner)", async () => {
      await instance.handle({ key: "PROJ-TR-26", assignee: null });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ assignee: null }),
      );
    });

    it("should send reporter Jira account ID in the body", async () => {
      await instance.handle({
        key: "PROJ-TR-26",
        reporter: "5b10a2844c20165700ede21f",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ reporter: "5b10a2844c20165700ede21f" }),
      );
    });

    it("should pass null reporter through to the body (clears reporter)", async () => {
      await instance.handle({ key: "PROJ-TR-26", reporter: null });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ reporter: null }),
      );
    });

    it("should pass null plannedStartDate through to the body (clears the date)", async () => {
      await instance.handle({ key: "PROJ-TR-26", plannedStartDate: null });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ plannedStartDate: null }),
      );
    });

    it("should warn when status name cannot be resolved", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        status: "InvalidStatus",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("InvalidStatus"),
      });
    });

    it("should warn when priority name cannot be resolved", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        priority: "InvalidPriority",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("InvalidPriority");
    });

    it("should skip labels body field when all names fail to resolve and warn", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        labels: { add: ["NonExistent"] },
      });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).not.toHaveProperty("labels");
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("NonExistent");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — body construction
  // ---------------------------------------------------------------------------

  describe("handle — body construction", () => {
    it("should only include provided fields in the PUT body", async () => {
      await instance.handle({ key: "PROJ-TR-26", summary: "Only summary" });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).toHaveProperty("summary", "Only summary");
      expect(calledBody).not.toHaveProperty("description");
      expect(calledBody).not.toHaveProperty("priority");
      expect(calledBody).not.toHaveProperty("status");
      expect(calledBody).not.toHaveProperty("assignee");
      expect(calledBody).not.toHaveProperty("labels");
      expect(calledBody).not.toHaveProperty("components");
    });

    it("should pass through summary, description, assignee, and date fields unchanged", async () => {
      await instance.handle({
        key: "PROJ-TR-26",
        summary: "Regression Sprint 12",
        description: "Updated description",
        assignee: "5b10a2844c20165700ede21f",
        plannedStartDate: "15/May/2026 09:00",
        plannedEndDate: "30/May/2026 18:00",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          summary: "Regression Sprint 12",
          description: "Updated description",
          assignee: "5b10a2844c20165700ede21f",
          plannedStartDate: "15/May/2026 09:00",
          plannedEndDate: "30/May/2026 18:00",
        }),
      );
    });

    it("should NOT include key in the PUT body", async () => {
      await instance.handle({ key: "PROJ-TR-26", summary: "Updated" });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).not.toHaveProperty("key");
    });

    it("should pass null description through to the body (clears description text)", async () => {
      await instance.handle({ key: "PROJ-TR-26", description: null });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).toHaveProperty("description", null);
    });

    it("should pass a description string through to the body unchanged", async () => {
      await instance.handle({
        key: "PROJ-TR-26",
        description: "Updated description",
      });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).toHaveProperty("description", "Updated description");
    });

    it("should not include description in the body when omitted", async () => {
      await instance.handle({ key: "PROJ-TR-26", summary: "Only summary" });

      const [, calledBody] = mockApiClient.put.mock.calls[0];
      expect(calledBody).not.toHaveProperty("description");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — response
  // ---------------------------------------------------------------------------

  describe("handle — response", () => {
    it("should return structured confirmation with key and updated: true", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        summary: "Updated",
      });

      expect(result.structuredContent).toEqual({
        key: "PROJ-TR-26",
        updated: true,
      });
    });

    it("should return empty content array when no warnings", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        summary: "Updated",
      });

      expect(result.content).toEqual([]);
    });

    it("should return warnings in content when field resolution fails", async () => {
      const result = await instance.handle({
        key: "PROJ-TR-26",
        status: "UnknownStatus",
        summary: "Updated",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("UnknownStatus"),
      });
    });

    it("should propagate API errors from PUT", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ key: "PROJ-TR-26", summary: "Updated" }),
      ).rejects.toThrow("API Error");
    });
  });
});

// ---------------------------------------------------------------------------
// UpdateTestCycleBody schema
// ---------------------------------------------------------------------------

describe("UpdateTestCycleBody", () => {
  describe("key", () => {
    it("should accept a valid key", () => {
      const result = UpdateTestCycleBody.safeParse({ key: "SCRUM-TR-101" });
      expect(result.success).toBe(true);
    });

    it("should reject when key is missing", () => {
      const result = UpdateTestCycleBody.safeParse({ summary: "Title" });
      expect(result.success).toBe(false);
    });

    it("should reject when key is not a string", () => {
      const result = UpdateTestCycleBody.safeParse({ key: 42 });
      expect(result.success).toBe(false);
    });
  });

  describe("summary", () => {
    it("should accept a valid summary", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        summary: "Valid Title",
      });
      expect(result.success).toBe(true);
    });

    it("should accept summary at max length (255 chars)", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        summary: "a".repeat(255),
      });
      expect(result.success).toBe(true);
    });

    it("should reject blank summary", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        summary: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject summary exceeding 255 characters", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        summary: "a".repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it("should be optional (omitting summary is valid)", () => {
      const result = UpdateTestCycleBody.safeParse({ key: "SCRUM-TR-1" });
      expect(result.success).toBe(true);
    });
  });

  describe("description", () => {
    it("should accept a string description", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        description: "Some description",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null to clear the field", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        description: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it("should be optional", () => {
      const result = UpdateTestCycleBody.safeParse({ key: "SCRUM-TR-1" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });
  });

  describe("status and priority", () => {
    it("should accept a status string", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        status: "In Progress",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null status to clear the field", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        status: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeNull();
      }
    });

    it("should accept a priority string", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        priority: "High",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null priority to clear the field", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        priority: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBeNull();
      }
    });
  });

  describe("plannedStartDate and plannedEndDate", () => {
    const ValidDate = "15/May/2026 09:00";

    it("should accept a valid date string", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        plannedStartDate: ValidDate,
      });
      expect(result.success).toBe(true);
    });

    it("should accept null to clear a date", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        plannedStartDate: null,
        plannedEndDate: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plannedStartDate).toBeNull();
        expect(result.data.plannedEndDate).toBeNull();
      }
    });

    it("should reject ISO 8601 format (2026-05-15)", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        plannedStartDate: "2026-05-15",
      });
      expect(result.success).toBe(false);
    });

    it("should reject date with time only, no day/month/year", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        plannedEndDate: "15-May-2026 09:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject date without time component", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        plannedStartDate: "15/May/2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("assignee", () => {
    it("should accept an assignee account ID", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        assignee: "5b10a2844c20165700ede21f",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null to unassign", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        assignee: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignee).toBeNull();
      }
    });
  });

  describe("labels", () => {
    it("should accept labels with only add", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        labels: { add: ["Regression"] },
      });
      expect(result.success).toBe(true);
    });

    it("should accept labels with only delete", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        labels: { delete: ["Sprint1"] },
      });
      expect(result.success).toBe(true);
    });

    it("should accept labels with both add and delete", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        labels: { add: ["Regression", "Smoke"], delete: ["Sprint1"] },
      });
      expect(result.success).toBe(true);
    });

    it("should accept an empty labels object", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        labels: {},
      });
      expect(result.success).toBe(true);
    });

    it("should reject labels where add is not a string array", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        labels: { add: [1, 2, 3] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("components", () => {
    it("should accept components with add and delete", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-1",
        components: { add: ["Backend"], delete: ["Frontend"] },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("full payload", () => {
    it("should accept all fields at once", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-101",
        summary: "Final Regression Cycle",
        description: "Updated for sprint 12.",
        status: "In Progress",
        priority: "High",
        plannedStartDate: "15/May/2026 09:00",
        plannedEndDate: "30/May/2026 18:00",
        assignee: "5b10a2844c20165700ede21f",
        labels: { add: ["Regression"], delete: ["Sprint1"] },
        components: { add: ["Backend"], delete: ["Frontend"] },
      });
      expect(result.success).toBe(true);
    });

    it("should include key in the parsed output (used to build the URL)", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-101",
        summary: "Title",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe("SCRUM-TR-101");
      }
    });

    it("should strip unknown fields", () => {
      const result = UpdateTestCycleBody.safeParse({
        key: "SCRUM-TR-101",
        summary: "Title",
        unknownField: "should be stripped",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.data as Record<string, unknown>).unknownField,
        ).toBeUndefined();
      }
    });
  });
});

// ---------------------------------------------------------------------------
// UpdateTestCycleResponse schema
// ---------------------------------------------------------------------------

describe("UpdateTestCycleResponse", () => {
  it("should accept a valid response with updated: true", () => {
    const result = UpdateTestCycleResponse.safeParse({
      key: "SCRUM-TR-101",
      updated: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe("SCRUM-TR-101");
      expect(result.data.updated).toBe(true);
    }
  });

  it("should reject when updated is false", () => {
    const result = UpdateTestCycleResponse.safeParse({
      key: "SCRUM-TR-101",
      updated: false,
    });
    expect(result.success).toBe(false);
  });

  it("should reject when updated is missing", () => {
    const result = UpdateTestCycleResponse.safeParse({ key: "SCRUM-TR-101" });
    expect(result.success).toBe(false);
  });

  it("should reject when key is missing", () => {
    const result = UpdateTestCycleResponse.safeParse({ updated: true });
    expect(result.success).toBe(false);
  });
});
