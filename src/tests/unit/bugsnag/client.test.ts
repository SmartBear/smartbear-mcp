import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../../../common/info.js';
import { BugsnagClient } from '../../../bugsnag/client.js';
import { BaseAPI } from '../../../bugsnag/client/api/base.js';
import { ProjectAPI } from '../../../bugsnag/client/api/Project.js';
import { CurrentUserAPI, ErrorAPI } from '../../../bugsnag/client/index.js';

// Mock the dependencies
const mockCurrentUserAPI = {
  listUserOrganizations: vi.fn(),
  getOrganizationProjects: vi.fn()
} satisfies Omit<CurrentUserAPI, keyof BaseAPI>;

const mockErrorAPI = {
  viewErrorOnProject: vi.fn(),
  viewLatestEventOnError: vi.fn(),
  viewEventById: vi.fn(),
  listProjectErrors: vi.fn(),
  updateErrorOnProject: vi.fn(),
  listErrorPivots: vi.fn(),
  listEventsOnProject: vi.fn()
} satisfies Omit<ErrorAPI, keyof BaseAPI>;

const mockProjectAPI = {
  listProjectEventFields: vi.fn(),
  createProject: vi.fn(),
  listBuilds: vi.fn(),
  getBuild: vi.fn(),
  listReleases: vi.fn(),
  getRelease: vi.fn(),
  listBuildsInRelease: vi.fn(),
  getProjectStabilityTargets: vi.fn().mockResolvedValue({
      target_stability: {
          value: 0.995,
          updated_at: "2023-01-01",
          updated_by_id: "user-1",
      },
      critical_stability: {
          value: 0.85,
          updated_at: "2023-01-01",
          updated_by_id: "user-1",
      },
      stability_target_type: "user" as const,
  }),
} satisfies Omit<ProjectAPI, keyof BaseAPI>;

const mockCache = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn()
};

vi.mock('../../../bugsnag/client/index.js', () => ({
  CurrentUserAPI: vi.fn().mockImplementation(() => mockCurrentUserAPI),
  ErrorAPI: vi.fn().mockImplementation(() => mockErrorAPI),
  Configuration: vi.fn().mockImplementation((config) => config)
}));

vi.mock('../../../bugsnag/client/api/Project.js', () => ({
  ProjectAPI: vi.fn().mockImplementation(() => mockProjectAPI)
}));

vi.mock('node-cache', () => ({
  default: vi.fn().mockImplementation(() => mockCache)
}));

vi.mock('../../../common/bugsnag.js', () => ({
  default: {
    notify: vi.fn()
  }
}));

describe('BugsnagClient', () => {
  let client: BugsnagClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to ensure no persistent return values affect tests
    mockCache.get.mockReset();
    mockCache.set.mockReset();
    mockCache.del.mockReset();
    client = new BugsnagClient('test-token');
  });

  describe('constructor', () => {
    it('should create client instance with proper dependencies', () => {
      const client = new BugsnagClient('test-token');
      expect(client).toBeInstanceOf(BugsnagClient);
    });

    it('should configure endpoints correctly during construction', async () => {
      const { Configuration } = await import('../../../bugsnag/client/index.js');
      const MockedConfiguration = vi.mocked(Configuration);

      new BugsnagClient('test-token', '00000hub-key');

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: 'https://api.bugsnag.smartbear.com',
          authToken: 'test-token',
          headers: expect.objectContaining({
            'User-Agent': `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
            'Content-Type': 'application/json',
            'X-Bugsnag-API': 'true',
            'X-Version': '2'
          })
        })
      );
    });

    it('should set project API key when provided', () => {
      const client = new BugsnagClient('test-token', 'test-project-key');
      expect(client).toBeInstanceOf(BugsnagClient);
    });
  });

  describe('getEndpoint method', () => {
    let client: BugsnagClient;

    beforeEach(() => {
      client = new BugsnagClient('test-token');
    });

    describe('without custom endpoint', () => {
      describe('with Hub API key (00000 prefix)', () => {
        it('should return Hub domain for api subdomain', () => {
          const result = client.getEndpoint('api', '00000hub-key');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });

        it('should return Hub domain for app subdomain', () => {
          const result = client.getEndpoint('app', '00000test-key');
          expect(result).toBe('https://app.bugsnag.smartbear.com');
        });

        it('should return Hub domain for custom subdomain', () => {
          const result = client.getEndpoint('custom', '00000key');
          expect(result).toBe('https://custom.bugsnag.smartbear.com');
        });

        it('should handle empty string after prefix', () => {
          const result = client.getEndpoint('api', '00000');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });
      });

      describe('with regular API key (non-Hub)', () => {
        it('should return Bugsnag domain for api subdomain', () => {
          const result = client.getEndpoint('api', 'regular-key');
          expect(result).toBe('https://api.bugsnag.com');
        });

        it('should return Bugsnag domain for app subdomain', () => {
          const result = client.getEndpoint('app', 'abc123def');
          expect(result).toBe('https://app.bugsnag.com');
        });

        it('should return Bugsnag domain for custom subdomain', () => {
          const result = client.getEndpoint('custom', 'test-key-123');
          expect(result).toBe('https://custom.bugsnag.com');
        });

        it('should handle API key with 00000 in middle', () => {
          const result = client.getEndpoint('api', 'key-00000-middle');
          expect(result).toBe('https://api.bugsnag.com');
        });
      });

      describe('without API key', () => {
        it('should return Bugsnag domain when API key is undefined', () => {
          const result = client.getEndpoint('api', undefined);
          expect(result).toBe('https://api.bugsnag.com');
        });

        it('should return Bugsnag domain when API key is empty string', () => {
          const result = client.getEndpoint('api', '');
          expect(result).toBe('https://api.bugsnag.com');
        });

        it('should return Bugsnag domain when API key is null', () => {
          const result = client.getEndpoint('api', null as any);
          expect(result).toBe('https://api.bugsnag.com');
        });
      });
    });

    describe('with custom endpoint', () => {
      describe('Hub domain endpoints (always normalized)', () => {
        it('should normalize to HTTPS subdomain for exact hub domain match', () => {
          const result = client.getEndpoint('api', '00000key', 'https://api.bugsnag.smartbear.com');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });

        it('should normalize to HTTPS subdomain regardless of input protocol', () => {
          const result = client.getEndpoint('api', '00000key', 'http://app.bugsnag.smartbear.com');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });

        it('should normalize to HTTPS subdomain regardless of input subdomain', () => {
          const result = client.getEndpoint('app', '00000key', 'https://api.bugsnag.smartbear.com');
          expect(result).toBe('https://app.bugsnag.smartbear.com');
        });

        it('should normalize hub domain with port', () => {
          const result = client.getEndpoint('api', '00000key', 'https://custom.bugsnag.smartbear.com:8080');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });

        it('should normalize hub domain with path', () => {
          const result = client.getEndpoint('api', '00000key', 'https://custom.bugsnag.smartbear.com/path');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });

        it('should normalize complex subdomains to standard format', () => {
          const result = client.getEndpoint('api', '00000key', 'https://staging.app.bugsnag.smartbear.com');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });
      });

      describe('Bugsnag domain endpoints (always normalized)', () => {
        it('should normalize to HTTPS subdomain for exact bugsnag domain match', () => {
          const result = client.getEndpoint('api', 'regular-key', 'https://api.bugsnag.com');
          expect(result).toBe('https://api.bugsnag.com');
        });

        it('should normalize to HTTPS subdomain regardless of input protocol', () => {
          const result = client.getEndpoint('api', 'regular-key', 'http://app.bugsnag.com');
          expect(result).toBe('https://api.bugsnag.com');
        });

        it('should normalize bugsnag domain with port', () => {
          const result = client.getEndpoint('app', 'regular-key', 'https://api.bugsnag.com:9000');
          expect(result).toBe('https://app.bugsnag.com');
        });

        it('should normalize bugsnag domain with path', () => {
          const result = client.getEndpoint('app', 'regular-key', 'https://api.bugsnag.com/v2');
          expect(result).toBe('https://app.bugsnag.com');
        });
      });

      describe('Custom domain endpoints (used as-is)', () => {
        it('should return custom endpoint exactly as provided', () => {
          const customEndpoint = 'https://custom.api.com';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should return custom endpoint as-is regardless of API key type', () => {
          const customEndpoint = 'https://my-custom-domain.com/api';
          const result = client.getEndpoint('api', 'regular-key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should preserve HTTP protocol for custom domains', () => {
          const customEndpoint = 'http://localhost:3000';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should preserve custom domain with ports and paths', () => {
          const customEndpoint = 'https://192.168.1.100:8080/api/v1';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should preserve custom domain with query parameters', () => {
          const customEndpoint = 'https://custom.domain.com/api?version=1';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should preserve custom domain with fragments', () => {
          const customEndpoint = 'https://custom.domain.com/api#section';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });
      });

      describe('edge cases', () => {
        it('should handle malformed custom endpoints gracefully', () => {
          // This should throw due to invalid URL, which is expected behavior
          expect(() => {
            client.getEndpoint('api', '00000key', 'not-a-valid-url');
          }).toThrow();
        });

        it('should preserve custom endpoints with userinfo', () => {
          const customEndpoint = 'https://user:pass@custom.domain.com';
          const result = client.getEndpoint('api', '00000key', customEndpoint);
          expect(result).toBe(customEndpoint);
        });

        it('should normalize known domains even with userinfo', () => {
          const result = client.getEndpoint('api', '00000key', 'https://user:pass@app.bugsnag.smartbear.com');
          expect(result).toBe('https://api.bugsnag.smartbear.com');
        });
      });
    });

    describe('subdomain validation', () => {
      it('should handle empty subdomain', () => {
        const result = client.getEndpoint('', '00000key');
        expect(result).toBe('https://.bugsnag.smartbear.com');
      });

      it('should handle subdomain with special characters', () => {
        const result = client.getEndpoint('test-api_v2', '00000key');
        expect(result).toBe('https://test-api_v2.bugsnag.smartbear.com');
      });

      it('should handle numeric subdomain', () => {
        const result = client.getEndpoint('v1', 'regular-key');
        expect(result).toBe('https://v1.bugsnag.com');
      });

      it('should handle very long subdomains', () => {
        const longSubdomain = 'very-long-subdomain-name-with-many-characters';
        const result = client.getEndpoint(longSubdomain, '00000key');
        expect(result).toBe(`https://${longSubdomain}.bugsnag.smartbear.com`);
      });
    });
  });

  describe('static utility methods', () => {
    // Test static methods if they exist in the class
    it('should have proper class structure', () => {
      const client = new BugsnagClient('test-token');

      // Verify the client has expected methods
      expect(typeof client.initialize).toBe('function');
      expect(typeof client.registerTools).toBe('function');
      expect(typeof client.registerResources).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle invalid tokens gracefully during construction', () => {
      expect(() => {
        new BugsnagClient('');
      }).not.toThrow();

      expect(() => {
        new BugsnagClient('   ');
      }).not.toThrow();
    });

    it('should handle special characters in project API key', () => {
      expect(() => {
        new BugsnagClient('test-token', '00000-special!@#$%^&*()');
      }).not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should pass correct authToken to Configuration', async () => {
      const { Configuration } = await import('../../../bugsnag/client/index.js');
      const MockedConfiguration = vi.mocked(Configuration);
      const testToken = 'super-secret-token-123';

      new BugsnagClient(testToken);

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: testToken
        })
      );
    });

    it('should include all required headers', async () => {
      const { Configuration } = await import('../../../bugsnag/client/index.js');
      const MockedConfiguration = vi.mocked(Configuration);

      new BugsnagClient('test-token');

      const configCall = MockedConfiguration.mock.calls[0][0];
      expect(configCall.headers).toEqual({
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-Bugsnag-API": "true",
        "X-Version": "2",
      });
    });
  });

  describe('API client initialization', () => {
    it('should initialize all required API clients', async () => {
      const { CurrentUserAPI, ErrorAPI } = await import('../../../bugsnag/client/index.js');
      const { ProjectAPI } = await import('../../../bugsnag/client/api/Project.js');

      const MockedCurrentUserAPI = vi.mocked(CurrentUserAPI);
      const MockedErrorAPI = vi.mocked(ErrorAPI);
      const MockedProjectAPI = vi.mocked(ProjectAPI);

      // Clear previous calls from beforeEach and other tests
      MockedCurrentUserAPI.mockClear();
      MockedErrorAPI.mockClear();
      MockedProjectAPI.mockClear();

      new BugsnagClient('test-token');

      expect(MockedCurrentUserAPI).toHaveBeenCalledOnce();
      expect(MockedErrorAPI).toHaveBeenCalledOnce();
      expect(MockedProjectAPI).toHaveBeenCalledOnce();
    });

    it('should initialize NodeCache', async () => {
      const NodeCacheModule = await import('node-cache');
      const MockedNodeCache = vi.mocked(NodeCacheModule.default);

      // Clear previous calls from beforeEach
      MockedNodeCache.mockClear();

      new BugsnagClient('test-token');

      expect(MockedNodeCache).toHaveBeenCalledOnce();
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with organizations and projects', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', api_key: 'key1' },
        { id: 'proj-2', name: 'Project 2', api_key: 'key2' }
      ];

      mockCache.get.mockReturnValueOnce(null) // No current projects
        .mockReturnValueOnce(null) // No cached projects
        .mockReturnValueOnce(null); // No cached organization
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [mockOrg] });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });

      await client.initialize();

      expect(mockCurrentUserAPI.listUserOrganizations).toHaveBeenCalledOnce();
      expect(mockCurrentUserAPI.getOrganizationProjects).toHaveBeenCalledWith('org-1', { paginate: true });
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_org', mockOrg);
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_projects', mockProjects);
    });

    it('should initialize with project API key and set up event filters', async () => {
      const clientWithApiKey = new BugsnagClient('test-token', 'project-api-key');
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', api_key: 'project-api-key' },
        { id: 'proj-2', name: 'Project 2', api_key: 'other-key' }
      ];
      const mockEventFields = [
        { display_id: 'user.email', custom: false },
        { display_id: 'error.status', custom: false },
        { display_id: 'search', custom: false } // This should be filtered out
      ];

      mockCache.get.mockReturnValueOnce(mockProjects)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockProjects);
      mockProjectAPI.listProjectEventFields.mockResolvedValue({ body: mockEventFields });

      await clientWithApiKey.initialize();

      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_current_project', mockProjects[0]);
      expect(mockProjectAPI.listProjectEventFields).toHaveBeenCalledWith('proj-1');

      // // Verify that 'search' field is filtered out
      const filteredFields = mockEventFields.filter(field => field.display_id !== 'search');
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_current_project_event_filters', filteredFields);
    });

    it('should throw error when no organizations found', async () => {
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [] });

      await expect(client.initialize()).rejects.toThrow('No organizations found for the current user.');
    });

    it('should throw error when project with API key not found', async () => {
      const clientWithApiKey = new BugsnagClient('test-token', 'non-existent-key');
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      const mockProject = { id: 'proj-1', name: 'Project 1', api_key: 'other-key' };

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [mockOrg] });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: [mockProject] });

      await expect(clientWithApiKey.initialize()).rejects.toThrow(
        'Unable to find project with API key non-existent-key in organization.'
      );
    });

    it('should throw error when no event fields found for project', async () => {
      const clientWithApiKey = new BugsnagClient('test-token', 'project-api-key');
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', api_key: 'project-api-key' }
      ];

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [mockOrg] });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });
      mockProjectAPI.listProjectEventFields.mockResolvedValue({ body: [] });

      await expect(clientWithApiKey.initialize()).rejects.toThrow(
        'No event fields found for project Project 1.'
      );
    });
  });

  describe('API methods', () => {
    describe('getProjects', () => {
      it('should return cached projects when available', async () => {
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];
        mockCache.get.mockReturnValue(mockProjects);

        const result = await client.getProjects();

        expect(mockCache.get).toHaveBeenCalledWith('bugsnag_projects');
        expect(result).toEqual(mockProjects);
      });

      it('should fetch projects from API when not cached', async () => {
        const mockOrg = { id: 'org-1', name: 'Test Org' };
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

        mockCache.get
          .mockReturnValueOnce(null) // First call for projects
          .mockReturnValueOnce(mockOrg); // Second call for org
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });

        const result = await client.getProjects();

        expect(mockCurrentUserAPI.getOrganizationProjects).toHaveBeenCalledWith('org-1', { paginate: true });
        expect(mockCache.set).toHaveBeenCalledWith('bugsnag_projects', mockProjects);
        expect(result).toEqual(mockProjects);
      });

      it('should return empty array when no projects found', async () => {
        const mockOrg = { id: 'org-1', name: 'Test Org' };

        mockCache.get
          .mockReturnValueOnce(null) // First call for projects
          .mockReturnValueOnce(mockOrg); // Second call for org
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: [] });

        await expect(client.getProjects()).resolves.toEqual([]);
      });
    });

    describe("getBuilds", () => {
      it("should return builds from API when not cached", async () => {
        const mockBuilds = [
          {
            id: "rel-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
            release_stage: { name: "production" },
            source_control: {
              service: "github",
              commit_url:
                "https://github.com/org/repo/commit/abc123",
            },
            errors_introduced_count: 5,
            errors_seen_count: 10,
            total_sessions_count: 100,
            unhandled_sessions_count: 10,
            accumulative_daily_users_seen: 50,
            accumulative_daily_users_with_unhandled: 5,
          },
        ];

        const enhancedBuilds = mockBuilds.map((build) => ({
          ...build,
          session_stability: 0.9,
          user_stability: 0.9,
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        }));

        // Mock cache to return null first to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: mockBuilds,
        });

        const result = await client.listBuilds("proj-1", {
          release_stage: "production",
        });

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1"
        );
        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          { release_stage: "production" }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1",
          enhancedBuilds,
          300
        );
        expect(result).toEqual(enhancedBuilds);
      });

      it("should return cached builds when available", async () => {
        const mockBuilds = [
          {
            id: "rel-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
            session_stability: "90.00%",
            user_stability: "90.00%",
          },
        ];

        // Mock cache to return builds
        mockCache.get.mockReturnValueOnce(mockBuilds);

        const result = await client.listBuilds("proj-1", {
          release_stage: "production",
        });

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1"
        );
        expect(mockProjectAPI.listBuilds).not.toHaveBeenCalled();
        expect(result).toEqual(mockBuilds);
      });

      it("should return empty array when no builds found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockResolvedValue({ body: null });

        const result = await client.listBuilds("proj-1", {});

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          {}
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1",
          [],
          300
        );
        expect(result).toEqual([]);
      });

      it("should construct correct URL with build stage", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockImplementation(() => ({
          body: [],
        }));

        await client.listBuilds("proj-1", {
          release_stage: "staging",
        });

        // This is testing the implementation detail that the ProjectAPI correctly constructs the URL
        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          { release_stage: "staging" }
        );
      });
    });

    describe("getBuild", () => {
      it("should return build from API when not cached", async () => {
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
          session_stability: 0.9,
          user_stability: 0.9,
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        };

        // Mock cache to return null first to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = await client.getBuild("proj-1", "rel-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_build_rel-1"
        );
        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "rel-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_build_rel-1",
          enhancedBuild,
          300
        );
        expect(result).toEqual(enhancedBuild);
      });

      // Test for division by zero case for user stability
      it("should handle zero accumulative_daily_users_seen", async () => {
        const mockBuild = {
          id: "rel-2",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.1",
          release_stage: { name: "production" },
          errors_introduced_count: 0,
          errors_seen_count: 0,
          total_sessions_count: 50,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 0,
          accumulative_daily_users_with_unhandled: 0,
        };

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = (await client.getBuild(
          "proj-1",
          "rel-2"
        ));

        expect(result.user_stability).toBe(0);
        expect(result.meets_target_stability).toBe(false);
        expect(result.meets_critical_stability).toBe(false);
      });

      // Test for division by zero case for session stability
      it("should handle zero total_sessions_count", async () => {
        const mockBuild = {
          id: "rel-3",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.2",
          release_stage: { name: "production" },
          errors_introduced_count: 0,
          errors_seen_count: 0,
          total_sessions_count: 0,
          unhandled_sessions_count: 0,
          accumulative_daily_users_seen: 20,
          accumulative_daily_users_with_unhandled: 2,
        };

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = (await client.getBuild(
          "proj-1",
          "rel-3"
        ));

        expect(result.session_stability).toBe(0);
        // Since stability_target_type is "user", user_stability is used for comparison
        expect(result.meets_target_stability).toBe(false);
        expect(result.meets_critical_stability).toBe(true);
      });

      // Test for session-based stability type
      it("should calculate metrics correctly when stability_target_type is session", async () => {
        const mockBuild = {
          id: "rel-4",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.3",
          release_stage: { name: "production" },
          errors_introduced_count: 2,
          errors_seen_count: 5,
          total_sessions_count: 100,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 50,
          accumulative_daily_users_with_unhandled: 10,
        };

        // Override the default mockProjectAPI.getProjectStabilityTargets for this test only
        mockProjectAPI.getProjectStabilityTargets.mockResolvedValueOnce(
          {
            target_stability: {
              value: 0.95,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            critical_stability: {
              value: 0.9,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            stability_target_type: "session" as const,
          }
        );

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = (await client.getBuild(
          "proj-1",
          "rel-4"
        ));

        expect(result.stability_target_type).toBe("session");
        expect(result.session_stability).toBe(0.95); // (100-5)/100
        expect(result.user_stability).toBe(0.8); // (50-10)/50
        // Since stability_target_type is "session", session_stability is used for comparison
        expect(result.meets_target_stability).toBe(true);
        expect(result.meets_critical_stability).toBe(true);
      });

      // Test for a build that meets target stability
      it("should correctly identify a build that meets target stability", async () => {
        const mockBuild = {
          id: "rel-5",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.4",
          release_stage: { name: "production" },
          errors_introduced_count: 1,
          errors_seen_count: 2,
          total_sessions_count: 1000,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 500,
          accumulative_daily_users_with_unhandled: 2,
        };

        // Override the default mockProjectAPI.getProjectStabilityTargets for this test only
        mockProjectAPI.getProjectStabilityTargets.mockResolvedValueOnce(
          {
            target_stability: {
              value: 0.99,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            critical_stability: {
              value: 0.95,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            stability_target_type: "user" as const,
          }
        );

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = (await client.getBuild(
          "proj-1",
          "rel-5"
        ));

        expect(result.user_stability).toBe(0.996); // (500-2)/500
        expect(result.meets_target_stability).toBe(true);
        expect(result.meets_critical_stability).toBe(true);
      });

      // Test for a build that fails both critical and target stability
      it("should correctly identify a build that fails both critical and target stability", async () => {
        const mockBuild = {
          id: "rel-6",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.5",
          release_stage: { name: "production" },
          errors_introduced_count: 10,
          errors_seen_count: 20,
          total_sessions_count: 100,
          unhandled_sessions_count: 30,
          accumulative_daily_users_seen: 100,
          accumulative_daily_users_with_unhandled: 20,
        };

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        const result = (await client.getBuild(
          "proj-1",
          "rel-6"
        ));

        expect(result.user_stability).toBe(0.8); // (100-20)/100
        expect(result.meets_target_stability).toBe(false); // 0.8 < 0.995
        expect(result.meets_critical_stability).toBe(false); // 0.8 < 0.85
      });

      it("should return cached build when available", async () => {
        const mockBuild = {
          id: "rel-1",
          release_time: "2023-01-01T00:00:00Z",
          app_version: "1.0.0",
          release_stage: { name: "production" },
          session_stability: "90.00%",
          user_stability: "90.00%",
        };

        // Mock cache to return build
        mockCache.get.mockReturnValueOnce(mockBuild);

        const result = await client.getBuild("proj-1", "rel-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_build_rel-1"
        );
        expect(mockProjectAPI.getBuild).not.toHaveBeenCalled();
        expect(result).toEqual(mockBuild);
      });

      it("should return null when build not found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({ body: null });

        await expect(
          client.getBuild("proj-1", "non-existent-build-id")
        ).rejects.toThrow(
          "No build for non-existent-build-id found."
        );

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "non-existent-build-id"
        );
      });
    });

    describe("listReleases", () => {
      it("should return releases from API when not cached", async () => {
        const mockReleases = [
          {
            id: "rel-group-1",
            release_stage_name: "production",
            app_version: "1.0.0",
            first_released_at: "2023-01-01T00:00:00Z",
            first_release_id: "build-1",
            releases_count: 2,
            visible: true,
            total_sessions_count: 100,
            unhandled_sessions_count: 10,
            sessions_count_in_last_24h: 20,
            accumulative_daily_users_seen: 50,
            accumulative_daily_users_with_unhandled: 5,
          },
        ];

        const enhancedReleases = mockReleases.map((release) => ({
          ...release,
          session_stability: 0.9,
          user_stability: 0.9,
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        }));

        // Mock cache to return null first to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockResolvedValue({
          body: mockReleases,
        });

        const result = await client.listReleases("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1"
        );
        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-1",
          { release_stage_name: "production", visible_only: true }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1",
          enhancedReleases,
          300
        );
        expect(result).toEqual(enhancedReleases);
      });

      it("should return cached releases when available", async () => {
        const mockReleases = [
          {
            id: "rel-group-1",
            release_stage_name: "production",
            app_version: "1.0.0",
            session_stability: 0.9,
            user_stability: 0.9,
          },
        ];

        // Mock cache to return releases
        mockCache.get.mockReturnValueOnce(mockReleases);

        const result = await client.listReleases("proj-1", {
          release_stage_name: "production",
          visible_only: true,
        });

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1"
        );
        expect(mockProjectAPI.listReleases).not.toHaveBeenCalled();
        expect(result).toEqual(mockReleases);
      });

      it("should return empty array when no releases found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockResolvedValue({ body: null });

        const result = await client.listReleases("proj-1", {
          release_stage_name: "production",
          visible_only: true
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-1",
          { release_stage_name: "production", visible_only: true }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1",
          [],
          300
        );
        expect(result).toEqual([]);
      });

      it("should correctly pass release stage and visibility parameters", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockImplementation(() => ({
          body: [],
        }));

        await client.listReleases("proj-1", {
          release_stage_name: "staging",
          visible_only: false
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-1",
          { release_stage_name: "staging", visible_only: false }
        );
      });
    });

    describe("getRelease", () => {
      it("should return release from API when not cached", async () => {
        const mockRelease = {
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
            diff_url_to_previous: "https://github.com/org/repo/compare/previous...abc123",
          },
          top_release_group: true,
          visible: true,
          total_sessions_count: 100,
          unhandled_sessions_count: 10,
          sessions_count_in_last_24h: 20,
          accumulative_daily_users_seen: 50,
          accumulative_daily_users_with_unhandled: 5,
        };

        const enhancedRelease = {
          ...mockRelease,
          session_stability: 0.9,
          user_stability: 0.9,
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
          stability_target_type: "user",
        };

        // Mock cache to return null first to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({
          body: mockRelease,
        });

        const result = await client.getRelease("proj-1", "rel-group-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_release_rel-group-1"
        );
        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_release_rel-group-1",
          enhancedRelease,
          300
        );
        expect(result).toEqual(enhancedRelease);
      });

      // Test for division by zero case for user stability
      it("should handle zero accumulative_daily_users_seen in releases", async () => {
        const mockRelease = {
          id: "rel-group-2",
          project_id: "proj-1",
          release_stage_name: "production",
          app_version: "1.0.1",
          first_released_at: "2023-01-01T00:00:00Z",
          total_sessions_count: 50,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 0,
          accumulative_daily_users_with_unhandled: 0,
        };

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({
          body: mockRelease,
        });

        const result = (await client.getRelease(
          "proj-1",
          "rel-group-2"
        ));

        expect(result.user_stability).toBe(0);
        expect(result.meets_target_stability).toBe(false);
        expect(result.meets_critical_stability).toBe(false);
      });

      // Test for session-based stability type
      it("should calculate release metrics correctly when stability_target_type is session", async () => {
        const mockRelease = {
          id: "rel-group-3",
          project_id: "proj-1",
          release_stage_name: "production",
          app_version: "1.0.3",
          first_released_at: "2023-01-01T00:00:00Z",
          total_sessions_count: 100,
          unhandled_sessions_count: 5,
          accumulative_daily_users_seen: 50,
          accumulative_daily_users_with_unhandled: 10,
        };

        // Override the default mockProjectAPI.getProjectStabilityTargets for this test only
        mockProjectAPI.getProjectStabilityTargets.mockResolvedValueOnce(
          {
            target_stability: {
              value: 0.95,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            critical_stability: {
              value: 0.9,
              updated_at: "2023-01-01",
              updated_by_id: "user-1",
            },
            stability_target_type: "session" as const,
          }
        );

        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({
          body: mockRelease,
        });

        const result = (await client.getRelease(
          "proj-1",
          "rel-group-3"
        ));

        expect(result.stability_target_type).toBe("session");
        expect(result.session_stability).toBe(0.95); // (100-5)/100
        expect(result.user_stability).toBe(0.8); // (50-10)/50
        // Since stability_target_type is "session", session_stability is used for comparison
        expect(result.meets_target_stability).toBe(true);
        expect(result.meets_critical_stability).toBe(true);
      });

      it("should return cached release when available", async () => {
        const mockRelease = {
          id: "rel-group-1",
          project_id: "proj-1",
          release_stage_name: "production",
          app_version: "1.0.0",
          session_stability: 0.9,
          user_stability: 0.9,
        };

        // Mock cache to return release
        mockCache.get.mockReturnValueOnce(mockRelease);

        const result = await client.getRelease("proj-1", "rel-group-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_release_rel-group-1"
        );
        expect(mockProjectAPI.getRelease).not.toHaveBeenCalled();
        expect(result).toEqual(mockRelease);
      });

      it("should throw error when release not found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({ body: null });

        await expect(
          client.getRelease("proj-1", "non-existent-release-id")
        ).rejects.toThrow(
          "No release for non-existent-release-id found."
        );

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "non-existent-release-id"
        );
      });
    });

    describe("listBuildsInRelease", () => {
      it("should return builds in release from API when not cached", async () => {
        const mockBuildsInRelease = [
          {
            id: "build-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
          },
          {
            id: "build-2",
            release_time: "2023-01-02T00:00:00Z",
            app_version: "1.0.0",
          }
        ];

        // Mock cache to return null first to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
        });

        const result = await client.listBuildsInRelease("rel-group-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1"
        );
        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1",
          mockBuildsInRelease,
          300
        );
        expect(result).toEqual(mockBuildsInRelease);
      });

      it("should return cached builds in release when available", async () => {
        const mockBuildsInRelease = [
          {
            id: "build-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
          }
        ];

        // Mock cache to return builds
        mockCache.get.mockReturnValueOnce(mockBuildsInRelease);

        const result = await client.listBuildsInRelease("rel-group-1");

        expect(mockCache.get).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1"
        );
        expect(mockProjectAPI.listBuildsInRelease).not.toHaveBeenCalled();
        expect(result).toEqual(mockBuildsInRelease);
      });

      it("should return empty array when no builds in release found", async () => {
        // Mock cache to return null to simulate no cached data
        mockCache.get.mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({ body: null });

        const result = await client.listBuildsInRelease("rel-group-1");

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1",
          [],
          300
        );
        expect(result).toEqual([]);
      });
    });

    describe('getEventById', () => {
      it('should find event across multiple projects', async () => {
        const mockOrgs = [{ id: 'org-1', name: 'Test Org' }];
        const mockProjects = [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' }
        ];
        const mockEvent = { id: 'event-1', project_id: 'proj-2' };

        mockCache.get.mockReturnValueOnce(mockProjects);
        mockCache.get.mockReturnValueOnce(mockOrgs);
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });
        mockErrorAPI.viewEventById
          .mockRejectedValueOnce(new Error('Not found')) // proj-1
          .mockResolvedValueOnce({ body: mockEvent }); // proj-2

        const result = await client.getEvent('event-1');

        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith('proj-1', 'event-1');
        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith('proj-2', 'event-1');
        expect(result).toEqual(mockEvent);
      });

      it('should return null when event not found in any project', async () => {
        const mockOrgs = [{ id: 'org-1', name: 'Test Org' }];
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

        mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: mockOrgs });
        mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });
        mockErrorAPI.viewEventById.mockRejectedValue(new Error('Not found'));

        const result = await client.getEvent('event-1');

        expect(result).toBeNull();
      });
    });
  });

  describe('tool registration', () => {
    let registerToolsSpy: any;
    let getInputFunctionSpy: any;

    beforeEach(() => {
      registerToolsSpy = vi.fn();
      getInputFunctionSpy = vi.fn();
    });

    it('should register list_projects tool when no project API key', () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      expect(registerToolsSpy).toBeCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should not register list_projects tool when project API key is provided', () => {
      const clientWithApiKey = new BugsnagClient('test-token', 'project-api-key');
      clientWithApiKey.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map((call: any) => call[0].title);
      expect(registeredTools).not.toContain('List Projects');
    });

    it('should register common tools regardless of project API key', () => {
      client.registerTools(registerToolsSpy, getInputFunctionSpy);

      const registeredTools = registerToolsSpy.mock.calls.map((call: any) => call[0].title);
      expect(registeredTools).toContain('Get Error');
      expect(registeredTools).toContain('Get Event Details');
      expect(registeredTools).toContain('List Project Errors');
      expect(registeredTools).toContain('List Project Event Filters');
      expect(registeredTools).toContain('Update Error');
      expect(registeredTools).toContain('List Builds');
      expect(registeredTools).toContain('Get Build');
      expect(registeredTools).toContain('List Releases');
      expect(registeredTools).toContain('Get Release');
      expect(registeredTools).toContain('List Builds in Release');
    });
  });

  describe('resource registration', () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    it('should register event resource', () => {
      client.registerResources(registerResourcesSpy);

      expect(registerResourcesSpy).toHaveBeenCalledWith(
        'event',
        '{id}',
        expect.any(Function)
      );
    });
  });

  describe('tool handlers', () => {

    let registerToolsSpy: any;
    let getInputFunctionSpy: any;

    beforeEach(() => {
      registerToolsSpy = vi.fn();
      getInputFunctionSpy = vi.fn();
    });

    describe('list_projects tool handler', () => {
      it('should return projects with pagination', async () => {
        const mockProjects = [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' },
          { id: 'proj-3', name: 'Project 3' }
        ];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Projects')[1];

        const result = await toolHandler({ page_size: 2, page: 1 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should return all projects when no pagination specified', async () => {
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Projects')[1];

        const result = await toolHandler({});

        const expectedResult = {
          data: mockProjects,
          count: 1
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should handle no projects found', async () => {
        mockCache.get.mockReturnValue([]);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Projects')[1];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe('No projects found.');
      });

      it('should handle pagination with only page_size', async () => {
        const mockProjects = [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' },
          { id: 'proj-3', name: 'Project 3' }
        ];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Projects')[1];

        const result = await toolHandler({ page_size: 2 });

        const expectedResult = {
          data: mockProjects.slice(0, 2),
          count: 2
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should handle pagination with only page', async () => {
        const mockProjects = Array.from({ length: 25 }, (_, i) => ({
          id: `proj-${i + 1}`,
          name: `Project ${i + 1}`
        }));
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Projects')[1];

        const result = await toolHandler({ page: 2 });

        // Default page_size is 10, so page 2 should return projects 10-19
        const expectedResult = {
          data: mockProjects.slice(10, 20),
          count: 10
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });
    });

    describe('get_error tool handler', () => {
      it('should get error details with project from cache', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1', slug: 'my-project' };
        const mockError = { id: 'error-1', message: 'Test error' };
        const mockOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' };
        const mockEvents = [{ id: 'event-1', timestamp: '2023-01-01' }];
        const mockPivots = [{ id: 'pivot-1', name: 'test-pivot' }];

        mockCache.get.mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({ body: mockError });
        mockErrorAPI.listEventsOnProject.mockResolvedValue({ body: mockEvents });
        mockErrorAPI.listErrorPivots.mockResolvedValue({ body: mockPivots });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Error')[1];

        const result = await toolHandler({ errorId: 'error-1' });

        const queryString = '?filters[error][][type]=eq&filters[error][][value]=error-1'
        const encodedQueryString = encodeURI(queryString);
        expect(mockErrorAPI.viewErrorOnProject).toHaveBeenCalledWith('proj-1', 'error-1');
        expect(result.content[0].text).toBe(JSON.stringify({
          error_details: mockError,
          latest_event: mockEvents[0],
          pivots: mockPivots,
          url: `https://app.bugsnag.com/${mockOrg.slug}/${mockProject.slug}/errors/error-1${encodedQueryString}`
        }));
      });

      it('should throw error when projectId is not set', async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Error')[1];

        await expect(toolHandler({})).rejects.toThrow('No current project found. Please provide a projectId or configure a project API key.');
      });

      it('should throw error when error ID is not set', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1', slug: 'my-project' };
        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Error')[1];

        await expect(toolHandler({})).rejects.toThrow('Both projectId and errorId arguments are required');
      });
    });

    describe('get_bugsnag_event_details tool handler', () => {
      it('should get event details from dashboard URL', async () => {
        const mockProjects = [{ id: 'proj-1', slug: 'my-project', name: 'My Project' }];
        const mockEvent = { id: 'event-1', project_id: 'proj-1' };

        mockCache.get.mockReturnValue(mockProjects);
        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Event Details')[1];

        const result = await toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1'
        });

        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith('proj-1', 'event-1');
        expect(result.content[0].text).toBe(JSON.stringify(mockEvent));
      });

      it('should throw error when link is invalid', async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Event Details')[1];

        await expect(toolHandler({ link: 'invalid-url' })).rejects.toThrow();
      });

      it('should throw error when project not found', async () => {
        mockCache.get.mockReturnValue([{ id: 'proj-1', slug: 'other-project', name: 'Other Project' }]);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Event Details')[1];

        await expect(toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1'
        })).rejects.toThrow('Project with the specified slug not found.');
      });

      it('should throw error when URL is missing required parameters', async () => {
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Get Event Details')[1];

        await expect(toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123' // Missing event_id
        })).rejects.toThrow('Both projectSlug and eventId must be present in the link');
      });
    });

    describe('list_project_errors tool handler', () => {
      it('should list project errors with supplied parameters', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockEventFields = [
          { display_id: 'error.status', custom: false },
          { display_id: 'user.email', custom: false },
          { display_id: 'event.since', custom: false }
        ];
        const mockErrors = [{ id: 'error-1', message: 'Test error' }];
        const filters = {
          'error.status': [{ type: 'eq' as const, value: 'for_review' }],
          'event.since': [{ type: 'eq', value: '7d' }]
        };

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          headers: new Headers({ 'X-Total-Count': '1' })
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Errors')[1];

        const result = await toolHandler({ filters, sort: 'last_seen', direction: 'desc', per_page: 50 });

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith('proj-1', { filters, sort: 'last_seen', direction: 'desc', per_page: 50 });
        const expectedResult = {
          data: mockErrors,
          count: 1,
          total: 1
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should use default filters when not specified', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockEventFields = [
          { display_id: 'error.status', custom: false },
          { display_id: 'user.email', custom: false },
          { display_id: 'event.since', custom: false }
        ];
        const mockErrors = [{ id: 'error-1', message: 'Test error' }];
        const defaultFilters = {
          'error.status': [{ type: 'eq' as const, value: 'open' }],
          'event.since': [{ type: 'eq', value: '30d' }]
        };

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({
          body: mockErrors,
          headers: new Headers({ 'X-Total-Count': '1' })
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Errors')[1];

        const defaultFilterResult = await toolHandler({ sort: 'last_seen', direction: 'desc', per_page: 50 });

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith('proj-1', { filters: defaultFilters, sort: 'last_seen', direction: 'desc', per_page: 50 });
        const expectedResult = {
          data: mockErrors,
          count: 1,
          total: 1
        };
        expect(defaultFilterResult.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should validate filter keys against cached event fields', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockEventFields = [{ display_id: 'error.status', custom: false }];
        const filters = { 'invalid.field': [{ type: 'eq' as const, value: 'test' }] };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockEventFields);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Errors')[1];

        await expect(toolHandler({ filters })).rejects.toThrow('Invalid filter key: invalid.field');
      });

      it('should throw error when no project ID available', async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Errors')[1];

        await expect(toolHandler({})).rejects.toThrow('No current project found. Please provide a projectId or configure a project API key.');
      });
    });

    describe('get_project_event_filters tool handler', () => {
      it('should return cached event fields', async () => {
        const mockEventFields = [
          { display_id: 'error.status', custom: false },
          { display_id: 'user.email', custom: false }
        ];
        mockCache.get.mockReturnValue(mockEventFields);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Event Filters')[1];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe(JSON.stringify(mockEventFields));
      });

      it('should throw error when no event filters in cache', async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'List Project Event Filters')[1];

        await expect(toolHandler({})).rejects.toThrow('No event filters found in cache.');
      });
    });

    describe("list_builds tool handler", () => {
      it("should list builds with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockBuilds = [
          {
            id: "rel-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
            release_stage: { name: "production" },
            source_control: {
              service: "github",
              commit_url:
                "https://github.com/org/repo/commit/abc123",
            },
            errors_introduced_count: 5,
            errors_seen_count: 10,
            total_sessions_count: 100,
            unhandled_sessions_count: 10,
            accumulative_daily_users_seen: 50,
            accumulative_daily_users_with_unhandled: 5,
          },
        ];

        const enhancedBuilds = mockBuilds.map((build) => ({
          ...build,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        }));

        // First get for the project, second for cached builds (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: mockBuilds,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds"
        )[1];

        const result = await toolHandler({
          releaseStage: "production",
        });

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          { release_stage: "production" }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1",
          enhancedBuilds,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedBuilds)
        );
            });

      it("should list builds with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
        ];
        const mockBuilds = [
          {
            id: "rel-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0",
            release_stage: { name: "staging" },
            total_sessions_count: 50,
            unhandled_sessions_count: 5,
            accumulative_daily_users_seen: 30,
            accumulative_daily_users_with_unhandled: 3,
          },
        ];

        const enhancedBuilds = mockBuilds.map((build) => ({
          ...build,
          user_stability: 0.9,
          session_stability: 0.9,
          stability_target_type: "user",
          target_stability: 0.995,
          critical_stability: 0.85,
          meets_target_stability: false,
          meets_critical_stability: true,
        }));

        // First get for projects, second for cached builds (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockResolvedValue({
          body: mockBuilds,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds"
        )[1];

        const result = await toolHandler({
          projectId: "proj-1",
          releaseStage: "staging",
        });

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          { release_stage: "staging" }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1",
          enhancedBuilds,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedBuilds)
        );
      });

      it("should handle empty builds list", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        // First get for the project, second for cached builds (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuilds.mockResolvedValue({ body: [] });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds"
        )[1];

        const result = await toolHandler({});

        expect(mockProjectAPI.listBuilds).toHaveBeenCalledWith(
          "proj-1",
          {}
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_proj-1",
          [],
          300
        );
        expect(result.content[0].text).toBe(JSON.stringify([]));
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds"
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key."
        );
      });
    });

    describe("get_build tool handler", () => {
      it("should get build details with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
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
        }
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
          .mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });
        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build"
        )[1];

        const result = await toolHandler({ buildId: "rel-1" });

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "rel-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_build_rel-1",
          enhancedBuild,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedBuild)
        );
      });

      it("should get build with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
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

        // First get for projects, second for cached build (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({
          body: mockBuild,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build"
        )[1];

        const result = await toolHandler({
          projectId: "proj-1",
          buildId: "rel-1",
        });

        expect(mockProjectAPI.getBuild).toHaveBeenCalledWith(
          "proj-1",
          "rel-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_build_rel-1",
          enhancedBuild,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedBuild)
        );
      });

      it("should throw error when build not found", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.getBuild.mockResolvedValue({ body: null });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build"
        )[1];

        await expect(
          toolHandler({ buildId: "non-existent-release-id" })
        ).rejects.toThrow(
          "No build for non-existent-release-id found."
        );
      });

      it("should throw error when buildId argument is missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build"
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "buildId argument is required"
        );
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Build"
        )[1];

        await expect(
          toolHandler({ buildId: "rel-1" })
        ).rejects.toThrow("No build for rel-1 found.");
      });
    });

    describe("list_releases tool handler", () => {
      it("should list releases with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
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

        // First get for the project, second for cached releases (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockResolvedValue({
          body: mockReleases,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases"
        )[1];

        const result = await toolHandler({
          releaseStage: "production",
          visibleOnly: true,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-1",
          { release_stage_name: "production", visible_only: true }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1",
          enhancedReleases,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedReleases)
        );
      });

      it("should list releases with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
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

        // First get for projects, second for cached releases (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockResolvedValue({
          body: mockReleases,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases"
        )[1];

        const result = await toolHandler({
          projectId: "proj-2",
          releaseStage: "staging",
          visibleOnly: false,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-2",
          { release_stage_name: "staging", visible_only: false }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_releases_proj-2",
          enhancedReleases,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedReleases)
        );
      });

      it("should handle empty releases list", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        // First get for the project, second for cached releases (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listReleases.mockResolvedValue({ body: [] });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases"
        )[1];

        const result = await toolHandler({
          releaseStage: "production",
          visibleOnly: true,
        });

        expect(mockProjectAPI.listReleases).toHaveBeenCalledWith(
          "proj-1",
          { release_stage_name: "production", visible_only: true }
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_releases_proj-1",
          [],
          300
        );
        expect(result.content[0].text).toBe(JSON.stringify([]));
      });

      it("should throw error when no project ID available", async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Releases"
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "No current project found. Please provide a projectId or configure a project API key."
        );
      });
    });

    describe("get_release tool handler", () => {
      it("should get release details with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockRelease = {
          id: "rel-group-1",
          project_id: "proj-1",
          release_stage_name: "production",
          app_version: "1.0.0",
          first_released_at: "2023-01-01T00:00:00Z",
          total_sessions_count: 100,
          unhandled_sessions_count: 10,
          accumulative_daily_users_seen: 50,
          accumulative_daily_users_with_unhandled: 5,
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

        // First get for the project, second for cached release (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({
          body: mockRelease,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release"
        )[1];

        const result = await toolHandler({ releaseId: "rel-group-1" });

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_release_rel-group-1",
          enhancedRelease,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedRelease)
        );
      });

      it("should get release with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
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

        // First get for projects, second for cached release (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(null);
        mockProjectAPI.getRelease.mockResolvedValue({
          body: mockRelease,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release"
        )[1];

        const result = await toolHandler({
          projectId: "proj-2",
          releaseId: "rel-group-2",
        });

        expect(mockProjectAPI.getRelease).toHaveBeenCalledWith(
          "rel-group-2"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_release_rel-group-2",
          enhancedRelease,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(enhancedRelease)
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
          (call: any) => call[0].title === "Get Release"
        )[1];

        await expect(
          toolHandler({ releaseId: "non-existent-release-id" })
        ).rejects.toThrow(
          "No release for non-existent-release-id found."
        );
      });

      it("should throw error when releaseId argument is missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "Get Release"
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "releaseId argument is required"
        );
      });
    });

    describe("list_builds_in_release tool handler", () => {
      it("should list builds in release with project from cache", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };
        const mockBuildsInRelease = [
          {
            id: "build-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0"
          },
          {
            id: "build-2",
            release_time: "2023-01-02T00:00:00Z",
            app_version: "1.0.0"
          }
        ];

        // First get for the project, second for cached builds in release (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds in Release"
        )[1];

        const result = await toolHandler({
          releaseId: "rel-group-1"
        });

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1",
          mockBuildsInRelease,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(mockBuildsInRelease)
        );
      });

      it("should list builds in release with explicit project ID", async () => {
        const mockProjects = [
          { id: "proj-1", name: "Project 1" },
          { id: "proj-2", name: "Project 2" },
        ];
        const mockBuildsInRelease = [
          {
            id: "build-1",
            release_time: "2023-01-01T00:00:00Z",
            app_version: "1.0.0"
          }
        ];

        // First get for projects, second for cached builds in release (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProjects)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({
          body: mockBuildsInRelease,
        });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds in Release"
        )[1];

        const result = await toolHandler({
          releaseId: "rel-group-1"
        });

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1",
          mockBuildsInRelease,
          300
        );
        expect(result.content[0].text).toBe(
          JSON.stringify(mockBuildsInRelease)
        );
      });

      it("should handle empty builds in release list", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        // First get for the project, second for cached builds in release (return null to call API)
        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(null);
        mockProjectAPI.listBuildsInRelease.mockResolvedValue({ body: [] });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds in Release"
        )[1];
        
        const result = await toolHandler({
          releaseId: "rel-group-1"
        });

        expect(mockProjectAPI.listBuildsInRelease).toHaveBeenCalledWith(
          "rel-group-1"
        );
        expect(mockCache.set).toHaveBeenCalledWith(
          "bugsnag_builds_in_release_rel-group-1",
          [],
          300
        );
        expect(result.content[0].text).toBe(JSON.stringify([]));
      });

      it("should throw error when releaseId argument is missing", async () => {
        const mockProject = { id: "proj-1", name: "Project 1" };

        mockCache.get.mockReturnValueOnce(mockProject);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls.find(
          (call: any) => call[0].title === "List Builds in Release"
        )[1];

        await expect(toolHandler({})).rejects.toThrow(
          "releaseId argument is required"
        );
      });
    });

    describe('update_error tool handler', () => {
      it('should update error successfully with project from cache', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        const result = await toolHandler({
          errorId: 'error-1',
          operation: 'fix'
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          'proj-1',
          'error-1',
          { operation: 'fix' }
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it('should update error successfully with explicit project ID', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockProjects = [mockProject];

        mockCache.get.mockReturnValue(mockProjects);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 204 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        const result = await toolHandler({
          projectId: 'proj-1',
          errorId: 'error-1',
          operation: 'ignore'
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          'proj-1',
          'error-1',
          { operation: 'ignore' }
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it('should handle all permitted operations', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        // Test all operations except override_severity which requires special elicitInput handling
        const operations = ['open', 'fix', 'ignore', 'discard', 'undiscard'];

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        for (const operation of operations) {
          await toolHandler({
            errorId: 'error-1',
            operation: operation as any
          });

          expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
            'proj-1',
            'error-1',
            { operation, severity: undefined }
          );
        }

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledTimes(operations.length);
      });

      it('should handle override_severity operation with elicitInput', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };

        getInputFunctionSpy.mockResolvedValue({
              action: 'accept',
              content: { severity: 'warning' }
            });

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        const result = await toolHandler({
          errorId: 'error-1',
          operation: 'override_severity'
        });

        expect(getInputFunctionSpy).toHaveBeenCalledWith({
          message: "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
          requestedSchema: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ['info', 'warning', 'error'],
                description: "The new severity level for the error"
              }
            }
          },
          required: ["severity"]
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          'proj-1',
          'error-1',
          { operation: 'override_severity', severity: 'warning' }
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it('should handle override_severity operation when elicitInput is rejected', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };

        getInputFunctionSpy.mockResolvedValue({
              action: 'reject'
            });

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 200 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        const result = await toolHandler({
          errorId: 'error-1',
          operation: 'override_severity'
        });

        expect(mockErrorAPI.updateErrorOnProject).toHaveBeenCalledWith(
          'proj-1',
          'error-1',
          { operation: 'override_severity', severity: undefined }
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      });

      it('should return false when API returns non-success status', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.updateErrorOnProject.mockResolvedValue({ status: 400 });

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        const result = await toolHandler({
          errorId: 'error-1',
          operation: 'fix'
        });

        expect(result.content[0].text).toBe(JSON.stringify({ success: false }));
      });

      it('should throw error when no project found', async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        await expect(toolHandler({
          errorId: 'error-1',
          operation: 'fix'
        })).rejects.toThrow('No current project found. Please provide a projectId or configure a project API key.');
      });

      it('should throw error when project ID not found', async () => {
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(registerToolsSpy, getInputFunctionSpy);
        const toolHandler = registerToolsSpy.mock.calls
          .find((call: any) => call[0].title === 'Update Error')[1];

        await expect(toolHandler({
          projectId: 'non-existent-project',
          errorId: 'error-1',
          operation: 'fix'
        })).rejects.toThrow('Project with ID non-existent-project not found.');
      });
    });
  });

  describe('resource handlers', () => {
    let registerResourcesSpy: any;

    beforeEach(() => {
      registerResourcesSpy = vi.fn();
    });

    describe('bugsnag_event resource handler', () => {
      it('should find event by ID across projects', async () => {
        const mockEvent = { id: 'event-1', project_id: 'proj-1' };
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

        mockCache.get.mockReturnValueOnce(mockProjects);
        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerResources(registerResourcesSpy);
        const resourceHandler = registerResourcesSpy.mock.calls[0][2];

        const result = await resourceHandler(
          { href: 'bugsnag://event/event-1' },
          { id: 'event-1' }
        );

        expect(result.contents[0].uri).toBe('bugsnag://event/event-1');
        expect(result.contents[0].text).toBe(JSON.stringify(mockEvent));
      });
    });
  });
});
