/**
 * Unit tests for GetEventDetailsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetEventDetailsTool } from '../../../bugsnag/tools/get-event-details-tool.js';
import { SharedServices, ToolExecutionContext } from '../../../bugsnag/types.js';
import { Project } from '../../../bugsnag/client/api/CurrentUser.js';

// Mock the GetInputFunction type
const mockGetInput = vi.fn();

describe('GetEventDetailsTool', () => {
  let tool: GetEventDetailsTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      slug: 'my-project',
      name: 'My Project',
      api_key: 'api-key-1',
      type: 'project',
      url: 'https://api.bugsnag.com/projects/proj-1',
      html_url: 'https://app.bugsnag.com/my-org/my-project',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      language: 'javascript',
      release_stages: ['development', 'production'],
      collaborators_count: 5,
      global_grouping: {
        message: true,
        stacktrace: true
      },
      location_grouping: {
        enabled: true,
        nearest_code: true
      },
      discarded_app_versions: [],
      discarded_errors: [],
      resolved_app_versions: [],
      custom_event_fields_used: false,
      open_error_count: 10,
      for_review_error_count: 2,
      errors_url: 'https://api.bugsnag.com/projects/proj-1/errors'
    },
    {
      id: 'proj-2',
      slug: 'other-project',
      name: 'Other Project',
      api_key: 'api-key-2',
      type: 'project',
      url: 'https://api.bugsnag.com/projects/proj-2',
      html_url: 'https://app.bugsnag.com/my-org/other-project',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      language: 'python',
      release_stages: ['development', 'production'],
      collaborators_count: 3,
      global_grouping: {
        message: true,
        stacktrace: true
      },
      location_grouping: {
        enabled: true,
        nearest_code: true
      },
      discarded_app_versions: [],
      discarded_errors: [],
      resolved_app_versions: [],
      custom_event_fields_used: false,
      open_error_count: 5,
      for_review_error_count: 1,
      errors_url: 'https://api.bugsnag.com/projects/proj-2/errors'
    }
  ];

  const mockEventDetails = {
    id: 'event-123',
    project_id: 'proj-1',
    error_id: 'error-456',
    received_at: '2023-01-01T12:00:00Z',
    exceptions: [
      {
        errorClass: 'TypeError',
        message: 'Cannot read property of undefined',
        stacktrace: [
          {
            file: 'app.js',
            lineNumber: 42,
            columnNumber: 10,
            method: 'processData'
          }
        ]
      }
    ],
    user: {
      id: 'user-789',
      email: 'user@example.com'
    },
    context: 'HomePage',
    breadcrumbs: [
      {
        timestamp: '2023-01-01T11:59:00Z',
        message: 'User clicked button',
        type: 'user'
      }
    ]
  };

  beforeEach(() => {
    // Create mock services
    mockServices = {
      getProjects: vi.fn(),
      getProject: vi.fn(),
      getCurrentProject: vi.fn(),
      getInputProject: vi.fn(),
      getCurrentUserApi: vi.fn(),
      getErrorsApi: vi.fn(),
      getProjectApi: vi.fn(),
      getCache: vi.fn(),
      getDashboardUrl: vi.fn(),
      getErrorUrl: vi.fn(),
      getProjectApiKey: vi.fn(),
      hasProjectApiKey: vi.fn(),
      getOrganization: vi.fn(),
      getProjectEventFilters: vi.fn(),
      getEvent: vi.fn(),
      updateError: vi.fn(),
      listBuilds: vi.fn(),
      getBuild: vi.fn(),
      listReleases: vi.fn(),
      getRelease: vi.fn(),
      listBuildsInRelease: vi.fn(),
      getProjectStabilityTargets: vi.fn(),
      addStabilityData: vi.fn()
    } as any;

    context = {
      services: mockServices,
      getInput: mockGetInput
    };

    tool = new GetEventDetailsTool();
  });

  describe('constructor', () => {
    it('should initialize with correct name and definition', () => {
      expect(tool.name).toBe('get_event_details');
      expect(tool.definition.title).toBe('Get Event Details');
      expect(tool.definition.summary).toContain('dashboard URL');
      expect(tool.definition.parameters).toHaveLength(1);
      expect(tool.definition.parameters[0].name).toBe('link');
      expect(tool.definition.parameters[0].required).toBe(true);
    });

    it('should have appropriate use cases and examples', () => {
      expect(tool.definition.useCases).toContain('Get event details when given a dashboard URL from a user or notification');
      expect(tool.definition.examples).toHaveLength(1);
      expect(tool.definition.examples[0].parameters.link).toContain('event_id=');
    });
  });

  describe('execute', () => {
    it('should successfully retrieve event details from valid dashboard URL', async () => {
      const validUrl = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: validUrl }, context);

      expect(mockServices.getProjects).toHaveBeenCalledOnce();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockEventDetails);
      expect(result.isError).toBeUndefined();
    });

    it('should throw error when link argument is missing', async () => {
      const result = await tool.execute({} as any, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'link\' is missing');
    });

    it('should throw error when link argument is empty', async () => {
      const result = await tool.execute({ link: '' }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid value for parameter');
    });

    it('should throw error when URL is invalid', async () => {
      const result = await tool.execute({ link: 'invalid-url' }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid value for parameter \'link\'');
    });

    it('should throw error when URL is missing event_id parameter', async () => {
      const urlWithoutEventId = 'https://app.bugsnag.com/my-org/my-project/errors/error-456';

      const result = await tool.execute({ link: urlWithoutEventId }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('event_id parameter not found in URL');
    });

    it('should throw error when URL path is too short (missing project slug)', async () => {
      const urlWithShortPath = 'https://app.bugsnag.com/my-org?event_id=event-123';

      const result = await tool.execute({ link: urlWithShortPath }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('URL path too short');
    });

    it('should throw error when project with specified slug is not found', async () => {
      const urlWithUnknownProject = 'https://app.bugsnag.com/my-org/unknown-project/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue(mockProjects);

      const result = await tool.execute({ link: urlWithUnknownProject }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project with the specified slug not found');
      expect(mockServices.getProjects).toHaveBeenCalledOnce();
    });

    it('should throw error when event is not found', async () => {
      const validUrl = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=nonexistent-event';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(null);

      const result = await tool.execute({ link: validUrl }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Event with ID nonexistent-event not found in project proj-1');
      expect(mockServices.getEvent).toHaveBeenCalledWith('nonexistent-event', 'proj-1');
    });

    it('should handle API errors gracefully', async () => {
      const validUrl = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ link: validUrl }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed: API Error');
    });

    it('should work with different URL formats (different domains)', async () => {
      const hubUrl = 'https://app.bugsnag.smartbear.com/my-org/my-project/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: hubUrl }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
    });

    it('should handle URLs with additional query parameters', async () => {
      const urlWithExtraParams = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event-123&tab=timeline&filter=user';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: urlWithExtraParams }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
    });

    it('should handle URLs with fragments', async () => {
      const urlWithFragment = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event-123#stacktrace';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: urlWithFragment }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
    });

    it('should handle project slug with special characters', async () => {
      const projectWithSpecialChars: Project = {
        ...mockProjects[0],
        id: 'proj-special',
        slug: 'my-project-with-dashes_and_underscores'
      };

      const urlWithSpecialProject = 'https://app.bugsnag.com/my-org/my-project-with-dashes_and_underscores/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue([projectWithSpecialChars]);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: urlWithSpecialProject }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-special');
    });
  });

  describe('URL parsing edge cases', () => {
    it('should handle URLs with encoded characters', async () => {
      const encodedUrl = 'https://app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event%2D123';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: encodedUrl }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
    });

    it('should reject URLs with missing protocol', async () => {
      const urlWithoutProtocol = 'app.bugsnag.com/my-org/my-project/errors/error-456?event_id=event-123';

      const result = await tool.execute({ link: urlWithoutProtocol }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid value for parameter \'link\'');
    });

    it('should handle URLs with port numbers', async () => {
      const urlWithPort = 'https://app.bugsnag.com:443/my-org/my-project/errors/error-456?event_id=event-123';

      mockServices.getProjects.mockResolvedValue(mockProjects);
      mockServices.getEvent.mockResolvedValue(mockEventDetails);

      const result = await tool.execute({ link: urlWithPort }, context);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith('event-123', 'proj-1');
    });
  });
});
