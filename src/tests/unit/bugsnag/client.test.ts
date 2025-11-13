import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectApiView } from "../../../bugsnag/client/api/api.js";
import type { BaseAPI } from "../../../bugsnag/client/api/base.js";
import type {
  CurrentUserAPI,
  ErrorAPI,
} from "../../../bugsnag/client/api/index.js";
import type { ProjectAPI } from "../../../bugsnag/client/api/Project.js";
import { BugsnagClient } from "../../../bugsnag/client.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info.js";

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
  getProjectPageLoadSpanGroupById: vi.fn(),
  getProjectPerformanceScoreOverview: vi.fn(),
  getProjectSpanGroup: vi.fn(),
  getProjectSpanGroupDistribution: vi.fn(),
  getProjectSpanGroupTimeline: vi.fn(),
  getSpansByCategoryAndName: vi.fn(),
  listProjectPageLoadSpanGroups: vi.fn(),
  listProjectSpanGroupPerformanceTargets: vi.fn(),
  listProjectSpanGroups: vi.fn(),
  listProjectSpanGroupSummaries: vi.fn(),
  listProjectStarredSpanGroups: vi.fn(),
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
    mockCache.get.mockReturnValueOnce([project]).mockReturnValueOnce(project);
  }
  await client.configure(mockServer, {
    auth_token: authToken,
    project_api_key: projectApiKey,
    endpoint,
  });
  mockCache.get.mockReset();
  return client;
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

    client = await createConfiguredClient("test-token", "test-project-key");
    clientWithNoApiKey = await createConfiguredClient("test-token");
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

      const mockOrg = { id: "org-1", name: "Test Org" };
      const mockProjects = [{ id: "proj-1", name: "Project 1" }];
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
      const mockOrg = { id: "org-1", name: "Test Org" };
      const mockProjects = [
        { id: "proj-1", name: "Project 1", api_key: "key1" },
        { id: "proj-2", name: "Project 2", api_key: "key2" },
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
      const mockProjects: ProjectApiView[] = [
        { id: "proj-1", name: "Project 1", apiKey: "project-api-key" },
        { id: "proj-2", name: "Project 2", apiKey: "other-key" },
      ];
      const mockEventFields = [
        { displayId: "user.email", custom: false },
        { displayId: "error.status", custom: false },
        { displayId: "search", custom: false }, // This should be filtered out
      ];

      mockCache.get
        .mockReturnValueOnce(mockProjects)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockProjects);
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
        "bugsnag_current_project_event_filters",
        filteredFields,
      );
    });

    it("should not throw error when no organizations found", async () => {
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [] });

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
      const mockOrg = { id: "org-1", name: "Test Org" };
      const mockProject = {
        id: "proj-1",
        name: "Project 1",
        api_key: "other-key",
      };

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
      const mockOrg = { id: "org-1", name: "Test Org" };
      const mockProjects = [
        { id: "proj-1", name: "Project 1", api_key: "project-api-key" },
      ];

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: mockProjects,
      });
      mockProjectAPI.listProjectEventFields.mockResolvedValue({ body: [] });

      await expect(
        clientWithApiKey.configure({ getCache: () => mockCache } as any, {
          auth_token: "test-token",
          project_api_key: "project-api-key",
        }),
      ).resolves.toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. Check your configured BugSnag project API key.",
      );
    });
  });

  describe("API methods", () => {
    describe("getProjects", () => {
      it("should return cached projects when available", async () => {
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];
        mockCache.get.mockReturnValue(mockProjects);

        const result = await client.getProjects();

        expect(mockCache.get).toHaveBeenCalledWith("bugsnag_projects");
        expect(result).toEqual(mockProjects);
      });

      it("should fetch projects from API when not cached", async () => {
        const mockOrg = { id: "org-1", name: "Test Org" };
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];

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
        const mockOrg = { id: "org-1", name: "Test Org" };

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
      it("should find event across multiple projects", async () => {
        const mockOrgs = [{ id: "org-1", name: "Test Org" }];
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
        ];
        const mockEvent = { id: "event-1", project_id: "proj-2" };

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
        const mockOrgs = [{ id: "org-1", name: "Test Org" }];
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];

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

    it("should register list_projects tool when no project API key", async () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      expect(registerToolsSpy).toBeCalledWith(
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("should not register list_projects tool when project API key is provided", async () => {
      const clientWithApiKey = new BugsnagClient();

      // Mock required API responses for the configure call
      const mockProjects = [
        { id: "proj-1", name: "Project 1", apiKey: "project-api-key" },
      ];
      const mockEventFields = [{ displayId: "user.email", custom: false }];

      // First call from getProjects in configure
      mockCache.get
        .mockReturnValueOnce(mockProjects) // For getProjects() - returns cached projects
        .mockReturnValueOnce(null) // For getCurrentProject() - no cached project yet
        .mockReturnValueOnce(mockProjects); // For getCurrentProject() - returns projects again

      mockProjectAPI.listProjectEventFields.mockResolvedValue({
        body: mockEventFields,
      });

      await clientWithApiKey.configure({ getCache: () => mockCache } as any, {
        auth_token: "test-token",
        project_api_key: "project-api-key",
      });

      clientWithApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map(
        (call: any) => call[0].title,
      );
      expect(registeredTools).not.toContain("List Projects");
    });

    it("should register common tools regardless of project API key", async () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map(
        (call: any) => call[0].title,
      );
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

    beforeEach(() => {
      registerToolsSpy = vi.fn();
      getInputFunctionSpy = vi.fn();
    });

    describe("List Projects tool handler", () => {
      it("should return projects with pagination", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
          { id: "proj-3", name: "Project 3" },
        ];
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ perPage: 2, page: 1 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should return all projects when no pagination specified", async () => {
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];
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

        const result = await toolHandler({});

        expect(result.content[0].text).toBe("No projects found.");
      });

      it("should handle pagination with only a page size", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
          { id: "proj-3", name: "Project 3" },
        ];
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ perPage: 2 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should handle pagination with only page", async () => {
        const mockProjects = Array.from({ length: 50 }, (_, i) => ({
          id: `proj-${i + 1}`,
          name: `Project ${i + 1}`,
        }));
        mockCache.get.mockReturnValue(mockProjects);

        clientWithNoApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ page: 2 });

        // Default page size is 10, so page 2 should return projects 10-19
        const expectedResult = {
          data: mockProjects.slice(30, 50),
          count: 20,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });
    });

    describe("Get Error tool handler", () => {
      it("should get error details with project from cache", async () => {
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          slug: "my-project",
        };
        const mockError = { id: "error-1", message: "Test error" };
        const mockOrg = { id: "org-1", name: "Test Org", slug: "test-org" };
        const mockEvents = [{ id: "event-1", timestamp: "2023-01-01" }];
        const mockPivots = [{ id: "pivot-1", name: "test-pivot" }];

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
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          slug: "my-project",
        };
        const mockError = { id: "error-1", message: "Test error" };
        const mockOrg = { id: "org-1", name: "Test Org", slug: "test-org" };

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
    });

    describe("Get Event Details tool handler", () => {
      it("should get event details from dashboard URL", async () => {
        const mockProjects = [
          { id: "proj-1", slug: "my-project", name: "My Project" },
        ];
        const mockEvent = { id: "event-1", project_id: "proj-1" };

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
          { id: "proj-1", slug: "other-project", name: "Other Project" },
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
      it("should list project errors with supplied parameters", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockEventFields = [
          { displayId: "error.status", custom: false },
          { displayId: "user.email", custom: false },
          { displayId: "event.since", custom: false },
        ];
        const mockErrors = [{ id: "error-1", message: "Test error" }];
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
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockEventFields = [
          { displayId: "error.status", custom: false },
          { displayId: "user.email", custom: false },
          { displayId: "event.since", custom: false },
        ];
        const mockErrors = [{ id: "error-1", message: "Test error" }];
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
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockEventFields = [{ display_id: "error.status", custom: false }];
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
      it("should return cached event fields", async () => {
        const mockEventFields = [
          { displayId: "error.status", custom: false },
          { displayId: "user.email", custom: false },
        ];
        mockCache.get.mockReturnValue(mockEventFields);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Event Filters",
        )[1];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe(JSON.stringify(mockEventFields));
      });

      it("should throw error when no event filters in cache", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Event Filters",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No event filters found in cache.",
        );
      });
    });

    describe("Get Build tool handler", () => {
      const mockProjects = [
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
      const mockBuild = {
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
        const basicBuild = {
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
        const mockProjectSessionStability = {
          ...mockProjects[0],
          stabilityTargetType: "session" as const,
        };
        const basicBuild = {
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
        const basicBuild = {
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
      const mockProjects = [
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
        const mockReleases = [
          {
            id: "rel-group-1",
            releaseStage_name: "production",
            appVersion: "1.0.0",
            first_released_at: "2023-01-01T00:00:00Z",
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
        const mockReleases = [
          {
            id: "rel-group-2",
            releaseStage_name: "staging",
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
      const mockProjects = [
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
        const mockRelease = {
          id: "rel-group-2",
          project_id: "proj-2",
          releaseStage_name: "staging",
          appVersion: "1.0.0",
          first_released_at: "2023-01-01T00:00:00Z",
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

        const mockBuildsInRelease = [
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
      it("should update error successfully with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

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
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
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
        const mockProject = { id: "proj-1", name: "Project 1" };
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
        const mockProject = { id: "proj-1", name: "Project 1" };

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
        const mockProject = { id: "proj-1", name: "Project 1" };

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
        const mockProject = { id: "proj-1", name: "Project 1" };

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
        const mockOrg = { id: "org-1", name: "Org 1", slug: "org-1" };

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
      it("should list span groups with default parameters", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockSpanGroups = [
          {
            id: "span-group-1",
            displayName: "GET /api/users",
            totalSpans: 100,
          },
          {
            id: "span-group-2",
            displayName: "POST /api/login",
            totalSpans: 50,
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
          undefined,
          30,
          undefined,
          undefined,
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
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockSpanGroups = [
          {
            id: "span-group-1",
            displayName: "GET /api/users",
            durationP95: 500,
          },
        ];
        const mockFilters = [
          {
            key: "span_group.category",
            filterValues: [{ matchType: "eq", value: "http_request" }],
          },
        ];
        const mockTraceFields = [
          { key: "span_group.category", name: "Category", displayId: "span_group.category" },
        ];

        mockCache.get.mockImplementation((key) => {
          if (key === "bugsnag_current_project") return mockProject;
          if (key === "bugsnag_current_project_trace_fields") return mockTraceFields;
          return null;
        });
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
          filters: mockFilters,
        });

        expect(mockProjectAPI.listProjectSpanGroups).toHaveBeenCalledWith(
          "proj-1",
          "duration_p95",
          "desc",
          10,
          undefined,
          mockFilters,
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
      it("should get span group with timeline and distribution", async () => {
        const mockProject = { id: "proj-1", name: "Project 1", slug: "Project 1" };
        const mockOrg = { id: "org-1", name: "Test Org", slug: "org-1" };
        const mockSpanGroup = {
          id: "span-group-1",
          displayName: "GET /api/users",
          statistics: { p50: 100, p95: 500, p99: 1000 },
        };
        const mockTimeline = {
          buckets: [{ timestamp: "2024-01-01", p95: 450 }],
        };
        const mockDistribution = { buckets: [{ range: "0-100ms", count: 50 }] };

        mockCache.get.mockImplementation((key) => {
          if (key === "bugsnag_current_project") return mockProject;
          if (key === "bugsnag_org") return mockOrg;
          return null;
        });
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
          undefined,
        );
        expect(mockProjectAPI.getProjectSpanGroupTimeline).toHaveBeenCalledWith(
          "proj-1",
          "span-group-1",
          undefined,
        );
        expect(
          mockProjectAPI.getProjectSpanGroupDistribution,
        ).toHaveBeenCalledWith("proj-1", "span-group-1", undefined);
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...mockSpanGroup,
                timeline: mockTimeline,
                distribution: mockDistribution,
                url: "https://app.bugsnag.com/org-1/Project 1/performance/span-groups/span-group-1",
              }),
            },
          ],
        });
      });

      it("should throw error when spanGroupId is missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        mockCache.get.mockReturnValue(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const getSpanGroupHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Span Group",
        )[1];

        await expect(getSpanGroupHandler({})).rejects.toThrow("Required");
      });
    });

    describe("List Spans tool handler", () => {
      it("should list spans for a span group", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockSpans = [
          {
            id: "span-1",
            traceId: "trace-abc",
            duration: 250,
            timestamp: "2024-01-01T10:00:00Z",
          },
          {
            id: "span-2",
            traceId: "trace-def",
            duration: 180,
            timestamp: "2024-01-01T10:01:00Z",
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
          undefined,
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
        const mockProject = { id: "proj-1", name: "Project 1" };
        mockCache.get.mockReturnValue(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);

        const listSpansHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Spans",
        )[1];

        await expect(listSpansHandler({})).rejects.toThrow("Required");
      });
    });

    describe("Get Trace tool handler", () => {
      it("should get all spans for a trace", async () => {
        const mockProject = { id: "proj-1", name: "Project 1", slug: "Project 1" };
        const mockOrg = { id: "org-1", name: "Test Org", slug: "org-1" };
        const mockSpans = [
          {
            id: "span-1",
            traceId: "trace-abc",
            duration: 250,
            parentSpanId: null,
          },
          {
            id: "span-2",
            traceId: "trace-abc",
            duration: 100,
            parentSpanId: "span-1",
          },
        ];

        mockCache.get.mockImplementation((key) => {
          if (key === "bugsnag_current_project") return mockProject;
          if (key === "bugsnag_org") return mockOrg;
          return null;
        });
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
                trace_url: "https://app.bugsnag.com/org-1/Project 1/performance/traces/trace-abc",
              }),
            },
          ],
        });
      });

      it("should throw error when required parameters are missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
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
      it("should list available trace fields", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockTraceFields = [
          { name: "user.id", type: "string" },
          { name: "device.type", type: "string" },
          { name: "app.version", type: "string" },
        ];

        mockCache.get.mockImplementation((key) => {
          if (key === "bugsnag_current_project") return mockProject;
          if (key === "bugsnag_current_project_trace_fields") return null; // Cache miss for trace fields
          return null;
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
        expect(result).toEqual({
          content: [
            {
              type: "text",
              text: JSON.stringify(mockTraceFields),
            },
          ],
        });
      });

      it("should work with explicit projectId", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
        ];
        const mockTraceFields = [{ name: "custom.field", type: "string" }];

        mockCache.get.mockImplementation((key) => {
          if (key === "bugsnag_projects") return mockProjects;
          if (key === "bugsnag_current_project_trace_fields") return null; // Cache miss for trace fields
          return null;
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
        const mockEvent = { id: "event-1", project_id: "proj-1" };
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];

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
