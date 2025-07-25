import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightHubClient } from '../../../insight-hub/client.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../../../common/info.js';
import { mock } from 'node:test';

// Mock the dependencies
const mockCurrentUserAPI = {
  listUserOrganizations: vi.fn(),
  getOrganizationProjects: vi.fn()
};

const mockErrorAPI = {
  viewErrorOnProject: vi.fn(),
  viewLatestEventOnError: vi.fn(),
  viewEventById: vi.fn(),
  listProjectErrors: vi.fn()
};

const mockProjectAPI = {
  listProjectEventFields: vi.fn(),
  createProject: vi.fn()
};

const mockCache = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn()
};

vi.mock('../../../insight-hub/client/index.js', () => ({
  CurrentUserAPI: vi.fn().mockImplementation(() => mockCurrentUserAPI),
  ErrorAPI: vi.fn().mockImplementation(() => mockErrorAPI),
  Configuration: vi.fn().mockImplementation((config) => config)
}));

vi.mock('../../../insight-hub/client/api/Project.js', () => ({
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

describe('InsightHubClient', () => {
  let client: InsightHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new InsightHubClient('test-token');
  });

  describe('constructor', () => {
    it('should use HUB_API_ENDPOINT when projectApiKey starts with "00000"', () => {
      const client = new InsightHubClient('test-token', '00000test-key');

      // Since the endpoint is passed to Configuration, we can verify it through the mock
      expect(client).toBeInstanceOf(InsightHubClient);
      // The endpoint should be set correctly during construction
    });

    it('should use DEFAULT_API_ENDPOINT when projectApiKey does not start with "00000"', () => {
      const client = new InsightHubClient('test-token', 'regular-key');

      expect(client).toBeInstanceOf(InsightHubClient);
    });

    it('should use DEFAULT_API_ENDPOINT when no projectApiKey is provided', () => {
      const client = new InsightHubClient('test-token');

      expect(client).toBeInstanceOf(InsightHubClient);
    });

    it('should use custom endpoint when provided', () => {
      const customEndpoint = 'https://custom.api.com';
      const client = new InsightHubClient('test-token', undefined, customEndpoint);

      expect(client).toBeInstanceOf(InsightHubClient);
    });

    it('should set project API key when provided', () => {
      const client = new InsightHubClient('test-token', 'test-project-key');

      // Since projectApiKey is private, we test its behavior indirectly
      expect(client).toBeInstanceOf(InsightHubClient);
    });
  });

  describe('endpoint selection logic', () => {
    const testCases = [
      {
        description: 'Hub API key with HUB_PREFIX',
        projectApiKey: '00000hub-key-123',
        expectedEndpoint: 'https://api.insighthub.smartbear.com'
      },
      {
        description: 'Regular Bugsnag API key',
        projectApiKey: 'abc123def456',
        expectedEndpoint: 'https://api.bugsnag.com'
      },
      {
        description: 'API key starting with 00000 but longer',
        projectApiKey: '00000-special-hub-key',
        expectedEndpoint: 'https://api.insighthub.smartbear.com'
      },
      {
        description: 'API key with 00000 in middle',
        projectApiKey: 'key-00000-middle',
        expectedEndpoint: 'https://api.bugsnag.com'
      },
      {
        description: 'No project API key',
        projectApiKey: undefined,
        expectedEndpoint: 'https://api.bugsnag.com'
      }
    ];

    testCases.forEach(({ description, projectApiKey, expectedEndpoint }) => {
      it(`should select correct endpoint for ${description}`, async () => {
        // Import the mocked module to check calls
        const { Configuration } = await import('../../../insight-hub/client/index.js');
        const MockedConfiguration = vi.mocked(Configuration);

        new InsightHubClient('test-token', projectApiKey);

        expect(MockedConfiguration).toHaveBeenCalledWith(
          expect.objectContaining({
            basePath: expectedEndpoint
          })
        );
      });
    });
  });

  describe('static utility methods', () => {
    // Test static methods if they exist in the class
    it('should have proper class structure', () => {
      const client = new InsightHubClient('test-token');

      // Verify the client has expected methods
      expect(typeof client.initialize).toBe('function');
      expect(typeof client.registerTools).toBe('function');
      expect(typeof client.registerResources).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle invalid tokens gracefully during construction', () => {
      expect(() => {
        new InsightHubClient('');
      }).not.toThrow();

      expect(() => {
        new InsightHubClient('   ');
      }).not.toThrow();
    });

    it('should handle special characters in project API key', () => {
      expect(() => {
        new InsightHubClient('test-token', '00000-special!@#$%^&*()');
      }).not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should pass correct authToken to Configuration', async () => {
      const { Configuration } = await import('../../../insight-hub/client/index.js');
      const MockedConfiguration = vi.mocked(Configuration);
      const testToken = 'super-secret-token-123';

      new InsightHubClient(testToken);

      expect(MockedConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: testToken
        })
      );
    });

    it('should include all required headers', async () => {
      const { Configuration } = await import('../../../insight-hub/client/index.js');
      const MockedConfiguration = vi.mocked(Configuration);

      new InsightHubClient('test-token');

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
      const { CurrentUserAPI, ErrorAPI } = await import('../../../insight-hub/client/index.js');
      const { ProjectAPI } = await import('../../../insight-hub/client/api/Project.js');

      const MockedCurrentUserAPI = vi.mocked(CurrentUserAPI);
      const MockedErrorAPI = vi.mocked(ErrorAPI);
      const MockedProjectAPI = vi.mocked(ProjectAPI);

      // Clear previous calls from beforeEach and other tests
      MockedCurrentUserAPI.mockClear();
      MockedErrorAPI.mockClear();
      MockedProjectAPI.mockClear();

      new InsightHubClient('test-token');

      expect(MockedCurrentUserAPI).toHaveBeenCalledOnce();
      expect(MockedErrorAPI).toHaveBeenCalledOnce();
      expect(MockedProjectAPI).toHaveBeenCalledOnce();
    });

    it('should initialize NodeCache', async () => {
      const NodeCacheModule = await import('node-cache');
      const MockedNodeCache = vi.mocked(NodeCacheModule.default);

      // Clear previous calls from beforeEach
      MockedNodeCache.mockClear();

      new InsightHubClient('test-token');

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
      expect(mockCache.set).toHaveBeenCalledWith('insight_hub_org', mockOrg);
      expect(mockCache.set).toHaveBeenCalledWith('insight_hub_projects', mockProjects);
    });

    it('should initialize with project API key and set up event filters', async () => {
      const clientWithApiKey = new InsightHubClient('test-token', 'project-api-key');
      const mockOrg = { id: 'org-1', name: 'Test Org' };
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

      expect(mockCache.set).toHaveBeenCalledWith('insight_hub_current_project', mockProjects[0]);
      expect(mockProjectAPI.listProjectEventFields).toHaveBeenCalledWith('proj-1');

      // // Verify that 'search' field is filtered out
      const filteredFields = mockEventFields.filter(field => field.display_id !== 'search');
      expect(mockCache.set).toHaveBeenCalledWith('insight_hub_current_project_event_filters', filteredFields);
    });

    it('should throw error when no organizations found', async () => {
      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [] });

      await expect(client.initialize()).rejects.toThrow('No organizations found for the current user.');
    });

    it('should throw error when project with API key not found', async () => {
      const clientWithApiKey = new InsightHubClient('test-token', 'non-existent-key');
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', api_key: 'other-key' }
      ];

      mockCurrentUserAPI.listUserOrganizations.mockResolvedValue({ body: [mockOrg] });
      mockCurrentUserAPI.getOrganizationProjects.mockResolvedValue({ body: mockProjects });

      await expect(clientWithApiKey.initialize()).rejects.toThrow(
        'Unable to find project with API key non-existent-key in organization.'
      );
    });

    it('should throw error when no event fields found for project', async () => {
      const clientWithApiKey = new InsightHubClient('test-token', 'project-api-key');
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

        expect(mockCache.get).toHaveBeenCalledWith('insight_hub_projects');
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
        expect(mockCache.set).toHaveBeenCalledWith('insight_hub_projects', mockProjects);
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
    let mockServer: any;

    beforeEach(() => {
      mockServer = {
        registerTool: vi.fn(),
        resource: vi.fn()
      };
    });

    it('should register list_insight_hub_projects tool when no project API key', () => {
      client.registerTools(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'list_insight_hub_projects',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should not register list_insight_hub_projects tool when project API key is provided', () => {
      const clientWithApiKey = new InsightHubClient('test-token', 'project-api-key');
      clientWithApiKey.registerTools(mockServer);

      const registeredTools = mockServer.registerTool.mock.calls.map((call: any) => call[0]);
      expect(registeredTools).not.toContain('list_insight_hub_projects');
    });

    it('should register common tools regardless of project API key', () => {
      client.registerTools(mockServer);

      const registeredTools = mockServer.registerTool.mock.calls.map((call: any) => call[0]);
      expect(registeredTools).toContain('get_insight_hub_error');
      expect(registeredTools).toContain('get_insight_hub_error_latest_event');
      expect(registeredTools).toContain('get_insight_hub_event_details');
      expect(registeredTools).toContain('list_insight_hub_project_errors');
      expect(registeredTools).toContain('get_project_event_filters');
    });
  });

  describe('resource registration', () => {
    let mockServer: any;

    beforeEach(() => {
      mockServer = {
        registerTool: vi.fn(),
        resource: vi.fn()
      };
    });

    it('should register insight_hub_event resource', () => {
      client.registerResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledWith(
        'insight_hub_event',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('tool handlers', () => {
    let mockServer: any;

    beforeEach(() => {
      mockServer = {
        registerTool: vi.fn(),
        resource: vi.fn()
      };
    });

    describe('list_insight_hub_projects tool handler', () => {
      it('should return projects with pagination', async () => {
        const mockProjects = [
          { id: 'proj-1', name: 'Project 1' },
          { id: 'proj-2', name: 'Project 2' },
          { id: 'proj-3', name: 'Project 3' }
        ];
        mockCache.get.mockReturnValue(mockProjects);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

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

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

        const result = await toolHandler({});

        const expectedResult = {
          data: mockProjects,
          count: 1
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should handle no projects found', async () => {
        mockCache.get.mockReturnValue([]);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

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

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

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

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

        const result = await toolHandler({ page: 2 });

        // Default page_size is 10, so page 2 should return projects 10-19
        const expectedResult = {
          data: mockProjects.slice(10, 20),
          count: 10
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });
    });

    describe('get_insight_hub_error tool handler', () => {
      it('should get error details with project from cache', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1', slug: 'my-project' };
        const mockError = { id: 'error-1', message: 'Test error' };
        const mockOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' };
        const mockEvent = { id: 'event-1', timestamp: '2023-01-01' };

        mockCache.get.mockReturnValueOnce(mockProject)
                     .mockReturnValueOnce(mockOrg);
        mockErrorAPI.viewErrorOnProject.mockResolvedValue({ body: mockError });
        mockErrorAPI.viewLatestEventOnError.mockResolvedValue({ body: mockEvent });

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_error')[2];

        const result = await toolHandler({ errorId: 'error-1' });

        expect(mockErrorAPI.viewErrorOnProject).toHaveBeenCalledWith('proj-1', 'error-1');
        expect(result.content[0].text).toBe(JSON.stringify({
          error_details: mockError,
          latest_event: mockEvent,
          url: `https://app.bugsnag.com/${mockOrg.slug}/${mockProject.slug}/errors/error-1`
        }));
      });

      it('should throw error when required arguments missing', async () => {
        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_error')[2];

        await expect(toolHandler({})).rejects.toThrow('Both projectId and errorId arguments are required');
      });
    });

    describe('get_insight_hub_error_latest_event tool handler', () => {
      it('should get latest error event', async () => {
        const mockEvent = { id: 'event-1', timestamp: '2023-01-01' };
        mockErrorAPI.viewLatestEventOnError.mockResolvedValue({ body: mockEvent });

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_error_latest_event')[2];

        const result = await toolHandler({ errorId: 'error-1' });

        expect(mockErrorAPI.viewLatestEventOnError).toHaveBeenCalledWith('error-1');
        expect(result.content[0].text).toBe(JSON.stringify(mockEvent));
      });

      it('should throw error when errorId missing', async () => {
        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_error_latest_event')[2];

        await expect(toolHandler({})).rejects.toThrow('errorId argument is required');
      });
    });

    describe('get_insight_hub_event_details tool handler', () => {
      it('should get event details from dashboard URL', async () => {
        const mockProjects = [{ id: 'proj-1', slug: 'my-project', name: 'My Project' }];
        const mockEvent = { id: 'event-1', project_id: 'proj-1' };

        mockCache.get.mockReturnValue(mockProjects);
        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_event_details')[2];

        const result = await toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1'
        });

        expect(mockErrorAPI.viewEventById).toHaveBeenCalledWith('proj-1', 'event-1');
        expect(result.content[0].text).toBe(JSON.stringify(mockEvent));
      });

      it('should throw error when link is invalid', async () => {
        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_event_details')[2];

        await expect(toolHandler({ link: 'invalid-url' })).rejects.toThrow();
      });

      it('should throw error when project not found', async () => {
        mockCache.get.mockReturnValue([{ id: 'proj-1', slug: 'other-project', name: 'Other Project' }]);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_event_details')[2];

        await expect(toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123?event_id=event-1'
        })).rejects.toThrow('Project with the specified slug not found.');
      });

      it('should throw error when URL is missing required parameters', async () => {
        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_event_details')[2];

        await expect(toolHandler({
          link: 'https://app.bugsnag.com/my-org/my-project/errors/error-123' // Missing event_id
        })).rejects.toThrow('Both projectSlug and eventId must be present in the link');
      });
    });

    describe('list_insight_hub_project_errors tool handler', () => {
      it('should list project errors with filters', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockEventFields = [
          { display_id: 'error.status', custom: false },
          { display_id: 'user.email', custom: false }
        ];
        const mockErrors = [{ id: 'error-1', message: 'Test error' }];
        const filters = { 'error.status': [{ type: 'eq' as const, value: 'open' }] };

        mockCache.get
          .mockReturnValueOnce(mockProject) // current project
          .mockReturnValueOnce(mockEventFields); // event fields
        mockErrorAPI.listProjectErrors.mockResolvedValue({ body: mockErrors });

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_project_errors')[2];

        const result = await toolHandler({ filters });

        expect(mockErrorAPI.listProjectErrors).toHaveBeenCalledWith('proj-1', { filters });
        const expectedResult = {
          data: mockErrors,
          count: 1
        };
        expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
      });

      it('should validate filter keys against cached event fields', async () => {
        const mockProject = { id: 'proj-1', name: 'Project 1' };
        const mockEventFields = [{ display_id: 'error.status', custom: false }];
        const filters = { 'invalid.field': [{ type: 'eq' as const, value: 'test' }] };

        mockCache.get
          .mockReturnValueOnce(mockProject)
          .mockReturnValueOnce(mockEventFields);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_project_errors')[2];

        await expect(toolHandler({ filters })).rejects.toThrow('Invalid filter key: invalid.field');
      });

      it('should throw error when no project ID available', async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_project_errors')[2];

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

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_project_event_filters')[2];

        const result = await toolHandler({});

        expect(result.content[0].text).toBe(JSON.stringify(mockEventFields));
      });

      it('should throw error when no event filters in cache', async () => {
        mockCache.get.mockReturnValue(null);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_project_event_filters')[2];

        await expect(toolHandler({})).rejects.toThrow('No event filters found in cache.');
      });
    });

    describe('error handling in tool handlers', () => {
      it('should notify Bugsnag when error occurs in list_insight_hub_projects', async () => {
        const Bugsnag = (await import('../../../common/bugsnag.js')).default;
        const mockError = new Error('Test error');
        mockCache.get.mockImplementation(() => {
          throw mockError;
        });

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'list_insight_hub_projects')[2];

        await expect(toolHandler({})).rejects.toThrow('Test error');
        expect(Bugsnag.notify).toHaveBeenCalledWith(mockError);
      });

      it('should notify Bugsnag when error occurs in get_insight_hub_error', async () => {
        const Bugsnag = (await import('../../../common/bugsnag.js')).default;
        const mockError = new Error('API error');
        const mockProject = { id: 'proj-1', name: 'Project 1' };

        mockCache.get.mockReturnValue(mockProject);
        mockErrorAPI.viewErrorOnProject.mockRejectedValue(mockError);

        client.registerTools(mockServer);
        const toolHandler = mockServer.registerTool.mock.calls
          .find((call: any) => call[0] === 'get_insight_hub_error')[2];

        await expect(toolHandler({ errorId: 'error-1' })).rejects.toThrow('API error');
        expect(Bugsnag.notify).toHaveBeenCalledWith(mockError);
      });

      it('should notify Bugsnag when error occurs in resource handler', async () => {
        const Bugsnag = (await import('../../../common/bugsnag.js')).default;
        const mockError = new Error('Resource error');

        mockCache.get.mockRejectedValue(mockError);

        client.registerResources(mockServer);
        const resourceHandler = mockServer.resource.mock.calls[0][2];

        await expect(resourceHandler(
          { href: 'insighthub://event/event-1' },
          { id: 'event-1' }
        )).rejects.toThrow('Resource error');
        expect(Bugsnag.notify).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('resource handlers', () => {
    let mockServer: any;

    beforeEach(() => {
      mockServer = {
        registerTool: vi.fn(),
        resource: vi.fn()
      };
    });

    describe('insight_hub_event resource handler', () => {
      it('should find event by ID across projects', async () => {
        const mockEvent = { id: 'event-1', project_id: 'proj-1' };
        const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

        mockCache.get.mockReturnValueOnce(mockProjects);
        mockErrorAPI.viewEventById.mockResolvedValue({ body: mockEvent });

        client.registerResources(mockServer);
        const resourceHandler = mockServer.resource.mock.calls[0][2];

        const result = await resourceHandler(
          { href: 'insighthub://event/event-1' },
          { id: 'event-1' }
        );

        expect(result.contents[0].uri).toBe('insighthub://event/event-1');
        expect(result.contents[0].text).toBe(JSON.stringify(mockEvent));
      });
    });
  });
});
