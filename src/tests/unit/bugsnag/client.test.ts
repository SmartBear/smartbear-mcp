import { get } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ErrorApiView,
  EventApiView,
  EventField,
  PerformanceFilter,
  PivotApiView,
  ProjectApiView,
  ReleaseApiView,
  Span,
  SpanGroup,
} from "../../../bugsnag/client/api/api.js";
import type { BaseAPI } from "../../../bugsnag/client/api/base.js";
import type {
  Build,
  CurrentUserAPI,
  ErrorAPI,
  Organization,
} from "../../../bugsnag/client/api/index.js";
import type { ProjectAPI } from "../../../bugsnag/client/api/Project.js";
import { BugsnagClient } from "../../../bugsnag/client.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info.js";
import { ToolError } from "../../../common/types.js";

// Mock the dependencies
const mockCurrentUserAPI = {
  listUserOrganizations: vi.fn(),
  getOrganizationProjects: vi.fn(),
} satisfies Omit<CurrentUserAPI, keyof BaseAPI>;

const mockErrorAPI = {
  viewErrorOnProject: vi.fn(),
  listEventsOnProject: vi.fn(),
  viewEventById: vi.fn(),
  listProjectErrors: vi.fn(),
  updateErrorOnProject: vi.fn(),
  getPivotValuesOnAnError: vi.fn(),
} satisfies Omit<ErrorAPI, keyof BaseAPI>;

const mockProjectAPI = {
  listProjectEventFields: vi.fn(),
  getProjectReleaseById: vi.fn(),
  listProjectReleaseGroups: vi.fn(),
  getReleaseGroup: vi.fn(),
  listBuildsInRelease: vi.fn(),
  getProjectNetworkGroupingRuleset: vi.fn(),
  getProjectSpanGroup: vi.fn(),
  getProjectSpanGroupDistribution: vi.fn(),
  getProjectSpanGroupTimeline: vi.fn(),
  listProjectSpanGroups: vi.fn(),
  listProjectTraceFields: vi.fn(),
  listSpansBySpanGroupId: vi.fn(),
  listSpansByTraceId: vi.fn(),
} satisfies Omit<ProjectAPI, keyof BaseAPI>;

const mockCache = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

vi.mock("../../../bugsnag/client/api/index.js", () => ({
  ...vi.importActual("../../../bugsnag/client/api/index.js"),
  CurrentUserAPI: vi.fn().mockImplementation(() => mockCurrentUserAPI),
  ErrorAPI: vi.fn().mockImplementation(() => mockErrorAPI),
  ProjectAPI: vi.fn().mockImplementation(() => mockProjectAPI),
  Configuration: vi.fn().mockImplementation((config) => config),
  ErrorUpdateRequest: {
    OperationEnum: {
      Fix: "fix",
      Ignore: "ignore",
      OverrideSeverity: "override_severity",
      Open: "open",
      Discard: "discard",
      Undiscard: "undiscard",
    },
  },
}));

vi.mock("node-cache", () => ({
  default: vi.fn().mockImplementation(() => mockCache),
}));

vi.mock("../../../common/bugsnag.js", () => ({
  default: {
    notify: vi.fn(),
  },
}));

// Mock console methods to prevent noisy test output and allow verification
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  info: console.info,
  debug: console.debug,
};

// Helper to create and configure a client
async function createConfiguredClient(
  authToken = "test-token",
  projectApiKey?: string,
  endpoint?: string,
): Promise<BugsnagClient> {
  const client = new BugsnagClient();
  const mockServer = { getCache: () => mockCache } as any;
  if (projectApiKey) {
    // Allow configure to find a project to ensure the projectApiKey remains set for the test
    const project = { id: "proj-1", name: "Project 1", apiKey: projectApiKey };
    mockCache.get
      .mockReturnValueOnce([project])
      .mockReturnValueOnce(project)
      .mockReturnValueOnce({ "proj-1": [] });
  }
  await client.configure(mockServer, {
    auth_token: authToken,
    project_api_key: projectApiKey,
    endpoint,
  });
  mockCache.get.mockClear();
  return client;
}

function getMockProject(
  id: string,
  name: string,
  apiKey?: string,
  slug?: string,
): ProjectApiView {
  return { id, name, apiKey, slug };
}

function getMockOrganization(
  id: string,
  name: string,
  slug?: string,
): Organization {
  return {
    id,
    name,
    slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
    updatedAt: new Date(),
    createdAt: new Date(),
    autoUpgrade: false,
    managedByPlatformServices: false,
  };
}

describe("BugsnagClient", () => {
  let client: BugsnagClient;
  let clientWithNoApiKey: BugsnagClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations to ensure no persistent return values affect tests
    mockCache.get.mockReset();
    mockCache.set.mockReset();
    mockCache.del.mockReset();

    // Mock console methods
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.log = mockConsole.log;
    console.info = mockConsole.info;
    console.debug = mockConsole.debug;

    // Reset console mocks
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.log.mockClear();
    mockConsole.info.mockClear();
    mockConsole.debug.mockClear();
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  });

  describe("constructor", () => {
    it("should create client instance with proper dependencies", async () => {
      const client = new BugsnagClient();
      expect(client).toBeInstanceOf(BugsnagClient);
    });

    it("should configure endpoints correctly during construction", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/api/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);

      await createConfiguredClient("test-token", "00000hub-key");

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: "https://api.bugsnag.smartbear.com",
          apiKey: "token test-token",
          headers: expect.objectContaining({
            "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
            "Content-Type": "application/json",
            "X-Bugsnag-API": "true",
            "X-Version": "2",
          }),
        }),
      );
    });

    it("should set project API key when provided", async () => {
      const client = await createConfiguredClient(
        "test-token",
        "test-project-key",
      );
      expect(client).toBeInstanceOf(BugsnagClient);
    });
  });

  describe("getEndpoint method", () => {
    const client = new BugsnagClient();
    describe("without custom endpoint", () => {
      describe("with Hub API key (00000 prefix)", () => {
        it("should return Hub domain for api subdomain", async () => {
          const result = client.getEndpoint("api", "00000hub-key");
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should return Hub domain for app subdomain", async () => {
          const result = client.getEndpoint("app", "00000test-key");
          expect(result).toBe("https://app.bugsnag.smartbear.com");
        });

        it("should return Hub domain for custom subdomain", async () => {
          const result = client.getEndpoint("custom", "00000key");
          expect(result).toBe("https://custom.bugsnag.smartbear.com");
        });

        it("should handle empty string after prefix", async () => {
          const result = client.getEndpoint("api", "00000");
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });
      });

      describe("with regular API key (non-Hub)", () => {
        it("should return Bugsnag domain for api subdomain", async () => {
          const result = client.getEndpoint("api", "regular-key");
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain for app subdomain", async () => {
          const result = client.getEndpoint("app", "abc123def");
          expect(result).toBe("https://app.bugsnag.com");
        });

        it("should return Bugsnag domain for custom subdomain", async () => {
          const result = client.getEndpoint("custom", "test-key-123");
          expect(result).toBe("https://custom.bugsnag.com");
        });

        it("should handle API key with 00000 in middle", async () => {
          const result = client.getEndpoint("api", "key-00000-middle");
          expect(result).toBe("https://api.bugsnag.com");
        });
      });

      describe("without API key", () => {
        it("should return Bugsnag domain when API key is undefined", async () => {
          const result = client.getEndpoint("api", undefined);
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain when API key is empty string", async () => {
          const result = client.getEndpoint("api", "");
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain when API key is null", async () => {
          const result = client.getEndpoint("api", null as any);
          expect(result).toBe("https://api.bugsnag.com");
        });
      });
    });

    describe("with custom endpoint", () => {
      describe("Hub domain endpoints (always normalized)", () => {
        it("should normalize to HTTPS subdomain for exact hub domain match", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://api.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize to HTTPS subdomain regardless of input protocol", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "http://app.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize to HTTPS subdomain regardless of input subdomain", async () => {
          const result = client.getEndpoint(
            "app",
            "00000key",
            "https://api.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://app.bugsnag.smartbear.com");
        });

        it("should normalize hub domain with port", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://custom.bugsnag.smartbear.com:8080",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize hub domain with path", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://custom.bugsnag.smartbear.com/path",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize complex subdomains to standard format", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://staging.app.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });
      });

      describe("Bugsnag domain endpoints (always normalized)", () => {
        it("should normalize to HTTPS subdomain for exact bugsnag domain match", async () => {
          const result = client.getEndpoint(
            "api",
            "regular-key",
            "https://api.bugsnag.com",
          );
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should normalize to HTTPS subdomain regardless of input protocol", async () => {
          const result = client.getEndpoint(
            "api",
            "regular-key",
            "http://app.bugsnag.com",
          );
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should normalize bugsnag domain with port", async () => {
          const result = client.getEndpoint(
            "app",
            "regular-key",
            "https://api.bugsnag.com:9000",
          );
          expect(result).toBe("https://app.bugsnag.com");
        });

        it("should normalize bugsnag domain with path", async () => {
          const result = client.getEndpoint(
            "app",
            "regular-key",
            "https://api.bugsnag.com/v2",
          );
          expect(result).toBe("https://app.bugsnag.com");
        });
      });

      describe("Custom domain endpoints (used as-is)", () => {
        it("should return custom endpoint exactly as provided", async () => {
          const customEndpoint = "https://custom.api.com";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should return custom endpoint as-is regardless of API key type", async () => {
          const customEndpoint = "https://my-custom-domain.com/api";
          const result = client.getEndpoint(
            "api",
            "regular-key",
            customEndpoint,
          );
          expect(result).toBe(customEndpoint);
        });

        it("should preserve HTTP protocol for custom domains", async () => {
          const customEndpoint = "http://localhost:3000";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with ports and paths", async () => {
          const customEndpoint = "https://192.168.1.100:8080/api/v1";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with query parameters", async () => {
          const customEndpoint = "https://custom.domain.com/api?version=1";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with fragments", async () => {
          const customEndpoint = "https://custom.domain.com/api#section";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });
      });

      describe("edge cases", () => {
        it("should handle malformed custom endpoints gracefully", async () => {
          // This should throw due to invalid URL, which is expected behavior
          expect(() => {
            client.getEndpoint("api", "00000key", "not-a-valid-url");
          }).toThrow();
        });

        it("should preserve custom endpoints with userinfo", async () => {
          const customEndpoint = "https://user:pass@custom.domain.com";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should normalize known domains even with userinfo", async () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://user:pass@app.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });
      });
    });

    describe("subdomain validation", () => {
      it("should handle empty subdomain", async () => {
        const result = client.getEndpoint("", "00000key");
        expect(result).toBe("https://.bugsnag.smartbear.com");
      });

      it("should handle subdomain with special characters", async () => {
        const result = client.getEndpoint("test-api_v2", "00000key");
        expect(result).toBe("https://test-api_v2.bugsnag.smartbear.com");
      });

      it("should handle numeric subdomain", async () => {
        const result = client.getEndpoint("v1", "regular-key");
        expect(result).toBe("https://v1.bugsnag.com");
      });

      it("should handle very long subdomains", async () => {
        const longSubdomain = "very-long-subdomain-name-with-many-characters";
        const result = client.getEndpoint(longSubdomain, "00000key");
        expect(result).toBe(`https://${longSubdomain}.bugsnag.smartbear.com`);
      });
    });
  });

  describe("static utility methods", () => {
    // Test static methods if they exist in the class
    it("should have proper class structure", async () => {
      const client = new BugsnagClient();

      // Verify the client has expected methods
      expect(typeof client.configure).toBe("function");
      expect(typeof client.registerTools).toBe("function");
      expect(typeof client.registerResources).toBe("function");
    });
  });

  describe("error handling", () => {
    it("should handle invalid tokens gracefully during construction", async () => {
      expect(() => {
        new BugsnagClient();
      }).not.toThrow();

      expect(() => {
        new BugsnagClient();
      }).not.toThrow();
    });

    it("should handle special characters in project API key", async () => {
      expect(() => {
        new BugsnagClient();
      }).not.toThrow();
    });
  });

  describe("configuration validation", () => {
    it("should pass correct authToken to Configuration", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/api/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);
      const testToken = "super-secret-token-123";

      await createConfiguredClient(testToken);

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: `token ${testToken}`,
        }),
      );
    });

    it("should include all required headers", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/api/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);

      await createConfiguredClient("test-token");

      const configCall = MockedConfiguration.mock.calls[0][0];
      expect(configCall?.headers).toEqual({
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      });
    });
  });

  describe("API client initialization", () => {
    it("should initialize all required API clients", async () => {
      const { CurrentUserAPI, ErrorAPI, ProjectAPI } = await import(
        "../../../bugsnag/client/api/index.js"
      );

      const MockedCurrentUserAPI = vi.mocked(CurrentUserAPI);
      const MockedErrorAPI = vi.mocked(ErrorAPI);
      const MockedProjectAPI = vi.mocked(ProjectAPI);

      // Clear previous calls from beforeEach and other tests
      MockedCurrentUserAPI.mockClear();
      MockedErrorAPI.mockClear();
      MockedProjectAPI.mockClear();

      await createConfiguredClient("test-token");

      expect(MockedCurrentUserAPI).toHaveBeenCalledOnce();
      expect(MockedErrorAPI).toHaveBeenCalledOnce();
      expect(MockedProjectAPI).toHaveBeenCalledOnce();
    });

    it("should use cache from server.getCache()", async () => {
      const client = new BugsnagClient();
      const mockServer = {
        getCache: vi.fn().mockReturnValue(mockCache),
      } as any;

      await client.configure(mockServer, { auth_token: "test-token" });

      // Cache should be used in getProjects
      mockCache.get.mockReturnValueOnce(null); // No cached org
      mockCache.get.mockReturnValueOnce(null); // No cached projects

      const mockOrg = getMockOrganization("org-1", "Test Org");
      const mockProjects = [getMockProject("proj-1", "Project 1")];
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: mockProjects,
      });

      await client.getProjects();

      expect(mockServer.getCache).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith("bugsnag_org", mockOrg);
      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_projects",
        mockProjects,
      );
    });
  });

  describe("initialization", () => {
    it("should initialize successfully with organizations and projects", async () => {
      const testClient = new BugsnagClient();
      const mockOrg = getMockOrganization("org-1", "Test Org");
      const mockProjects = [
        getMockProject("proj-1", "Project 1"),
        getMockProject("proj-2", "Project 2"),
      ];

      // Clear mocks from beforeEach
      mockCurrentUserAPI.listUserOrganizations.mockClear();
      mockCurrentUserAPI.getOrganizationProjects.mockClear();
      mockCache.set.mockClear();

      mockCache.get
        .mockReturnValueOnce(null) // No cached projects
        .mockReturnValueOnce(null) // No cached organization
        .mockReturnValueOnce(null); // No current project
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: mockProjects,
      });
      mockCache.get.mockReturnValueOnce(mockProjects);

      await testClient.configure({ getCache: () => mockCache } as any, {
        auth_token: "test-token",
      });

      expect(mockCurrentUserAPI.listUserOrganizations).toHaveBeenCalledOnce();
      expect(mockCurrentUserAPI.getOrganizationProjects).toHaveBeenCalledWith(
        "org-1",
      );
      expect(mockCache.set).toHaveBeenCalledWith("bugsnag_org", mockOrg);
      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_projects",
        mockProjects,
      );
    });

    it("should initialize with project API key and set up event filters", async () => {
      const clientWithApiKey = new BugsnagClient();
      const mockProjects = [
        getMockProject("proj-1", "Project 1", "project-api-key"),
        getMockProject("proj-2", "Project 2", "other-key"),
      ];
      const mockEventFields = [
        { displayId: "user.email", custom: false },
        { displayId: "error.status", custom: false },
        { displayId: "search", custom: false }, // This should be filtered out
      ];

      mockCache.get
        .mockReturnValueOnce(mockProjects)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockProjects)
        .mockReturnValueOnce(null);
      mockProjectAPI.listProjectEventFields.mockResolvedValue({
        body: mockEventFields,
      });

      await clientWithApiKey.configure({ getCache: () => mockCache } as any, {
        auth_token: "test-token",
        project_api_key: "project-api-key",
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_current_project",
        mockProjects[0],
      );
      expect(mockProjectAPI.listProjectEventFields).toHaveBeenCalledWith(
        "proj-1",
      );
      // Verify that 'search' field is filtered out
      const filteredFields = mockEventFields.filter(
        (field) => field.displayId !== "search",
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_project_event_filters",
        { "proj-1": filteredFields },
      );
    });

    it("should not throw error when no organizations found", async () => {
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [] });

      const client = new BugsnagClient();
      await expect(
        client.configure({ getCache: () => mockCache } as any, {
          auth_token: "test-token",
        }),
      ).resolves.toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        "Unable to connect to BugSnag APIs, the BugSnag tools will not work. Check your configured BugSnag auth token.",
        expect.any(Error),
      );
    });

    it("should not throw error when project with API key not found", async () => {
      const clientWithApiKey = new BugsnagClient();
      await clientWithApiKey.configure({ getCache: () => mockCache } as any, {
        auth_token: "test-token",
        project_api_key: "non-existent-key",
      });
      const mockOrg = getMockOrganization("org-1", "Test Org");
      const mockProject = getMockProject("proj-1", "Project 1", "other-key");

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: [mockProject],
      });

      await expect(
        clientWithApiKey.configure({ getCache: () => mockCache } as any, {
          auth_token: "test-token",
          project_api_key: "non-existent-key",
        }),
      ).resolves.toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. Check your configured BugSnag project API key.",
      );
    });

    it("should throw error when no event fields found for project", async () => {
      const clientWithApiKey = new BugsnagClient();
      const mockOrg = getMockOrganization("org-1", "Test Org");
      const mockProjects = [
        getMockProject("proj-1", "Project 1", "project-api-key"),
      ];

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: mockProjects,
      });
      mockProjectAPI.listProjectEventFields.mockResolvedValue({ body: [] });

      expect(
        clientWithApiKey.configure({ getCache: () => mockCache } as any, {
          auth_token: "test-token",
          project_api_key: "project-api-key",
        }),
      ).rejects.toThrow("No event fields found for project Project 1");
    });
  });

  describe("API methods", async () => {
    beforeEach(async () => {
      client = await createConfiguredClient("test-token", "test-project-key");
    });

    describe("getProjects", () => {
      const mockOrg = getMockOrganization("org-1", "Test Org");
      const mockProjects = [getMockProject("proj-1", "Project 1")];

      it("should return cached projects when available", async () => {
        mockCache.get.mockReturnValue(mockProjects);

        const result = await client.getProjects();

        expect(mockCache.get).toHaveBeenCalledWith("bugsnag_projects");
        expect(result).toEqual(mockProjects);
      });

      it("should fetch projects from API when not cached", async () => {
        mockCache.get
          .mockReturnValueOnce(null) // First call for projects
          .mockReturnValueOnce(mockOrg); // Second call for org
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
          body: mockProjects,
        });

        const result = await client.getProjects();

        expect(mockCurrentUserAPI.getOrganizationProjects).toHaveBeenCalledWith(
          "org-1",
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_projects",
          mockProjects,
        );
        expect(result).toEqual(mockProjects);
      });

      it("should return empty array when no projects found", async () => {
        mockCache.get
          .mockReturnValueOnce(null) // First call for projects
          .mockReturnValueOnce(mockOrg); // Second call for org
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
          body: [],
        });

        await expect(client.getProjects()).resolves.toEqual([]);
      });
    });

    describe("getEventById", () => {
      const mockOrgs = [getMockOrganization("org-1", "Test Org")];
      const mockProjects = [
        getMockProject("proj-1", "Project 1"),
        getMockProject("proj-2", "Project 2"),
      ];
      it("should find event across multiple projects", async () => {
        const mockEvent: EventApiView = { id: "event-1" };

        mockCache.get.mockReturnValueOnce(mockProjects);
        mockCache.get.mockReturnValueOnce(mockOrgs);
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
          body: mockProjects,
        });
        mockErrorAPI.viewEventById
          .mockRejectedValueOnce(new Error("Not found")) // proj-1
          .mockResolvedValueOnce({ body: mockEvent }); // proj-2

        const result = await client.getEvent("event-1");

        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith(
          "proj-1",
          "event-1",
        );
        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith(
          "proj-2",
          "event-1",
        );
        expect(result).toEqual(mockEvent);
      });

      it("should return null when event not found in any project", async () => {
        mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
          body: mockOrgs,
        });
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
          body: mockProjects,
        });
        mockErrorAPI.viewEventById.mockRejectedValue(new Error("Not found"));

        const result = await client.getEvent("event-1");

        expect(result).toBeNull();
      });
    });
  });

  describe("tool registration", () => {
    let registerToolsSpy: any;
    let getInputFunctionSpy: any;

    beforeEach(() => {
      registerToolsSpy = vi.fn();
      getInputFunctionSpy = vi.fn();
    });

    it("should register common tools", async () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map(
        (call: any) => call[0].title,
      );
      expect(registeredTools).toContain("Get Current Project");
      expect(registeredTools).toContain("List Projects");
      expect(registeredTools).toContain("Get Error");
      expect(registeredTools).toContain("Get Event Details");
      expect(registeredTools).toContain("List Project Errors");
      expect(registeredTools).toContain("List Project Event Filters");
      expect(registeredTools).toContain("Update Error");
      expect(registeredTools).toContain("Get Build");
      expect(registeredTools).toContain("List Releases");
      expect(registeredTools).toContain("Get Release");
      expect(registeredTools).toContain("List Span Groups");
      expect(registeredTools).toContain("Get Span Group");
      expect(registeredTools).toContain("List Spans");
      expect(registeredTools).toContain("Get Trace");
      expect(registeredTools).toContain("List Trace Fields");
      expect(registeredTools.length).toBe(15);
    });
  });

  describe("resource registration", () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    it("should register event resource", async () => {
      client.registerResources(registerResourcesSpy);

      expect(registerResourcesSpy).toHaveBeenCalledWith(
        "event",
        "{id}",
        expect.any(Function),
      );
    });
  });

  describe("tool handlers", () => {
    let registerToolsSpy: any;
    let getInputFunctionSpy: any;

    beforeEach(async () => {
      registerToolsSpy = vi.fn();
      getInputFunctionSpy = vi.fn();

      client = await createConfiguredClient("test-token", "test-project-key");
      clientWithNoApiKey = await createConfiguredClient("test-token");
    });

    describe("Setting the current project", () => {
      it("should set the current project for the next tool if no API key is configured", async () => {
        const mockProject = getMockProject("proj-1", "Project 1");
        const mockEventFields: Record<string, EventField[]> = {
          "proj-1": [
            {
              displayId: "error.status",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "user.email",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "event.since",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
          ],
        };
        const mockErrors: ErrorApiView[] = [
          { id: "error-1", message: "Test error" },
        ];

        mockCache.get
          .mockReturnValueOnce([mockProject])
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          totalCount: 1,
        });

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        await toolHandler({
          projectId: "proj-1",
        });

        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_current_project",
          mockProject,
        );

        // The subsequent call should get a current project and not throw if a project ID is not provided

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields);
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          totalCount: 1,
        });

        await toolHandler({});
      });
    });

    describe("List Projects tool handler", () => {
      it("should return all projects", async () => {
        const mockProjects = [getMockProject("proj-1", "Project 1")];
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({});

        const expectedResult = {
          data: mockProjects,
          count: 1,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should handle no projects found", async () => {
        mockCache.get.mockReturnValue([]);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        expect(toolHandler({})).rejects.toThrow(
          "No BugSnag projects found for the current user.",
        );
      });

      it("should filter projects by apiKey parameter", async () => {
        const mockProjects = [
          getMockProject("proj-1", "Project 1", "key-1"),
          getMockProject("proj-2", "Project 2", "key-2"),
        ];
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ apiKey: "key-2" });
        const expectedResult = {
          data: [mockProjects[1]],
          count: 1,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should filter projects by apiKey parameter - no match", async () => {
        const mockProjects = [getMockProject("proj-1", "Project 1", "key-1")];
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ apiKey: "key-x" });
        const expectedResult = {
          data: [],
          count: 0,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });
    });

    describe("Get Error tool handler", () => {
      const mockOrg = getMockOrganization("org-1", "Test Org", "test-org");
      const mockProject = getMockProject("proj-1", "Project 1", "my-project");
      const mockError: ErrorApiView = { id: "error-1", message: "Test error" };

      it("should get error details with project from cache", async () => {
        const mockEvents: EventApiView[] = [{ id: "event-1" }];
        const mockPivots: PivotApiView[] = [
          { name: "test-pivot", eventFieldDisplayId: "test" },
        ];

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({
          body: mockError,
        });
        mockErrorAPI.listEventsOnProject.mockResolvedValue({
          body: mockEvents,
        });
        mockErrorAPI.getPivotValuesOnAnError.mockResolvedValue({
          body: mockPivots,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Error",
        )[1];

        const result = await toolHandler({ errorId: "error-1" });

        const queryString =
          "?filters[error][][type]=eq&filters[error][][value]=error-1";
        const encodedQueryString = encodeURI(queryString);
        expect(mockErrorAPI.viewErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({
            error_details: mockError,
            latest_event: mockEvents[0],
            pivots: mockPivots,
            url: `https://app.bugsnag.com/${mockOrg.slug}/${mockProject.slug}/errors/error-1${encodedQueryString}`,
          }),
        );
      });

      it("should get error details without any latest events or pivots", async () => {
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({
          body: mockError,
        });
        mockErrorAPI.listEventsOnProject.mockResolvedValue({
          body: [],
        });
        mockErrorAPI.getPivotValuesOnAnError.mockResolvedValue({
          body: [],
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Error",
        )[1];

        const result = await toolHandler({ errorId: "error-1" });

        const queryString =
          "?filters[error][][type]=eq&filters[error][][value]=error-1";
        const encodedQueryString = encodeURI(queryString);
        expect(mockErrorAPI.viewErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({
            error_details: mockError,
            latest_event: null,
            pivots: [],
            url: `https://app.bugsnag.com/${mockOrg.slug}/${mockProject.slug}/errors/error-1${encodedQueryString}`,
          }),
        );
      });

      it("should throw when error ID does not exist", async () => {
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({ body: null });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Error",
        )[1];
        await expect(
          toolHandler({ errorId: "non-existent-id" }),
        ).rejects.toThrow(
          "Error with ID non-existent-id not found in project proj-1.",
        );
      });
    });

    describe("Get Event Details tool handler", () => {
      it("should get event details from dashboard URL", async () => {
        const mockProjects = [
          getMockProject("proj-1", "My Project", undefined, "my-project"),
        ];
        const mockEvent: EventApiView = { id: "event-1" };

        mockCache.get.mockReturnValue(mockProjects);

        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Event Details",
        )[1];

        const result = await toolHandler({
          link: "https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1",
        });

        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith(
          "proj-1",
          "event-1",
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockEvent));
      });

      it("should throw error when link is invalid", async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Event Details",
        )[1];

        await expect(toolHandler({ link: "invalid-url" })).rejects.toThrow();
      });

      it("should throw error when project not found", async () => {
        mockCache.get.mockReturnValue([
          getMockProject("proj-1", "Other Project", "other-project"),
        ]);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Event Details",
        )[1];

        await expect(
          toolHandler({
            link: "https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1",
          }),
        ).rejects.toThrow("Project with the specified slug not found.");
      });

      it("should throw error when URL is missing required parameters", async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Event Details",
        )[1];

        await expect(
          toolHandler({
            link: "https://app.bugsnag.com/my-org/my-project/errors/error-123", // Missing event_id
          }),
        ).rejects.toThrow(
          "Both projectSlug and eventId must be present in the link",
        );
      });
    });

    describe("List Project Errors tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should list project errors with supplied parameters", async () => {
        const mockEventFields: Record<string, EventField[]> = {
          "proj-1": [
            {
              displayId: "error.status",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "user.email",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "event.since",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
          ],
        };
        const mockErrors: ErrorApiView[] = [
          { id: "error-1", message: "Test error" },
        ];
        const filters = {
          "error.status": [{ type: "eq" as const, value: "for_review" }],
          "event.since": [{ type: "eq", value: "7d" }],
        };

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          totalCount: 1,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        const result = await toolHandler({
          filters,
          sort: "last_seen",
          direction: "desc",
          perPage: 50,
        });

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith(
          "proj-1",
          null,
          "last_seen",
          "desc",
          50,
          filters,
          undefined,
        );
        const expectedResult = {
          data: mockErrors,
          data_count: 1,
          total_count: 1,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should use default filters when not specified", async () => {
        const mockEventFields: Record<string, EventField[]> = {
          "proj-1": [
            {
              displayId: "error.status",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "user.email",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "event.since",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
          ],
        };
        const mockErrors: ErrorApiView[] = [
          { id: "error-1", message: "Test error" },
        ];
        const defaultFilters = {
          "error.status": [{ type: "eq" as const, value: "open" }],
          "event.since": [{ type: "eq", value: "30d" }],
        };

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          totalCount: 3,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        const defaultFilterResult = await toolHandler({
          sort: "last_seen",
          direction: "desc",
          perPage: 50,
        });

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith(
          "proj-1",
          null,
          "last_seen",
          "desc",
          50,
          defaultFilters,
          undefined,
        );
        const expectedResult = {
          data: mockErrors,
          data_count: 1,
          total_count: 3,
        };
        expect(defaultFilterResult.content[0].text).toBe(
          JSON.stringify(expectedResult),
        );
      });

      it("should validate filter keys against cached event fields", async () => {
        const mockEventFields: Record<string, EventField[]> = {
          "proj-1": [
            {
              displayId: "error.status",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
          ],
        };
        const filters = {
          "invalid.field": [{ type: "eq" as const, value: "test" }],
        };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockEventFields);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        await expect(toolHandler({ filters })).rejects.toThrow(
          "Invalid filter key: invalid.field",
        );
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValueOnce(null);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        await expect(toolHandler({ projectId: "no-match" })).rejects.toThrow(
          "Project with ID no-match not found.",
        );
      });
    });

    describe("List Project Event Filters tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should return cached event fields", async () => {
        const mockEventFields: Record<string, EventField[]> = {
          "proj-1": [
            {
              displayId: "error.status",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
            {
              displayId: "user.email",
              custom: false,
              filterOptions: { name: "filter" },
              pivotOptions: {},
            },
          ],
        };
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockEventFields);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Event Filters",
        )[1];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe(
          JSON.stringify(mockEventFields["proj-1"]),
        );
      });

      it("should throw error when no event filters in cache", async () => {
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Event Filters",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No event fields found for project Project 1",
        );
      });
    });

    describe("Get Current Project tool handler", () => {
      it("should return the current project when configured", async () => {
        const mockProject = getMockProject(
          "proj-1",
          "Project 1",
          "test-project-key",
        );
        mockCache.get.mockReturnValueOnce(mockProject);
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Current Project",
        )[1];
        const result = await toolHandler({});
        expect(result.content[0].text).toBe(JSON.stringify(mockProject));
      });

      it("should throw error when no current project is configured", async () => {
        mockCache.get.mockReturnValueOnce(null);
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Current Project",
        )[1];
        await expect(toolHandler({})).rejects.toThrow(ToolError);
      });
    });

    describe("Get Build tool handler", () => {
      const mockProjects: ProjectApiView[] = [
        {
          id: "proj-1",
          name: "Project 1",
          targetStability: {
            value: 0.995,
          },
          criticalStability: {
            value: 0.85,
          },
          stabilityTargetType: "user" as const,
        },
        { id: "proj-2", name: "Project 2" },
      ];
      const mockBuild: ReleaseApiView = {
        id: "rel-1",
        releaseTime: "2023-01-01T00:00:00Z",
        appVersion: "1.0.0",
        releaseStage: { name: "production" },
        sourceControl: {
          service: "github",
          commitUrl: "https://github.com/org/repo/commit/abc123",
          revision: "abc123",
          diffUrlToPrevious:
            "https://github.com/org/repo/compare/previous...abc123",
        },
        errorsIntroducedCount: 5,
        errorsSeenCount: 10,
        totalSessionsCount: 100,
        unhandledSessionsCount: 10,
        accumulativeDailyUsersSeen: 50,
        accumulativeDailyUsersWithUnhandled: 5,
      };
      it("should get build details", async () => {
        const basicBuild = {
          ...mockBuild,
          errorsIntroducedCount: 5,
          errorsSeenCount: 10,
          totalSessionsCount: 100,
          unhandledSessionsCount: 10,
          accumulativeDailyUsersSeen: 50,
          accumulativeDailyUsersWithUnhandled: 5,
        };
        const enhancedBuild = {
          ...basicBuild,
          userStability: 0.9,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: true,
        };

        // First get for the project, second for cached build (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects[0])
          .mockReturnValueOnce([mockProjects[0]]);
        mockProjectAPI.getProjectReleaseById.mockResolvedValue({
          body: basicBuild,
        });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({ buildId: "rel-1" });

        expect(mockProjectAPI.getProjectReleaseById).toHaveBeenCalledWith(
          "proj-1",
          "rel-1",
        );
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should handle 0 daily users", async () => {
        const basicBuild: ReleaseApiView = {
          ...mockBuild,
          accumulativeDailyUsersSeen: 0,
        };
        const enhancedBuild = {
          ...basicBuild,
          userStability: 0,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: false,
        };

        // First get for the project, second for cached build (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects[0])
          .mockReturnValueOnce([mockProjects[0]]);
        mockProjectAPI.getProjectReleaseById.mockResolvedValue({
          body: basicBuild,
        });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({ buildId: "rel-1" });

        expect(mockProjectAPI.getProjectReleaseById).toHaveBeenCalledWith(
          "proj-1",
          "rel-1",
        );
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should handle 0 sessions", async () => {
        const mockProjectSessionStability: ProjectApiView = {
          ...mockProjects[0],
          stabilityTargetType: "session" as const,
        };
        const basicBuild: ReleaseApiView = {
          ...mockBuild,
          totalSessionsCount: 0,
        };
        const enhancedBuild = {
          ...basicBuild,
          userStability: 0.9,
          sessionStability: 0,
          stabilityTargetType: "session",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: false,
        };

        // First get for the project, second for cached build (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjectSessionStability)
          .mockReturnValueOnce([mockProjectSessionStability]);
        mockProjectAPI.getProjectReleaseById.mockResolvedValue({
          body: basicBuild,
        });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({ buildId: "rel-1" });

        expect(mockProjectAPI.getProjectReleaseById).toHaveBeenCalledWith(
          "proj-1",
          "rel-1",
        );
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should get build with explicit project ID", async () => {
        const basicBuild: ReleaseApiView = {
          ...mockBuild,
          totalSessionsCount: 50,
          unhandledSessionsCount: 5,
          accumulativeDailyUsersSeen: 30,
          accumulativeDailyUsersWithUnhandled: 3,
        };

        const enhancedBuild = {
          ...basicBuild,
          userStability: 0.9,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: true,
        };

        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.getProjectReleaseById.mockResolvedValue({
          body: basicBuild,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({
          projectId: "proj-1",
          buildId: "rel-1",
        });

        expect(mockProjectAPI.getProjectReleaseById).toHaveBeenCalledWith(
          "proj-1",
          "rel-1",
        );
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should throw error when build not found", async () => {
        mockCache.get
          .mockReturnValueOnce(mockProjects[0])
          .mockReturnValueOnce([mockProjects[0]]);
        mockProjectAPI.getProjectReleaseById.mockResolvedValue({ body: null });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        await expect(
          toolHandler({ buildId: "non-existent-release-id" }),
        ).rejects.toThrow("No build for non-existent-release-id found.");
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        await expect(toolHandler({ buildId: "rel-1" })).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      });
    });

    describe("List Releases tool handler", () => {
      const mockProjects: ProjectApiView[] = [
        { id: "proj-1", name: "Project 1" },
        {
          id: "proj-2",
          name: "Project 2",
          targetStability: {
            value: 0.995,
          },
          criticalStability: {
            value: 0.85,
          },
          stabilityTargetType: "user" as const,
        },
      ];
      it("should list releases with project from cache", async () => {
        const mockReleases: ReleaseApiView[] = [
          {
            id: "rel-group-1",
            appVersion: "1.0.0",
            totalSessionsCount: 50,
            unhandledSessionsCount: 5,
            accumulativeDailyUsersSeen: 30,
            accumulativeDailyUsersWithUnhandled: 3,
          },
        ];

        const enhancedReleases = mockReleases.map((release) => ({
          ...release,
          userStability: 0.9,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: true,
        }));

        // Mock project cache to return the project
        mockCache.get
          .mockReturnValueOnce(mockProjects[1])
          .mockReturnValueOnce([mockProjects[1]]);
        mockProjectAPI.listProjectReleaseGroups.mockResolvedValue({
          body: mockReleases,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases",
        )[1];

        const result = await toolHandler({
          releaseStage: "production",
          visibleOnly: true,
        });

        expect(mockProjectAPI.listProjectReleaseGroups).toHaveBeenCalledWith(
          "proj-2",
          "production",
          false,
          true,
          30,
          undefined,
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({ data: enhancedReleases, data_count: 1 }),
        );
      });

      it("should list releases with explicit project ID", async () => {
        const mockReleases: ReleaseApiView[] = [
          {
            id: "rel-group-2",
            appVersion: "1.0.0",
            totalSessionsCount: 50,
            unhandledSessionsCount: 5,
            accumulativeDailyUsersSeen: 30,
            accumulativeDailyUsersWithUnhandled: 3,
          },
        ];

        const enhancedReleases = mockReleases.map((release) => ({
          ...release,
          userStability: 0.9,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: true,
        }));

        // Mock projects cache to return the projects list
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.listProjectReleaseGroups.mockResolvedValue({
          body: mockReleases,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases",
        )[1];

        const result = await toolHandler({
          projectId: "proj-2",
          releaseStage: "staging",
          visibleOnly: false,
        });

        expect(mockProjectAPI.listProjectReleaseGroups).toHaveBeenCalledWith(
          "proj-2",
          "staging",
          false,
          false,
          30,
          undefined,
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({ data: enhancedReleases, data_count: 1 }),
        );
      });

      it("should handle empty releases list", async () => {
        // Mock project cache to return the project
        mockCache.get.mockReturnValueOnce(mockProjects[0]);
        mockProjectAPI.listProjectReleaseGroups.mockResolvedValue({ body: [] });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases",
        )[1];

        const result = await toolHandler({
          visibleOnly: true,
        });

        expect(mockProjectAPI.listProjectReleaseGroups).toHaveBeenCalledWith(
          "proj-1",
          "production",
          false,
          true,
          30,
          undefined,
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({ data: [], data_count: 0 }),
        );
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      });
    });

    describe("Get Release tool handler", () => {
      const mockProjects: ProjectApiView[] = [
        { id: "proj-1", name: "Project 1" },
        {
          id: "proj-2",
          name: "Project 2",
          targetStability: {
            value: 0.995,
          },
          criticalStability: {
            value: 0.85,
          },
          stabilityTargetType: "user" as const,
        },
      ];
      it("should get release with explicit project ID", async () => {
        const mockRelease: ReleaseApiView = {
          id: "rel-group-2",
          projectId: "proj-2",
          appVersion: "1.0.0",
          totalSessionsCount: 50,
          unhandledSessionsCount: 5,
          accumulativeDailyUsersSeen: 30,
          accumulativeDailyUsersWithUnhandled: 3,
        };

        const enhancedRelease = {
          ...mockRelease,
          userStability: 0.9,
          sessionStability: 0.9,
          stabilityTargetType: "user",
          targetStability: 0.995,
          criticalStability: 0.85,
          meetsTargetStability: false,
          meetsCriticalStability: true,
        };

        const mockBuildsInRelease: ReleaseApiView[] = [
          {
            id: "build-1",
            releaseTime: "2023-01-01T00:00:00Z",
            appVersion: "1.0.0",
            totalSessionsCount: 100,
            unhandledSessionsCount: 10,
            accumulativeDailyUsersSeen: 5,
            accumulativeDailyUsersWithUnhandled: 1,
          },
        ];

        const enhancedBuildsInRelease = [
          {
            ...mockBuildsInRelease[0],
            userStability: 0.8,
            sessionStability: 0.9,
            stabilityTargetType: "user",
            targetStability: 0.995,
            criticalStability: 0.85,
            meetsTargetStability: false,
            meetsCriticalStability: false,
          },
        ];

        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.getReleaseGroup.mockResolvedValue({
          body: mockRelease,
        });

        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release",
        )[1];

        const result = await toolHandler({
          projectId: "proj-2",
          releaseId: "rel-group-2",
        });

        expect(mockProjectAPI.getReleaseGroup).toHaveBeenCalledWith(
          "rel-group-2",
        );
        expect(result.content[0].text).toBe(
          JSON.stringify({
            release: enhancedRelease,
            builds: enhancedBuildsInRelease,
          }),
        );
      });

      it("should throw error when release not found", async () => {
        mockCache.get
          .mockReturnValueOnce(mockProjects[0])
          .mockReturnValueOnce(null);
        mockProjectAPI.getReleaseGroup.mockResolvedValue({ body: null });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release",
        )[1];

        await expect(
          toolHandler({ releaseId: "non-existent-release-id" }),
        ).rejects.toThrow("No release for non-existent-release-id found.");
      });
    });

    describe("Update Error tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should update error successfully with project from cache", async () => {
        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        const result = await toolHandler({
          errorId: "error-1",
          operation: "fix",
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
          { operation: "fix" },
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it("should update error successfully with explicit project ID", async () => {
        const mockProjects = [
          getMockProject("proj-1", "Project 1"),
          getMockProject("proj-2", "Project 2"),
        ];
        mockCache.get.mockReturnValue(mockProjects);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 204 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        const result = await toolHandler({
          projectId: "proj-1",
          errorId: "error-1",
          operation: "ignore",
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
          { operation: "ignore" },
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it("should handle all permitted operations", async () => {
        // Test all operations except override_severity which requires special elicitInput handling
        const operations = ["open", "fix", "ignore", "discard", "undiscard"];

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        for (const operation of operations) {
          await toolHandler({
            errorId: "error-1",
            operation: operation as any,
          });

          expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
            "proj-1",
            "error-1",
            { operation, severity: undefined },
          );
        }

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledTimes(
          operations.length,
        );
      });

      it("should handle override_severity operation with elicitInput", async () => {
        getInputFunctionSpy.mockResolvedValue({
          action: "accept",
          content: { severity: "warning" },
        });

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        const result = await toolHandler({
          errorId: "error-1",
          operation: "override_severity",
        });

        expect(getInputFunctionSpy).toHaveBeenCalledWith({
          message:
            "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
          requestedSchema: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ["info", "warning", "error"],
                description: "The new severity level for the error",
              },
            },
          },
          required: ["severity"],
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
          { operation: "override_severity", severity: "warning" },
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it("should handle override_severity operation when elicitInput is rejected", async () => {
        getInputFunctionSpy.mockResolvedValue({
          action: "reject",
        });

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        const result = await toolHandler({
          errorId: "error-1",
          operation: "override_severity",
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          "proj-1",
          "error-1",
          { operation: "override_severity", severity: undefined },
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it("should return false when API returns non-success status", async () => {
        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 400 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        const result = await toolHandler({
          errorId: "error-1",
          operation: "fix",
        });

        expect(result.content[0].text).toBe(JSON.stringify({ success: false }));
      });

      it("should throw error when no project found", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        await expect(
          toolHandler({
            errorId: "error-1",
            operation: "fix",
          }),
        ).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      });

      it("should throw error when project ID not found", async () => {
        const mockOrg = getMockOrganization("org-1", "Org 1", "org-1");

        mockCache.get.mockReturnValueOnce(null).mockReturnValueOnce(mockOrg);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Update Error",
        )[1];

        await expect(
          toolHandler({
            projectId: "non-existent-project",
            errorId: "error-1",
            operation: "fix",
          }),
        ).rejects.toThrow("Project with ID non-existent-project not found.");
      });
    });

    describe("List Span Groups tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should list span groups with default parameters", async () => {
        const mockSpanGroups: SpanGroup[] = [
          {
            id: "span-group-1",
            name: "span-name-1",
            displayName: "GET /api/users",
            category: <any>"app_start",
          },
          {
            id: "span-group-2",
            name: "span-name-2",
            displayName: "POST /api/login",
            category: <any>"http_request",
          },
        ];

        mockCache.get.mockReturnValue(mockProject);
        mockProjectAPI.listProjectSpanGroups.mockResolvedValue({
          body: mockSpanGroups,
          nextUrl: null,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listSpanGroupsHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Span Groups",
        )[1];

        const result = await listSpanGroupsHandler({});

        expect(mockProjectAPI.listProjectSpanGroups).toHaveBeenCalledWith(
          "proj-1",
          undefined,
          "desc",
          30,
          undefined,
          {
            "span.since": [
              {
                type: "eq",
                value: "7d",
              },
            ],
          },
          undefined,
          undefined,
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: mockSpanGroups,
                next_url: null,
                count: 2,
              }),
            },
          ],
        });
      });

      it("should list span groups with sorting and filtering", async () => {
        const mockSpanGroups: SpanGroup[] = [
          {
            id: "span-group-1",
            name: "span-name-1",
            displayName: "GET /api/users",
            category: <any>"http_request",
          },
        ];
        const filters = {
          "span_group.category": [{ type: "eq", value: "http_request" }],
        };

        mockCache.get.mockReturnValue(mockProject);
        mockProjectAPI.listProjectSpanGroups.mockResolvedValue({
          body: mockSpanGroups,
          nextUrl: "/next",
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listSpanGroupsHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Span Groups",
        )[1];

        const result = await listSpanGroupsHandler({
          sort: "duration_p95",
          direction: "desc",
          perPage: 10,
          starredOnly: true,
          filters: filters,
        });

        expect(mockProjectAPI.listProjectSpanGroups).toHaveBeenCalledWith(
          "proj-1",
          "duration_p95",
          "desc",
          10,
          undefined,
          filters,
          true,
          undefined,
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: mockSpanGroups,
                next_url: "/next",
                count: 1,
              }),
            },
          ],
        });
      });
    });

    describe("Get Span Group tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should get span group with timeline and distribution", async () => {
        const mockSpanGroup: SpanGroup = {
          id: "span-group-1",
          name: "span-name-1",
          category: <any>"http_request",
          displayName: "GET /api/users",
        };
        const mockTimeline = {
          buckets: [{ timestamp: "2024-01-01", p95: 450 }],
        };
        const mockDistribution = { buckets: [{ range: "0-100ms", count: 50 }] };

        mockCache.get.mockReturnValue(mockProject);
        mockProjectAPI.getProjectSpanGroup.mockResolvedValue({
          body: mockSpanGroup,
        });
        mockProjectAPI.getProjectSpanGroupTimeline.mockResolvedValue({
          body: mockTimeline,
        });
        mockProjectAPI.getProjectSpanGroupDistribution.mockResolvedValue({
          body: mockDistribution,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const getSpanGroupHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Span Group",
        )[1];

        const result = await getSpanGroupHandler({
          spanGroupId: "span-group-1",
        });

        expect(mockProjectAPI.getProjectSpanGroup).toHaveBeenCalledWith(
          "proj-1",
          "span-group-1",
          {
            "span.since": [
              {
                type: "eq",
                value: "7d",
              },
            ],
          },
        );
        expect(mockProjectAPI.getProjectSpanGroupTimeline).toHaveBeenCalledWith(
          "proj-1",
          "span-group-1",
          {
            "span.since": [
              {
                type: "eq",
                value: "7d",
              },
            ],
          },
        );
        expect(
          mockProjectAPI.getProjectSpanGroupDistribution,
        ).toHaveBeenCalledWith("proj-1", "span-group-1", {
          "span.since": [
            {
              type: "eq",
              value: "7d",
            },
          ],
        });
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...mockSpanGroup,
                timeline: mockTimeline,
                distribution: mockDistribution,
              }),
            },
          ],
        });
      });

      it("should throw error when spanGroupId is missing", async () => {
        mockCache.get.mockReturnValue(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const getSpanGroupHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Span Group",
        )[1];

        await expect(getSpanGroupHandler({})).rejects.toThrow("Required");
      });
    });

    describe("List Spans tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should list spans for a span group", async () => {
        const mockSpans: Span[] = [
          {
            traceId: "trace-abc",
            id: "span-1",
            name: "span-name-1",
            displayName: "GET /api/users",
            category: <any>"http_request",
            duration: 250,
            timestamp: "2024-01-01T10:00:00Z",
            timeAdjustmentType: <any>"unadjusted",
            startTime: "2024-01-01T09:59:59Z",
            isFirstClass: true,
          },
          {
            traceId: "trace-def",
            id: "span-2",
            name: "span-name-2",
            displayName: "POST /api/login",
            category: <any>"http_request",
            duration: 180,
            timestamp: "2024-01-01T10:01:00Z",
            timeAdjustmentType: <any>"unadjusted",
            startTime: "2024-01-01T10:00:30Z",
            isFirstClass: true,
          },
        ];

        mockCache.get.mockReturnValue(mockProject);
        mockProjectAPI.listSpansBySpanGroupId.mockResolvedValue({
          body: mockSpans,
          nextUrl: null,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listSpansHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Spans",
        )[1];

        const result = await listSpansHandler({
          spanGroupId: "span-group-1",
          sort: "duration",
          direction: "desc",
          perPage: 20,
        });

        expect(mockProjectAPI.listSpansBySpanGroupId).toHaveBeenCalledWith(
          "proj-1",
          "span-group-1",
          {
            "span.since": [
              {
                type: "eq",
                value: "7d",
              },
            ],
          },
          "duration",
          "desc",
          20,
          undefined,
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: mockSpans,
                next_url: null,
                count: 2,
              }),
            },
          ],
        });
      });

      it("should throw error when spanGroupId is missing", async () => {
        mockCache.get.mockReturnValue(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listSpansHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Spans",
        )[1];

        await expect(listSpansHandler({})).rejects.toThrow("Required");
      });
    });

    describe("Get Trace tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should get all spans for a trace", async () => {
        const mockSpans: Span[] = [
          {
            traceId: "trace-abc",
            id: "span-1",
            name: "span-name-1",
            displayName: "GET /api/users",
            category: <any>"http_request",
            timeAdjustmentType: <any>"unadjusted",
            timestamp: "2024-01-01T10:00:00Z",
            startTime: "2024-01-01T09:59:59Z",
            isFirstClass: true,
            duration: 250,
          },
          {
            traceId: "trace-abc",
            parentSpanId: "span-1",
            id: "span-2",
            name: "span-name-2",
            displayName: "POST /api/login",
            category: <any>"http_request",
            timeAdjustmentType: <any>"unadjusted",
            timestamp: "2024-01-01T10:01:00Z",
            startTime: "2024-01-01T10:00:30Z",
            isFirstClass: true,
            duration: 100,
          },
        ];

        mockCache.get.mockReturnValue(mockProject);
        mockProjectAPI.listSpansByTraceId.mockResolvedValue({
          body: mockSpans,
          nextUrl: null,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const getTraceHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Trace",
        )[1];

        const result = await getTraceHandler({
          traceId: "trace-abc",
          from: "2024-01-01T00:00:00Z",
          to: "2024-01-01T23:59:59Z",
          targetSpanId: "span-1",
          perPage: 50,
        });

        expect(mockProjectAPI.listSpansByTraceId).toHaveBeenCalledWith(
          "proj-1",
          "trace-abc",
          "2024-01-01T00:00:00Z",
          "2024-01-01T23:59:59Z",
          "span-1",
          50,
          undefined,
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                data: mockSpans,
                next_url: null,
                count: 2,
              }),
            },
          ],
        });
      });

      it("should throw error when required parameters are missing", async () => {
        mockCache.get.mockReturnValue(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const getTraceHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Trace",
        )[1];

        await expect(
          getTraceHandler({
            traceId: "trace-abc",
            // Missing from and to
          }),
        ).rejects.toThrow("Required");

        await expect(
          getTraceHandler({
            from: "2024-01-01T00:00:00Z",
            to: "2024-01-01T23:59:59Z",
            // Missing traceId
          }),
        ).rejects.toThrow("Required");
      });
    });

    describe("List Trace Fields tool handler", () => {
      const mockProject = getMockProject("proj-1", "Project 1");

      it("should list available trace fields", async () => {
        const mockTraceFields = [
          { name: "user.id", type: "string" },
          { name: "device.type", type: "string" },
          { name: "app.version", type: "string" },
        ];

        mockCache.get.mockImplementation((key: string) => {
          if (key === "bugsnag_current_project") {
            return mockProject;
          }
          return undefined;
        });
        mockProjectAPI.listProjectTraceFields.mockResolvedValue({
          body: mockTraceFields,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listTraceFieldsHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Trace Fields",
        )[1];

        const result = await listTraceFieldsHandler({});

        expect(mockProjectAPI.listProjectTraceFields).toHaveBeenCalledWith(
          "proj-1",
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_project_performance_filters",
          { "proj-1": mockTraceFields },
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify(mockTraceFields),
            },
          ],
        });
      });

      it("should use cached trace fields when available", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockPerformanceFilters = [
          { name: "cached.field", type: "string" },
          { name: "another.field", type: "number" },
        ];
        const mockCachedFilters = { "proj-1": mockPerformanceFilters };

        mockCache.get.mockImplementation((key: string) => {
          if (key === "bugsnag_project_performance_filters") {
            return mockCachedFilters;
          }
          if (key === "bugsnag_current_project") {
            return mockProject;
          }
          return undefined;
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listTraceFieldsHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Trace Fields",
        )[1];

        const result = await listTraceFieldsHandler({});

        // Should use cache and not call API
        expect(mockProjectAPI.listProjectTraceFields).not.toHaveBeenCalled();
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify(mockPerformanceFilters),
            },
          ],
        });
      });

      it("should work with explicit projectId", async () => {
        const mockProjects = [
          getMockProject("proj-1", "Project 1"),
          getMockProject("proj-2", "Project 2"),
        ];
        const mockTraceFields = [{ name: "custom.field", type: "string" }];

        mockCache.get.mockImplementation((key: string) => {
          if (key === "bugsnag_projects") {
            return mockProjects;
          }
          return undefined;
        });
        mockProjectAPI.listProjectTraceFields.mockResolvedValue({
          body: mockTraceFields,
        });

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listTraceFieldsHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Trace Fields",
        )[1];

        const result = await listTraceFieldsHandler({
          projectId: "proj-2",
        });

        expect(mockProjectAPI.listProjectTraceFields).toHaveBeenCalledWith(
          "proj-2",
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_project_performance_filters",
          {
            "proj-2": mockTraceFields,
          },
        );
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify(mockTraceFields),
            },
          ],
        });
      });
    });
  });

  describe("resource handlers", () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    describe("Event resource handler", () => {
      it("should find event by ID across projects", async () => {
        const mockEvent: EventApiView = { id: "event-1" };
        const mockProjects = [getMockProject("proj-1", "Project 1")];

        mockCache.get.mockReturnValueOnce(mockProjects);
        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerResources(registerResourcesSpy);
        const resourceHandler = registerResourcesSpy.mock.calls[0][2];

        const result = await resourceHandler(
          { href: "bugsnag://event/event-1" },
          { id: "event-1" },
        );

        expect(result.contents[0].uri).toBe("bugsnag://event/event-1");
        expect(result.contents[0].text).toBe(JSON.stringify(mockEvent));
      });
    });
  });
});
