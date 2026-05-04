import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommonAttributeField,
  InputField,
  SearchableField,
} from "../../../../qtm4j/config/field-resolution.types";
import { withResolution } from "../../../../qtm4j/resolver/resolution-helper";

describe("resolution-helper", () => {
  let mockClient: any;
  let mockFieldResolver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue({
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      }),
      resolve: vi.fn(),
    };

    mockClient = {
      getFieldResolver: vi.fn().mockReturnValue(mockFieldResolver),
    };
  });

  describe("withResolution", () => {
    it("should validate input against schema", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [];
      const rawArgs = { summary: "Test" };

      await withResolution(() => mockClient, schema as any, config, rawArgs);

      expect(schema.parse).toHaveBeenCalledWith(rawArgs);
    });

    it("should require project context", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [];
      const rawArgs = { summary: "Test" };

      await withResolution(() => mockClient, schema as any, config, rawArgs);

      expect(mockFieldResolver.requireProjectContext).toHaveBeenCalled();
    });

    it("should merge extra fields into body", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [];
      const rawArgs = { summary: "Test" };
      const extraFields = { projectId: "10000" };

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
        extraFields,
      );

      expect(result.body).toEqual({
        summary: "Test",
        projectId: "10000",
      });
    });

    it("should resolve single value field", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        {
          inputField: InputField.PRIORITY,
          fieldKey: CommonAttributeField.PRIORITY,
        },
      ];
      const rawArgs = { summary: "Test", priority: "High" };

      mockFieldResolver.resolve.mockResolvedValueOnce("1");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(mockFieldResolver.resolve).toHaveBeenCalledWith(
        CommonAttributeField.PRIORITY,
        "High",
      );
      expect(result.body.priority).toBe(1);
      expect(result.warnings).toEqual([]);
    });

    it("should resolve array value field", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        { inputField: InputField.LABELS, fieldKey: SearchableField.LABEL },
      ];
      const rawArgs = { summary: "Test", labels: ["Release_1", "Sprint 1"] };

      mockFieldResolver.resolve
        .mockResolvedValueOnce("100")
        .mockResolvedValueOnce("101");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(mockFieldResolver.resolve).toHaveBeenCalledWith(
        SearchableField.LABEL,
        "Release_1",
      );
      expect(mockFieldResolver.resolve).toHaveBeenCalledWith(
        SearchableField.LABEL,
        "Sprint 1",
      );
      expect(result.body.labels).toEqual([100, 101]);
      expect(result.warnings).toEqual([]);
    });

    it("should add warning when field resolution fails", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        {
          inputField: InputField.PRIORITY,
          fieldKey: CommonAttributeField.PRIORITY,
        },
      ];
      const rawArgs = { summary: "Test", priority: "NonExistent" };

      mockFieldResolver.resolve.mockResolvedValueOnce(undefined);

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.body.priority).toBe("NonExistent");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Skipped");
      expect(result.warnings[0]).toContain("priority");
      expect(result.warnings[0]).toContain("NonExistent");
    });

    it("should resolve multiple fields", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        {
          inputField: InputField.PRIORITY,
          fieldKey: CommonAttributeField.PRIORITY,
        },
        {
          inputField: InputField.STATUS,
          fieldKey: CommonAttributeField.TESTCASE_STATUS,
        },
      ];
      const rawArgs = { summary: "Test", priority: "High", status: "To Do" };

      mockFieldResolver.resolve
        .mockResolvedValueOnce("1")
        .mockResolvedValueOnce("10");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.body.priority).toBe(1);
      expect(result.body.status).toBe(10);
      expect(result.warnings).toEqual([]);
    });

    it("should handle partial resolution with some failures", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        { inputField: InputField.LABELS, fieldKey: SearchableField.LABEL },
      ];
      const rawArgs = {
        summary: "Test",
        labels: ["Release_1", "NonExistent", "Sprint 1"],
      };

      mockFieldResolver.resolve
        .mockResolvedValueOnce("100")
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce("101");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.body.labels).toEqual([100, 101]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("NonExistent");
    });

    it("should skip fields not present in input", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        {
          inputField: InputField.PRIORITY,
          fieldKey: CommonAttributeField.PRIORITY,
        },
        {
          inputField: InputField.STATUS,
          fieldKey: CommonAttributeField.TESTCASE_STATUS,
        },
      ];
      const rawArgs = { summary: "Test", priority: "High" };

      mockFieldResolver.resolve.mockResolvedValueOnce("1");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.body.priority).toBe(1);
      expect(result.body.status).toBeUndefined();
      expect(mockFieldResolver.resolve).toHaveBeenCalledTimes(1);
    });

    it("should return project context", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [];
      const rawArgs = { summary: "Test" };

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.context).toEqual({
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      });
    });

    it("should throw error when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [];
      const rawArgs = { summary: "Test" };

      await expect(
        withResolution(() => mockClient, schema as any, config, rawArgs),
      ).rejects.toThrow("No active project set");
    });

    it("should preserve body fields not in config", async () => {
      const schema = {
        parse: vi.fn((args) => args),
      };

      const config = [
        {
          inputField: InputField.PRIORITY,
          fieldKey: CommonAttributeField.PRIORITY,
        },
      ];
      const rawArgs = {
        summary: "Test",
        description: "Description",
        priority: "High",
        assignee: "user123",
      };

      mockFieldResolver.resolve.mockResolvedValueOnce("1");

      const result = await withResolution(
        () => mockClient,
        schema as any,
        config,
        rawArgs,
      );

      expect(result.body).toEqual({
        summary: "Test",
        description: "Description",
        priority: 1,
        assignee: "user123",
      });
    });
  });
});
