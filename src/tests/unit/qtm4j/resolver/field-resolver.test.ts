import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommonAttributeField,
  SearchableField,
} from "../../../../qtm4j/config/field-resolution.types";
import { CommonAttributeResolver } from "../../../../qtm4j/resolver/common-attribute-resolver";
import { ComponentResolver } from "../../../../qtm4j/resolver/component-resolver";
import { FieldResolver } from "../../../../qtm4j/resolver/index";
import { LabelResolver } from "../../../../qtm4j/resolver/label-resolver";

// Mock the resolvers
vi.mock("../../../../qtm4j/resolver/common-attribute-resolver");
vi.mock("../../../../qtm4j/resolver/label-resolver");
vi.mock("../../../../qtm4j/resolver/component-resolver");

describe("FieldResolver", () => {
  let mockApiClient: any;
  let fieldResolver: FieldResolver;
  let mockCommonAttributeResolver: any;
  let mockLabelResolver: any;
  let mockComponentResolver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      get: vi.fn(),
    };

    // Mock resolver instances
    mockCommonAttributeResolver = {
      fieldKeys: Object.values(CommonAttributeField),
      resolve: vi.fn(),
      preload: vi.fn(),
      clearCache: vi.fn(),
    };

    mockLabelResolver = {
      fieldKeys: [SearchableField.LABEL],
      resolve: vi.fn(),
      preload: vi.fn(),
      clearCache: vi.fn(),
    };

    mockComponentResolver = {
      fieldKeys: [SearchableField.COMPONENTS],
      resolve: vi.fn(),
      preload: vi.fn(),
      clearCache: vi.fn(),
    };

    // Mock constructor implementations
    vi.mocked(CommonAttributeResolver).mockImplementation(
      () => mockCommonAttributeResolver,
    );
    vi.mocked(LabelResolver).mockImplementation(() => mockLabelResolver);
    vi.mocked(ComponentResolver).mockImplementation(
      () => mockComponentResolver,
    );

    fieldResolver = new FieldResolver(mockApiClient);
  });

  describe("constructor", () => {
    it("should create resolver instances with correct dependencies", () => {
      expect(CommonAttributeResolver).toHaveBeenCalledWith(mockApiClient);
      expect(LabelResolver).toHaveBeenCalledWith(mockApiClient);
      expect(ComponentResolver).toHaveBeenCalledWith(mockApiClient);
    });

    it("should expose commonAttributes resolver", () => {
      expect(fieldResolver.commonAttributes).toBe(mockCommonAttributeResolver);
    });
  });

  describe("setProjectContext", () => {
    it("should store project context", () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };

      fieldResolver.setProjectContext(context);

      // Verify by requiring context - should not throw
      expect(() => fieldResolver.requireProjectContext()).not.toThrow();
    });

    it("should allow updating project context", () => {
      const context1 = {
        projectKey: "PROJ1",
        projectId: 10000,
        projectName: "Project 1",
      };
      const context2 = {
        projectKey: "PROJ2",
        projectId: 20000,
        projectName: "Project 2",
      };

      fieldResolver.setProjectContext(context1);
      fieldResolver.setProjectContext(context2);

      const result = fieldResolver.requireProjectContext();
      expect(result).toEqual(context2);
    });
  });

  describe("requireProjectContext", () => {
    it("should throw error when context is not set", () => {
      expect(() => fieldResolver.requireProjectContext()).toThrow(
        "No active project set. Please call set_project_context before performing this operation.",
      );
    });

    it("should return context when set", () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };

      fieldResolver.setProjectContext(context);
      const result = fieldResolver.requireProjectContext();

      expect(result).toEqual(context);
    });
  });

  describe("resolve", () => {
    it("should throw error when no project context is set", async () => {
      await expect(
        fieldResolver.resolve(CommonAttributeField.PRIORITY, "High"),
      ).rejects.toThrow(
        "No active project set. Please call set_project_context before performing this operation.",
      );
    });

    it("should delegate to correct resolver for priority field", async () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      fieldResolver.setProjectContext(context);

      mockCommonAttributeResolver.resolve.mockResolvedValueOnce("1");

      const result = await fieldResolver.resolve(
        CommonAttributeField.PRIORITY,
        "High",
      );

      expect(result).toBe("1");
      expect(mockCommonAttributeResolver.resolve).toHaveBeenCalledWith(
        "PROJ",
        10000,
        CommonAttributeField.PRIORITY,
        "High",
      );
    });

    it("should delegate to correct resolver for label field", async () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      fieldResolver.setProjectContext(context);

      mockLabelResolver.resolve.mockResolvedValueOnce("100");

      const result = await fieldResolver.resolve(
        SearchableField.LABEL,
        "Release_1",
      );

      expect(result).toBe("100");
      expect(mockLabelResolver.resolve).toHaveBeenCalledWith(
        "PROJ",
        10000,
        SearchableField.LABEL,
        "Release_1",
      );
    });

    it("should delegate to correct resolver for components field", async () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      fieldResolver.setProjectContext(context);

      mockComponentResolver.resolve.mockResolvedValueOnce("200");

      const result = await fieldResolver.resolve(
        SearchableField.COMPONENTS,
        "UI",
      );

      expect(result).toBe("200");
      expect(mockComponentResolver.resolve).toHaveBeenCalledWith(
        "PROJ",
        10000,
        SearchableField.COMPONENTS,
        "UI",
      );
    });

    it("should return undefined when resolver returns undefined", async () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      fieldResolver.setProjectContext(context);

      mockCommonAttributeResolver.resolve.mockResolvedValueOnce(undefined);

      const result = await fieldResolver.resolve(
        CommonAttributeField.PRIORITY,
        "NonExistent",
      );

      expect(result).toBeUndefined();
    });

    it("should return undefined for unregistered field key", async () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      fieldResolver.setProjectContext(context);

      const result = await fieldResolver.resolve("unregistered_field", "value");

      expect(result).toBeUndefined();
    });
  });

  describe("clearCache", () => {
    it("should clear cache for all resolvers", () => {
      fieldResolver.clearCache();

      expect(mockCommonAttributeResolver.clearCache).toHaveBeenCalledWith();
      expect(mockLabelResolver.clearCache).toHaveBeenCalledWith();
      expect(mockComponentResolver.clearCache).toHaveBeenCalledWith();
    });

    it("should be callable multiple times", () => {
      fieldResolver.clearCache();
      fieldResolver.clearCache();

      expect(mockCommonAttributeResolver.clearCache).toHaveBeenCalledTimes(2);
      expect(mockLabelResolver.clearCache).toHaveBeenCalledTimes(2);
      expect(mockComponentResolver.clearCache).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearProjectCache", () => {
    it("should clear cache for specific project across all resolvers", () => {
      fieldResolver.clearProjectCache("PROJ");

      expect(mockCommonAttributeResolver.clearCache).toHaveBeenCalledWith(
        "PROJ",
      );
      expect(mockLabelResolver.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockComponentResolver.clearCache).toHaveBeenCalledWith("PROJ");
    });

    it("should work with different project keys", () => {
      fieldResolver.clearProjectCache("PROJ1");
      fieldResolver.clearProjectCache("PROJ2");

      expect(mockCommonAttributeResolver.clearCache).toHaveBeenCalledWith(
        "PROJ1",
      );
      expect(mockCommonAttributeResolver.clearCache).toHaveBeenCalledWith(
        "PROJ2",
      );
    });
  });
});
