import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResolverKeys } from "../../../../qtm4j/config/field-resolution.types";
import { ResolverRegistry } from "../../../../qtm4j/resolver/resolver-registry";
import { CommonAttributeResolver } from "../../../../qtm4j/resolver/resolvers/common-attribute-resolver";
import { ComponentResolver } from "../../../../qtm4j/resolver/resolvers/component-resolver";
import { LabelResolver } from "../../../../qtm4j/resolver/resolvers/label-resolver";
import { RequirementIdResolver } from "../../../../qtm4j/resolver/resolvers/requirement-id-resolver";
import { TestCaseUidResolver } from "../../../../qtm4j/resolver/resolvers/test-case-uid-resolver";
import { TestCycleUidResolver } from "../../../../qtm4j/resolver/resolvers/test-cycle-uid-resolver";

vi.mock("../../../../qtm4j/resolver/resolvers/common-attribute-resolver");
vi.mock("../../../../qtm4j/resolver/resolvers/label-resolver");
vi.mock("../../../../qtm4j/resolver/resolvers/component-resolver");
vi.mock("../../../../qtm4j/resolver/resolvers/test-case-uid-resolver");
vi.mock("../../../../qtm4j/resolver/resolvers/requirement-id-resolver");
vi.mock("../../../../qtm4j/resolver/resolvers/test-cycle-uid-resolver");

describe("ResolverRegistry", () => {
  let mockApiClient: any;
  let registry: ResolverRegistry;
  let mockCommonAttributes: any;
  let mockLabelResolver: any;
  let mockComponentResolver: any;
  let mockTestCaseUidResolver: any;
  let mockRequirementIdResolver: any;
  let mockTestCycleUidResolver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = { get: vi.fn() };

    mockCommonAttributes = {
      fieldKeys: Object.values(ResolverKeys.CommonAttribute),
      resolve: vi.fn(),
      preload: vi.fn(),
      clearCache: vi.fn(),
    };
    mockLabelResolver = {
      fieldKeys: [ResolverKeys.SearchableField.LABEL],
      resolve: vi.fn(),
      clearCache: vi.fn(),
    };
    mockComponentResolver = {
      fieldKeys: [ResolverKeys.SearchableField.COMPONENTS],
      resolve: vi.fn(),
      clearCache: vi.fn(),
    };
    mockTestCaseUidResolver = {
      fieldKeys: [ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID],
      resolveAndReturn: vi.fn(),
      clearCache: vi.fn(),
    };
    mockRequirementIdResolver = {
      fieldKeys: [ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID],
      resolveAndReturn: vi.fn(),
      clearCache: vi.fn(),
    };
    mockTestCycleUidResolver = {
      fieldKeys: [ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID],
      resolveAndReturn: vi.fn(),
      clearCache: vi.fn(),
    };

    vi.mocked(CommonAttributeResolver).mockImplementation(
      () => mockCommonAttributes,
    );
    vi.mocked(LabelResolver).mockImplementation(() => mockLabelResolver);
    vi.mocked(ComponentResolver).mockImplementation(
      () => mockComponentResolver,
    );
    vi.mocked(TestCaseUidResolver).mockImplementation(
      () => mockTestCaseUidResolver,
    );
    vi.mocked(RequirementIdResolver).mockImplementation(
      () => mockRequirementIdResolver,
    );
    vi.mocked(TestCycleUidResolver).mockImplementation(
      () => mockTestCycleUidResolver,
    );

    registry = new ResolverRegistry(mockApiClient);
  });

  describe("constructor", () => {
    it("should create all resolver instances", () => {
      expect(CommonAttributeResolver).toHaveBeenCalledWith(mockApiClient);
      expect(LabelResolver).toHaveBeenCalledWith(mockApiClient);
      expect(ComponentResolver).toHaveBeenCalledWith(mockApiClient);
      expect(TestCaseUidResolver).toHaveBeenCalledWith(mockApiClient);
      expect(RequirementIdResolver).toHaveBeenCalledWith(mockApiClient);
      expect(TestCycleUidResolver).toHaveBeenCalledWith(mockApiClient);
    });
  });

  describe("setProjectContext", () => {
    it("should store project context", () => {
      registry.setProjectContext({
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      });
      expect(() => registry.requireProjectContext()).not.toThrow();
    });

    it("should allow updating project context", () => {
      registry.setProjectContext({
        projectKey: "PROJ1",
        projectId: 10000,
        projectName: "Project 1",
      });
      registry.setProjectContext({
        projectKey: "PROJ2",
        projectId: 20000,
        projectName: "Project 2",
      });
      expect(registry.requireProjectContext()).toEqual({
        projectKey: "PROJ2",
        projectId: 20000,
        projectName: "Project 2",
      });
    });
  });

  describe("requireProjectContext", () => {
    it("should throw when context is not set", () => {
      expect(() => registry.requireProjectContext()).toThrow(
        "No active project set. Please call set_project_context before performing this operation.",
      );
    });

    it("should return context when set", () => {
      const context = {
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      };
      registry.setProjectContext(context);
      expect(registry.requireProjectContext()).toEqual(context);
    });
  });

  describe("getCommonAttributeResolver", () => {
    it("should return the CommonAttributeResolver instance", () => {
      expect(registry.getCommonAttributeResolver()).toBe(mockCommonAttributes);
    });
  });

  describe("getResolver", () => {
    it("should return the correct resolver for a known key", () => {
      expect(registry.getResolver(ResolverKeys.CommonAttribute.PRIORITY)).toBe(
        mockCommonAttributes,
      );
      expect(registry.getResolver(ResolverKeys.SearchableField.LABEL)).toBe(
        mockLabelResolver,
      );
      expect(
        registry.getResolver(ResolverKeys.SearchableField.COMPONENTS),
      ).toBe(mockComponentResolver);
      expect(
        registry.getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID),
      ).toBe(mockTestCaseUidResolver);
      expect(
        registry.getResolver(
          ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID,
        ),
      ).toBe(mockRequirementIdResolver);
      expect(
        registry.getResolver(
          ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID,
        ),
      ).toBe(mockTestCycleUidResolver);
    });

    it("should throw for an unknown resolver key", () => {
      expect(() => registry.getResolver("unknown_key")).toThrow(
        "No resolver registered for key 'unknown_key'",
      );
    });
  });

  describe("clearCache", () => {
    it("should clear cache for all resolvers", () => {
      registry.clearCache();
      expect(mockCommonAttributes.clearCache).toHaveBeenCalledWith();
      expect(mockLabelResolver.clearCache).toHaveBeenCalledWith();
      expect(mockComponentResolver.clearCache).toHaveBeenCalledWith();
      expect(mockTestCaseUidResolver.clearCache).toHaveBeenCalledWith();
      expect(mockRequirementIdResolver.clearCache).toHaveBeenCalledWith();
      expect(mockTestCycleUidResolver.clearCache).toHaveBeenCalledWith();
    });

    it("should be callable multiple times", () => {
      registry.clearCache();
      registry.clearCache();
      expect(mockCommonAttributes.clearCache).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearProjectCache", () => {
    it("should clear cache for specific project across all resolvers", () => {
      registry.clearProjectCache("PROJ");
      expect(mockCommonAttributes.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockLabelResolver.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockComponentResolver.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockTestCaseUidResolver.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockRequirementIdResolver.clearCache).toHaveBeenCalledWith("PROJ");
      expect(mockTestCycleUidResolver.clearCache).toHaveBeenCalledWith("PROJ");
    });

    it("should work with different project keys", () => {
      registry.clearProjectCache("PROJ1");
      registry.clearProjectCache("PROJ2");
      expect(mockCommonAttributes.clearCache).toHaveBeenCalledWith("PROJ1");
      expect(mockCommonAttributes.clearCache).toHaveBeenCalledWith("PROJ2");
    });
  });
});
