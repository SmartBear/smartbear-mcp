import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseAPI } from "../../../bugsnag/client/api/base.js";
import type { ProjectAPI } from "../../../bugsnag/client/api/Project.js";
import type {
  CurrentUserAPI,
  ErrorAPI,
} from "../../../bugsnag/client/index.js";
import { BugsnagClient } from "../../../bugsnag/client.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info.js";

// Mock the dependencies
const mockCurrentUserAPI = {
  listUserOrganizations: vi.fn(),
  getOrganizationProjects: vi.fn(),
} satisfies Omit<CurrentUserAPI, keyof BaseAPI>;

const mockErrorAPI = {
  viewErrorOnProject: vi.fn(),
  getLatestEventOnProject: vi.fn(),
  viewEventById: vi.fn(),
  listProjectErrors: vi.fn(),
  updateErrorOnProject: vi.fn(),
  listErrorPivots: vi.fn(),
} satisfies Omit<ErrorAPI, keyof BaseAPI>;

const mockProjectAPI = {
  listProjectEventFields: vi.fn(),
  createProject: vi.fn(),
  listBuilds: vi.fn(),
  getBuild: vi.fn(),
  listReleases: vi.fn(),
  getRelease: vi.fn(),
  listBuildsInRelease: vi.fn(),
} satisfies Omit<ProjectAPI, keyof BaseAPI>;

const mockCache = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

vi.mock("../../../bugsnag/client/index.js", () => ({
  CurrentUserAPI: vi.fn().mockImplementation(() => mockCurrentUserAPI),
  ErrorAPI: vi.fn().mockImplementation(() => mockErrorAPI),
  Configuration: vi.fn().mockImplementation((config) => config),
}));

vi.mock("../../../bugsnag/client/api/Project.js", () => ({
  ProjectAPI: vi.fn().mockImplementation(() => mockProjectAPI),
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

describe("BugsnagClient", () => {
  let client: BugsnagClient;

  beforeEach(() => {
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

    client = new BugsnagClient("test-token");
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
    it("should create client instance with proper dependencies", () => {
      const client = new BugsnagClient("test-token");
      expect(client).toBeInstanceOf(BugsnagClient);
    });

    it("should configure endpoints correctly during construction", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);

      new BugsnagClient("test-token", "00000hub-key");

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: "https://api.bugsnag.smartbear.com",
          authToken: "test-token",
          headers: expect.objectContaining({
            "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
            "Content-Type": "application/json",
            "X-Bugsnag-API": "true",
            "X-Version": "2",
          }),
        }),
      );
    });

    it("should set project API key when provided", () => {
      const client = new BugsnagClient("test-token", "test-project-key");
      expect(client).toBeInstanceOf(BugsnagClient);
    });
  });

  describe("getEndpoint method", () => {
    let client: BugsnagClient;

    beforeEach(() => {
      client = new BugsnagClient("test-token");
    });

    describe("without custom endpoint", () => {
      describe("with Hub API key (00000 prefix)", () => {
        it("should return Hub domain for api subdomain", () => {
          const result = client.getEndpoint("api", "00000hub-key");
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should return Hub domain for app subdomain", () => {
          const result = client.getEndpoint("app", "00000test-key");
          expect(result).toBe("https://app.bugsnag.smartbear.com");
        });

        it("should return Hub domain for custom subdomain", () => {
          const result = client.getEndpoint("custom", "00000key");
          expect(result).toBe("https://custom.bugsnag.smartbear.com");
        });

        it("should handle empty string after prefix", () => {
          const result = client.getEndpoint("api", "00000");
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });
      });

      describe("with regular API key (non-Hub)", () => {
        it("should return Bugsnag domain for api subdomain", () => {
          const result = client.getEndpoint("api", "regular-key");
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain for app subdomain", () => {
          const result = client.getEndpoint("app", "abc123def");
          expect(result).toBe("https://app.bugsnag.com");
        });

        it("should return Bugsnag domain for custom subdomain", () => {
          const result = client.getEndpoint("custom", "test-key-123");
          expect(result).toBe("https://custom.bugsnag.com");
        });

        it("should handle API key with 00000 in middle", () => {
          const result = client.getEndpoint("api", "key-00000-middle");
          expect(result).toBe("https://api.bugsnag.com");
        });
      });

      describe("without API key", () => {
        it("should return Bugsnag domain when API key is undefined", () => {
          const result = client.getEndpoint("api", undefined);
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain when API key is empty string", () => {
          const result = client.getEndpoint("api", "");
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should return Bugsnag domain when API key is null", () => {
          const result = client.getEndpoint("api", null as any);
          expect(result).toBe("https://api.bugsnag.com");
        });
      });
    });

    describe("with custom endpoint", () => {
      describe("Hub domain endpoints (always normalized)", () => {
        it("should normalize to HTTPS subdomain for exact hub domain match", () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://api.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize to HTTPS subdomain regardless of input protocol", () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "http://app.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize to HTTPS subdomain regardless of input subdomain", () => {
          const result = client.getEndpoint(
            "app",
            "00000key",
            "https://api.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://app.bugsnag.smartbear.com");
        });

        it("should normalize hub domain with port", () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://custom.bugsnag.smartbear.com:8080",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize hub domain with path", () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://custom.bugsnag.smartbear.com/path",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });

        it("should normalize complex subdomains to standard format", () => {
          const result = client.getEndpoint(
            "api",
            "00000key",
            "https://staging.app.bugsnag.smartbear.com",
          );
          expect(result).toBe("https://api.bugsnag.smartbear.com");
        });
      });

      describe("Bugsnag domain endpoints (always normalized)", () => {
        it("should normalize to HTTPS subdomain for exact bugsnag domain match", () => {
          const result = client.getEndpoint(
            "api",
            "regular-key",
            "https://api.bugsnag.com",
          );
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should normalize to HTTPS subdomain regardless of input protocol", () => {
          const result = client.getEndpoint(
            "api",
            "regular-key",
            "http://app.bugsnag.com",
          );
          expect(result).toBe("https://api.bugsnag.com");
        });

        it("should normalize bugsnag domain with port", () => {
          const result = client.getEndpoint(
            "app",
            "regular-key",
            "https://api.bugsnag.com:9000",
          );
          expect(result).toBe("https://app.bugsnag.com");
        });

        it("should normalize bugsnag domain with path", () => {
          const result = client.getEndpoint(
            "app",
            "regular-key",
            "https://api.bugsnag.com/v2",
          );
          expect(result).toBe("https://app.bugsnag.com");
        });
      });

      describe("Custom domain endpoints (used as-is)", () => {
        it("should return custom endpoint exactly as provided", () => {
          const customEndpoint = "https://custom.api.com";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should return custom endpoint as-is regardless of API key type", () => {
          const customEndpoint = "https://my-custom-domain.com/api";
          const result = client.getEndpoint(
            "api",
            "regular-key",
            customEndpoint,
          );
          expect(result).toBe(customEndpoint);
        });

        it("should preserve HTTP protocol for custom domains", () => {
          const customEndpoint = "http://localhost:3000";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with ports and paths", () => {
          const customEndpoint = "https://192.168.1.100:8080/api/v1";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with query parameters", () => {
          const customEndpoint = "https://custom.domain.com/api?version=1";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should preserve custom domain with fragments", () => {
          const customEndpoint = "https://custom.domain.com/api#section";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });
      });

      describe("edge cases", () => {
        it("should handle malformed custom endpoints gracefully", () => {
          // This should throw due to invalid URL, which is expected behavior
          expect(() => {
            client.getEndpoint("api", "00000key", "not-a-valid-url");
          }).toThrow();
        });

        it("should preserve custom endpoints with userinfo", () => {
          const customEndpoint = "https://user:pass@custom.domain.com";
          const result = client.getEndpoint("api", "00000key", customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it("should normalize known domains even with userinfo", () => {
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
      it("should handle empty subdomain", () => {
        const result = client.getEndpoint("", "00000key");
        expect(result).toBe("https://.bugsnag.smartbear.com");
      });

      it("should handle subdomain with special characters", () => {
        const result = client.getEndpoint("test-api_v2", "00000key");
        expect(result).toBe("https://test-api_v2.bugsnag.smartbear.com");
      });

      it("should handle numeric subdomain", () => {
        const result = client.getEndpoint("v1", "regular-key");
        expect(result).toBe("https://v1.bugsnag.com");
      });

      it("should handle very long subdomains", () => {
        const longSubdomain = "very-long-subdomain-name-with-many-characters";
        const result = client.getEndpoint(longSubdomain, "00000key");
        expect(result).toBe(`https://${longSubdomain}.bugsnag.smartbear.com`);
      });
    });
  });

  describe("static utility methods", () => {
    // Test static methods if they exist in the class
    it("should have proper class structure", () => {
      const client = new BugsnagClient("test-token");

      // Verify the client has expected methods
      expect(typeof client.initialize).toBe("function");
      expect(typeof client.registerTools).toBe("function");
      expect(typeof client.registerResources).toBe("function");
    });
  });

  describe("error handling", () => {
    it("should handle invalid tokens gracefully during construction", () => {
      expect(() => {
        new BugsnagClient("");
      }).not.toThrow();

      expect(() => {
        new BugsnagClient("   ");
      }).not.toThrow();
    });

    it("should handle special characters in project API key", () => {
      expect(() => {
        new BugsnagClient("test-token", "00000-special!@#$%^&*()");
      }).not.toThrow();
    });
  });

  describe("configuration validation", () => {
    it("should pass correct authToken to Configuration", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);
      const testToken = "super-secret-token-123";

      new BugsnagClient(testToken);

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: testToken,
        }),
      );
    });

    it("should include all required headers", async () => {
      const { Configuration } = await import(
        "../../../bugsnag/client/index.js"
      );
      const MockedConfiguration = vi.mocked(Configuration);

      new BugsnagClient("test-token");

      const configCall = MockedConfiguration.mock.calls[0][0];
      expect(configCall.headers).toEqual({
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      });
    });
  });

  describe("API client initialization", () => {
    it("should initialize all required API clients", async () => {
      const { CurrentUserAPI, ErrorAPI } = await import(
        "../../../bugsnag/client/index.js"
      );
      const { ProjectAPI } = await import(
        "../../../bugsnag/client/api/Project.js"
      );

      const MockedCurrentUserAPI = vi.mocked(CurrentUserAPI);
      const MockedErrorAPI = vi.mocked(ErrorAPI);
      const MockedProjectAPI = vi.mocked(ProjectAPI);

      // Clear previous calls from beforeEach and other tests
      MockedCurrentUserAPI.mockClear();
      MockedErrorAPI.mockClear();
      MockedProjectAPI.mockClear();

      new BugsnagClient("test-token");

      expect(MockedCurrentUserAPI).toHaveBeenCalledOnce();
      expect(MockedErrorAPI).toHaveBeenCalledOnce();
      expect(MockedProjectAPI).toHaveBeenCalledOnce();
    });

    it("should initialize NodeCache", async () => {
      const NodeCacheModule = await import("node-cache");
      const MockedNodeCache = vi.mocked(NodeCacheModule.default);

      // Clear previous calls from beforeEach
      MockedNodeCache.mockClear();

      new BugsnagClient("test-token");

      expect(MockedNodeCache).toHaveBeenCalledOnce();
    });
  });

  describe("initialization", () => {
    it("should initialize successfully with organizations and projects", async () => {
      const mockOrg = { id: "org-1", name: "Test Org" };
      const mockProjects = [
        { id: "proj-1", name: "Project 1", api_key: "key1" },
        { id: "proj-2", name: "Project 2", api_key: "key2" },
      ];

      mockCache.get
        .mockReturnValueOnce(null) // No current projects
        .mockReturnValueOnce(null) // No cached projects
        .mockReturnValueOnce(null); // No cached organization
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({
        body: [mockOrg],
      });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({
        body: mockProjects,
      });

      await client.initialize();

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
      const clientWithApiKey = new BugsnagClient(
        "test-token",
        "project-api-key",
      );
      const mockProjects = [
        { id: "proj-1", name: "Project 1", api_key: "project-api-key" },
        { id: "proj-2", name: "Project 2", api_key: "other-key" },
      ];
      const mockEventFields = [
        { display_id: "user.email", custom: false },
        { display_id: "error.status", custom: false },
        { display_id: "search", custom: false }, // This should be filtered out
      ];

      mockCache.get
        .mockReturnValueOnce(mockProjects)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockProjects);
      mockProjectAPI.listProjectEventFields.mockResolvedValue({
        body: mockEventFields,
      });

      await clientWithApiKey.initialize();

      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_current_project",
        mockProjects[0],
      );
      expect(mockProjectAPI.listProjectEventFields).toHaveBeenCalledWith(
        "proj-1",
      );

      // // Verify that 'search' field is filtered out
      const filteredFields = mockEventFields.filter(
        (field) => field.display_id !== "search",
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "bugsnag_current_project_event_filters",
        filteredFields,
      );
    });

    it("should not throw error when no organizations found", async () => {
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [] });

      await expect(client.initialize()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Unable to connect to BugSnag APIs, the BugSnag tools will not work. Check your configured BugSnag auth token.",
        expect.any(Error),
      );
    });

    it("should not throw error when project with API key not found", async () => {
      const clientWithApiKey = new BugsnagClient(
        "test-token",
        "non-existent-key",
      );
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

      await expect(clientWithApiKey.initialize()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. Check your configured BugSnag project API key.",
        expect.any(Error),
      );
    });

    it("should throw error when no event fields found for project", async () => {
      const clientWithApiKey = new BugsnagClient(
        "test-token",
        "project-api-key",
      );
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

      await expect(clientWithApiKey.initialize()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Unable to find your configured BugSnag project, the BugSnag tools will continue to work across all projects in your organization. Check your configured BugSnag project API key.",
        expect.any(Error),
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

    describe("listBuilds", () => {
      const build = {
        id: "rel-1",
        release_time: "2023-01-01T00:00:00Z",
        app_version: "1.0.0",
        release_stage: { name: "production" },
        source_control: {
          service: "github",
          commit_url: "https://github.com/org/repo/commit/abc123",
          revision: "abc123",
          diff_url_to_previous:
            "https://github.com/org/repo/compare/previous...abc123",
        },
        total_sessions_count: 100,
        unhandled_sessions_count: 10,
        accumulative_daily_users_seen: 5,
        accumulative_daily_users_with_unhandled: 1,
      };

      it("should return builds at stability target", async () => {
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: [build],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.75,
          },
          critical_stability: {
            value: 0.5,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listBuilds("proj-1", {
          release_stage: "production",
        });

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith("proj-1", {
          release_stage: "production",
        });

        expect(result?.body?.[0]).toEqual({
          ...build,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.75,
          critical_stability: 0.5,
          meets_target_stability: true,
          meets_critical_stability: true,
          stability_target_type: "user",
        });
      });

      it("should return builds under stability target", async () => {
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: [build],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.9,
          },
          critical_stability: {
            value: 0.5,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listBuilds("proj-1", {
          release_stage: "production",
        });

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith("proj-1", {
          release_stage: "production",
        });
        expect(result?.body?.[0]).toEqual({
          ...build,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.9,
          critical_stability: 0.5,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        });
      });

      it("should return builds under critical stability", async () => {
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: [build],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.9,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listBuilds("proj-1", {
          release_stage: "production",
        });

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith("proj-1", {
          release_stage: "production",
        });

        expect(result?.body?.[0]).toEqual({
          ...build,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.9,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: false,
          stability_target_type: "user",
        });
      });

      it("should return empty array when no builds found", async () => {
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: null,
          headers: new Headers(),
          status: 200,
        });

        const result = await client.listBuilds("proj-1", {});

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith("proj-1", {});
        expect(result.body).toEqual([]);
      });

      it("should throw error when project not found", async () => {
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: [build],
          headers: new Headers(),
          status: 200,
        });
        client.getProject = vi.fn().mockResolvedValue(null);

        await expect(client.listBuilds("proj-1", {})).rejects.toThrowError(
          "Project with ID proj-1 not found.",
        );

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith("proj-1", {});
      });
    });

    describe("getBuild", () => {
      const build = {
        id: "rel-1",
        release_time: "2023-01-01T00:00:00Z",
        app_version: "1.0.0",
        release_stage: { name: "production" },
        source_control: {
          service: "github",
          commit_url: "https://github.com/org/repo/commit/abc123",
          revision: "abc123",
          diff_url_to_previous:
            "https://github.com/org/repo/compare/previous...abc123",
        },
        total_sessions_count: 100,
        unhandled_sessions_count: 10,
        accumulative_daily_users_seen: 5,
        accumulative_daily_users_with_unhandled: 1,
      };

      it("should return build from API", async () => {
        mockProjectAPI.getBuild.mockResolvedValue({
          body: build,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.95,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "session" as const,
        };
        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.getBuild("proj-1", "rel-1");

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith("proj-1", "rel-1");
        expect(result.body).toEqual({
          ...build,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.95,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "session",
        });
      });

      // Test for division by zero case for user stability
      it("should handle zero accumulative_daily_users_seen", async () => {
        const zeroBuild = {
          ...build,
          accumulative_daily_users_seen: 0,
          accumulative_daily_users_with_unhandled: 0,
        };

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.95,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "user" as const,
        };
        client.getProject = vi.fn().mockResolvedValue(mockProject);

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: zeroBuild,
        });

        const result = await client.getBuild("proj-1", "rel-2");

        expect(result?.body?.user_stability).toBe(0);
        expect(result?.body?.meets_target_stability).toBe(false);
        expect(result?.body?.meets_critical_stability).toBe(false);
      });

      // Test for division by zero case for session stability
      it("should handle zero total_sessions_count", async () => {
        const zeroBuild = {
          ...build,
          total_sessions_count: 0,
        };

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.95,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "session" as const,
        };
        client.getProject = vi.fn().mockResolvedValue(mockProject);

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: zeroBuild,
        });

        const result = await client.getBuild("proj-1", "rel-2");

        expect(result?.body?.session_stability).toBe(0);
        expect(result?.body?.meets_target_stability).toBe(false);
        expect(result?.body?.meets_critical_stability).toBe(false);
      });

      it("should return null when build not found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({ body: null });

        await expect(
          client.getBuild("proj-1", "non-existent-build-id"),
        ).rejects.toThrow("No build for non-existent-build-id found.");

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "non-existent-build-id",
        );
      });

      it("should throw error when project not found", async () => {
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({ body: build });
        client.getProject = vi.fn().mockResolvedValue(null);

        await expect(
          client.getBuild("proj-1", "non-existent-build-id"),
        ).rejects.toThrow("Project with ID proj-1 not found.");

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "non-existent-build-id",
        );
      });
    });

    describe("listReleases", () => {
      const release = {
        id: "rel-group-1",
        release_stage_name: "production",
        app_version: "1.0.0",
        first_released_at: "2023-01-01T00:00:00Z",
        first_release_id: "build-1",
        releases_count: 2,
        visible: true,
        sessions_count_in_last_24h: 20,
        total_sessions_count: 100,
        unhandled_sessions_count: 10,
        accumulative_daily_users_seen: 5,
        accumulative_daily_users_with_unhandled: 1,
      };

      it("should return builds at stability target", async () => {
        mockProjectAPI.listReleases.mockResolvedValue({
          body: [release],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.75,
          },
          critical_stability: {
            value: 0.5,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listReleases("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });
        expect(result?.body?.[0]).toEqual({
          ...release,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.75,
          critical_stability: 0.5,
          meets_target_stability: true,
          meets_critical_stability: true,
          stability_target_type: "user",
        });
      });

      it("should return releases under stability target", async () => {
        mockProjectAPI.listReleases.mockResolvedValue({
          body: [release],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.9,
          },
          critical_stability: {
            value: 0.5,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listReleases("proj-1", {
          release_stage_name: "testing",
          visible_only: false,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {
          release_stage_name: "testing",
          visible_only: false,
        });

        expect(result?.body?.[0]).toEqual({
          ...release,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.9,
          critical_stability: 0.5,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        });
      });

      it("should return releases under critical stability", async () => {
        mockProjectAPI.listReleases.mockResolvedValue({
          body: [release],
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.9,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "user" as const,
        };

        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listReleases("proj-1", {});

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {});
        expect(result?.body?.[0]).toEqual({
          ...release,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.9,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: false,
          stability_target_type: "user",
        });
      });

      it("should return empty array when no releases found", async () => {
        mockProjectAPI.listReleases.mockResolvedValue({
          body: null,
          headers: new Headers(),
          status: 200,
        });

        const result = await client.listReleases("proj-1", {});

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {});
        expect(result.body).toEqual([]);
      });

      it("should throw error when project not found", async () => {
        mockProjectAPI.listReleases.mockResolvedValue({
          body: [release],
          headers: new Headers(),
          status: 200,
        });
        client.getProject = vi.fn().mockResolvedValue(null);

        await expect(client.listReleases("proj-1", {})).rejects.toThrowError(
          "Project with ID proj-1 not found.",
        );

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {});
      });
    });

    describe("getRelease", () => {
      const release = {
        id: "rel-group-1",
        project_id: "proj-1",
        release_stage_name: "production",
        app_version: "1.0.0",
        first_released_at: "2023-01-01T00:00:00Z",
        first_release_id: "build-1",
        releases_count: 2,
        has_secondary_versions: false,
        build_tool: "gradle",
        builder_name: "CI",
        source_control: {
          service: "github",
          commit_url: "https://github.com/org/repo/commit/abc123",
          revision: "abc123",
          diff_url_to_previous:
            "https://github.com/org/repo/compare/previous...abc123",
        },
        top_release_group: true,
        visible: true,
        total_sessions_count: 100,
        unhandled_sessions_count: 10,
        sessions_count_in_last_24h: 20,
        accumulative_daily_users_seen: 5,
        accumulative_daily_users_with_unhandled: 1,
      };

      it("should return release from API", async () => {
        mockProjectAPI.getRelease.mockResolvedValue({
          body: release,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.95,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "session" as const,
        };
        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.getRelease("proj-1", "rel-1");

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith("rel-1");
        expect(result.body).toEqual({
          ...release,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.95,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "session",
        });
      });

      it("should return null when release not found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({ body: null });

        await expect(
          client.getRelease("proj-1", "non-existent-release-id"),
        ).rejects.toThrow("No release for non-existent-release-id found.");

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "non-existent-release-id",
        );
      });

      it("should throw error when project not found", async () => {
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({ body: release });
        client.getProject = vi.fn().mockResolvedValue(null);

        await expect(
          client.getRelease("proj-1", "non-existent-release-id"),
        ).rejects.toThrow("Project with ID proj-1 not found.");

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "non-existent-release-id",
        );
      });
    });

    describe("listBuildsInRelease", () => {
      const mockBuildsInRelease = [
        {
          id: "build-1",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.0",
          total_sessions_count: 100,
          unhandled_sessions_count: 10,
          accumulative_daily_users_seen: 5,
          accumulative_daily_users_with_unhandled: 1,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.95,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "session",
        },
        {
          id: "build-2",
          release_time: "2023-01-02T00:00:00Z",
          app_version: "1.0.0",
          total_sessions_count: 100,
          unhandled_sessions_count: 10,
          accumulative_daily_users_seen: 5,
          accumulative_daily_users_with_unhandled: 1,
          session_stability: 0.9,
          user_stability: 0.8,
          target_stability: 0.95,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "session",
        },
      ];
      it("should return builds in release from API when not cached", async () => {
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
          headers: new Headers(),
          status: 200,
        });

        const mockProject = {
          id: "proj-1",
          target_stability: {
            value: 0.95,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "session" as const,
        };
        client.getProject = vi.fn().mockResolvedValue(mockProject);

        const result = await client.listBuildsInRelease(
          "proj-1",
          "rel-group-1",
        );

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1",
        );
        expect(result.body).toEqual(mockBuildsInRelease);
      });

      it("should return empty array when no builds in release found", async () => {
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: null,
          headers: new Headers(),
          status: 200,
        });

        const result = await client.listBuildsInRelease(
          "proj-1",
          "rel-group-1",
        );

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1",
        );
        expect(result.body).toEqual([]);
      });

      it("should throw error when project not found", async () => {
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
          headers: new Headers(),
          status: 200,
        });

        client.getProject = vi.fn().mockResolvedValue(null);

        await expect(
          client.listBuildsInRelease("proj-1", "rel-group-1"),
        ).rejects.toThrow("Project with ID proj-1 not found.");
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

    it("should register list_projects tool when no project API key", () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      expect(registerToolsSpy).toBeCalledWith(
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("should not register list_projects tool when project API key is provided", () => {
      const clientWithApiKey = new BugsnagClient(
        "test-token",
        "project-api-key",
      );
      clientWithApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map(
        (call: any) => call[0].title,
      );
      expect(registeredTools).not.toContain("List Projects");
    });

    it("should register common tools regardless of project API key", () => {
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
    });
  });

  describe("resource registration", () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    it("should register event resource", () => {
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

    describe("list_projects tool handler", () => {
      it("should return projects with pagination", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
          { id: "proj-3", name: "Project 3" },
        ];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ pageSize: 2, page: 1 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should return all projects when no pagination specified", async () => {
        const mockProjects = [{ id: "proj-1", name: "Project 1" }];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
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

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe("No projects found.");
      });

      it("should handle pagination with only page_size", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
          { id: "proj-3", name: "Project 3" },
        ];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ pageSize: 2 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it("should handle pagination with only page", async () => {
        const mockProjects = Array.from({ length: 25 }, (_, i) => ({
          id: `proj-${i + 1}`,
          name: `Project ${i + 1}`,
        }));
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Projects",
        )[1];

        const result = await toolHandler({ page: 2 });

        // Default page_size is 10, so page 2 should return projects 10-19
        const expectedResult = {
          data: mockProjects.slice(10, 20),
          count: 10,
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });
    });

    describe("get_error tool handler", () => {
      it("should get error details with project from cache", async () => {
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          slug: "my-project",
        };
        const mockError = { id: "error-1", message: "Test error" };
        const mockOrg = { id: "org-1", name: "Test Org", slug: "test-org" };
        const mockEvent = { id: "event-1", timestamp: "2023-01-01" };
        const mockPivots = [{ id: "pivot-1", name: "test-pivot" }];

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({ body: mockError });
        mockErrorAPI.getLatestEventOnProject.mockResolvedValue({
          body: mockEvent,
        });
        mockErrorAPI.listErrorPivots.mockResolvedValue({ body: mockPivots });

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
            latest_event: mockEvent,
            pivots: mockPivots,
            url: `https://app.bugsnag.com/${mockOrg.slug}/${mockProject.slug}/errors/error-1${encodedQueryString}`,
          }),
        );
      });

      it("should throw error when projectId is not set", async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Error",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      });

      it("should throw error when error ID is not set", async () => {
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          slug: "my-project",
        };
        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Error",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "Both projectId and errorId arguments are required",
        );
      });
    });

    describe("get_bugsnag_event_details tool handler", () => {
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

    describe("list_project_errors tool handler", () => {
      it("should list project errors with supplied parameters", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockEventFields = [
          { display_id: "error.status", custom: false },
          { display_id: "user.email", custom: false },
          { display_id: "event.since", custom: false },
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

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith("proj-1", {
          filters,
          sort: "last_seen",
          direction: "desc",
          per_page: 50,
        });
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
          { display_id: "error.status", custom: false },
          { display_id: "user.email", custom: false },
          { display_id: "event.since", custom: false },
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

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith("proj-1", {
          filters: defaultFilters,
          sort: "last_seen",
          direction: "desc",
          per_page: 50,
        });
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
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Project Errors",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key.",
        );
      });
    });

    describe("get_project_event_filters tool handler", () => {
      it("should return cached event fields", async () => {
        const mockEventFields = [
          { display_id: "error.status", custom: false },
          { display_id: "user.email", custom: false },
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

    describe("get_build tool handler", () => {
      it("should get build details", async () => {
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          target_stability: {
            value: 0.995,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "user" as const,
        };
        const mockBuild = {
          id: "rel-1",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.0",
          release_stage: { name: "production" },
          source_control: {
            service: "github",
            commit_url: "https://github.com/org/repo/commit/abc123",
            revision: "abc123",
            diff_url_to_previous:
              "https://github.com/org/repo/compare/previous...abc123",
          },
          errors_introduced_count: 5,
          errors_seen_count: 10,
          total_sessions_count: 100,
          unhandled_sessions_count: 10,
          accumulative_daily_users_seen: 50,
          accumulative_daily_users_with_unhandled: 5,
        };
        const enhancedBuild = {
          ...mockBuild,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        };

        // First get for the project, second for cached build (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce([mockProject]);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({ buildId: "rel-1" });

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith("proj-1", "rel-1");
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should get build with explicit project ID", async () => {
        const mockProjects = [
          {
            id: "proj-1",
            name: "Project 1",
            target_stability: {
              value: 0.995,
            },
            critical_stability: {
              value: 0.85,
            },
            stability_target_type: "user" as const,
          },
          { id: "proj-2", name: "Project 2" },
        ];
        const mockBuild = {
          id: "rel-1",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.0",
          release_stage: { name: "production" },
          total_sessions_count: 50,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 30,
          accumulative_daily_users_with_unhandled: 3,
        };

        const enhancedBuild = {
          ...mockBuild,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        };

        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        const result = await toolHandler({
          projectId: "proj-1",
          buildId: "rel-1",
        });

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith("proj-1", "rel-1");
        expect(result.content[0].text).toBe(JSON.stringify(enhancedBuild));
      });

      it("should throw error when build not found", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce([mockProject]);
        mockProjectAPI.getBuild.mockResolvedValue({ body: null });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        await expect(
          toolHandler({ buildId: "non-existent-release-id" }),
        ).rejects.toThrow("No build for non-existent-release-id found.");
      });

      it("should throw error when buildId argument is missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "buildId argument is required",
        );
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

    describe("list_releases tool handler", () => {
      it("should list releases with project from cache", async () => {
        const mockProject = {
          id: "proj-1",
          name: "Project 1",
          target_stability: {
            value: 0.995,
          },
          critical_stability: {
            value: 0.85,
          },
          stability_target_type: "user" as const,
        };
        const mockReleases = [
          {
            id: "rel-group-1",
            release_stage_name: "production",
            app_version: "1.0.0",
            first_released_at: "2023-01-01T00:00:00Z",
            total_sessions_count: 50,
            unhandled_sessions_count: 5,
            accumulative_daily_users_seen: 30,
            accumulative_daily_users_with_unhandled: 3,
          },
        ];

        const enhancedReleases = mockReleases.map((release) => ({
          ...release,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        }));

        // Mock project cache to return the project
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce([mockProject]);
        mockProjectAPI.listReleases.mockResolvedValue({
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

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });
        expect(result.content[0].text).toBe(
          JSON.stringify({ data: enhancedReleases, data_count: 1 }),
        );
      });

      it("should list releases with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          {
            id: "proj-2",
            name: "Project 2",
            target_stability: {
              value: 0.995,
            },
            critical_stability: {
              value: 0.85,
            },
            stability_target_type: "user" as const,
          },
        ];
        const mockReleases = [
          {
            id: "rel-group-2",
            release_stage_name: "staging",
            app_version: "1.0.0",
            total_sessions_count: 50,
            unhandled_sessions_count: 5,
            accumulative_daily_users_seen: 30,
            accumulative_daily_users_with_unhandled: 3,
          },
        ];

        const enhancedReleases = mockReleases.map((release) => ({
          ...release,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        }));

        // Mock projects cache to return the projects list
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.listReleases.mockResolvedValue({
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

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-2", {
          release_stage_name: "staging",
          visible_only: false,
        });
        expect(result.content[0].text).toBe(
          JSON.stringify({ data: enhancedReleases, data_count: 1 }),
        );
      });

      it("should handle empty releases list", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        // Mock project cache to return the project
        mockCache.get.mockReturnValueOnce(mockProject);
        mockProjectAPI.listReleases.mockResolvedValue({ body: [] });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases",
        )[1];

        const result = await toolHandler({
          releaseStage: "production",
          visibleOnly: true,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });
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

    describe("get_release tool handler", () => {
      it("should get release with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          {
            id: "proj-2",
            name: "Project 2",
            target_stability: {
              value: 0.995,
            },
            critical_stability: {
              value: 0.85,
            },
            stability_target_type: "user" as const,
          },
        ];
        const mockRelease = {
          id: "rel-group-2",
          project_id: "proj-2",
          release_stage_name: "staging",
          app_version: "1.0.0",
          first_released_at: "2023-01-01T00:00:00Z",
          total_sessions_count: 50,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 30,
          accumulative_daily_users_with_unhandled: 3,
        };

        const enhancedRelease = {
          ...mockRelease,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        };

        const mockBuildsInRelease = [
          {
            id: "build-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
            total_sessions_count: 100,
            unhandled_sessions_count: 10,
            accumulative_daily_users_seen: 5,
            accumulative_daily_users_with_unhandled: 1,
          },
        ];

        const enhancedBuildsInRelease = [
          {
            ...mockBuildsInRelease[0],
            user_stability: 0.8,
            session_stability: 0.9,
            stability_target_type: "user",
            target_stability: 0.995,
            critical_stability: 0.85,
            meets_target_stability: false,
            meets_critical_stability: false,
          },
        ];

        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(mockProjects);
        mockProjectAPI.getRelease.mockResolvedValue({
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

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith("rel-group-2");
        expect(result.content[0].text).toBe(
          JSON.stringify({
            release: enhancedRelease,
            builds: enhancedBuildsInRelease,
          }),
        );
      });

      it("should throw error when release not found", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({ body: null });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release",
        )[1];

        await expect(
          toolHandler({ releaseId: "non-existent-release-id" }),
        ).rejects.toThrow("No release for non-existent-release-id found.");
      });

      it("should throw error when releaseId argument is missing", async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release",
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "releaseId argument is required",
        );
      });
    });

    describe("update_error tool handler", () => {
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
  });

  describe("resource handlers", () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    describe("bugsnag_event resource handler", () => {
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
