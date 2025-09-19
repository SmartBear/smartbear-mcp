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

describe('BugsnagClient - New Architecture', () => {
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
      });
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
      expect(mockCurrentUserAPI.getOrganizationProjects).toHaveBeenCalledWith('org-1');
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_org', mockOrg, 604800);
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_projects', mockProjects, 3600);
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

      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_current_project', mockProjects[0], 604800);
      expect(mockProjectAPI.listProjectEventFields).toHaveBeenCalledWith('proj-1');

      // Verify that 'search' field is filtered out
      const filteredFields = mockEventFields.filter(field => field.display_id !== 'search');
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_current_project_event_filters', filteredFields, 3600);
    });
  });

  describe('modular architecture', () => {
    it('should initialize SharedServices correctly', () => {
      const client = new BugsnagClient('test-token');
      expect(client).toBeInstanceOf(BugsnagClient);
      // The SharedServices should be created internally
    });

    it('should initialize ToolRegistry correctly', () => {
      const client = new BugsnagClient('test-token');
      expect(client).toBeInstanceOf(BugsnagClient);
      // The ToolRegistry should be created internally
    });

    it('should have proper tool registration mechanism', () => {
      const client = new BugsnagClient('test-token');
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      // Test that registerTools can be called without throwing
      expect(() => {
        client.registerTools(mockRegister, mockGetInput);
      }).not.toThrow();

      // Verify that tools are registered
      expect(mockRegister).toHaveBeenCalled();
    });

    it('should have proper resource registration mechanism', () => {
      const client = new BugsnagClient('test-token');
      const mockRegister = vi.fn();

      // Test that registerResources can be called without throwing
      expect(() => {
        client.registerResources(mockRegister);
      }).not.toThrow();

      // Verify that resources are registered
      expect(mockRegister).toHaveBeenCalled();
    });

    it('should register event resource correctly', async () => {
      const client = new BugsnagClient('test-token');
      const mockRegister = vi.fn();
      const mockEvent = { id: 'event-1', project_id: 'proj-1' };

      // Mock the SharedServices getEvent method
      mockCache.get.mockReturnValueOnce([{ id: 'proj-1' }, { id: 'proj-2' }]); // projects
      mockErrorAPI.viewEventById
        .mockRejectedValueOnce(new Error('Not found')) // proj-1
        .mockResolvedValueOnce({ body: mockEvent }); // proj-2

      client.registerResources(mockRegister);

      // Get the registered resource handler
      const resourceHandler = mockRegister.mock.calls[0][2];
      const result = await resourceHandler(new URL('bugsnag://event/event-1'));

      expect(result.contents[0].uri).toBe('bugsnag://event/event-1');
      expect(result.contents[0].text).toBe(JSON.stringify(mockEvent));
    });
  });

  describe('tool discovery configuration', () => {
    it('should include List Projects tool when no project API key is configured', () => {
      const client = new BugsnagClient('test-token');
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      client.registerTools(mockRegister, mockGetInput);

      // Check if List Projects tool is registered
      const registeredTools = mockRegister.mock.calls.map(call => call[0]);
      const hasListProjectsTool = registeredTools.some(tool => tool.title === 'List Projects');
      expect(hasListProjectsTool).toBe(true);
    });

    it('should exclude List Projects tool when project API key is configured', () => {
      const client = new BugsnagClient('test-token', 'project-api-key');
      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();

      client.registerTools(mockRegister, mockGetInput);

      // Check if List Projects tool is NOT registered
      const registeredTools = mockRegister.mock.calls.map(call => call[0]);
      const hasListProjectsTool = registeredTools.some(tool => tool.title === 'List Projects');
      expect(hasListProjectsTool).toBe(false);
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
});
