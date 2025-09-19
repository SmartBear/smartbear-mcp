import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BugsnagSharedServices } from '../../../bugsnag/shared-services.js';
import { Organization, Project } from '../../../bugsnag/client/api/CurrentUser.js';

describe('BugsnagSharedServices', () => {
  let sharedServices: BugsnagSharedServices;
  let mockCurrentUserApi: any;
  let mockErrorsApi: any;
  let mockProjectApi: any;
  let mockCache: any;

  const mockOrg: Organization = {
    id: 'org-123',
    name: 'Test Org',
    slug: 'test-org',
    creator: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    billing_emails: [],
    collaborators_count: 1,
    projects_count: 1
  };

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project',
    api_key: 'test-api-key',
    type: 'javascript',
    url: 'https://api.bugsnag.com/projects/project-123',
    html_url: 'https://app.bugsnag.com/test-org/test-project',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    errors_url: 'https://api.bugsnag.com/projects/project-123/errors',
    events_url: 'https://api.bugsnag.com/projects/project-123/events',
    open_error_count: 5,
    for_review_error_count: 2,
    collaborators_count: 3,
    global_grouping: { enabled: false },
    location_grouping: { enabled: true },
    custom_grouping: { enabled: false }
  };

  beforeEach(() => {
    mockCurrentUserApi = {
      listUserOrganizations: vi.fn(),
      getOrganizationProjects: vi.fn()
    };

    mockErrorsApi = {
      viewEventById: vi.fn(),
      updateErrorOnProject: vi.fn()
    };

    mockProjectApi = {
      listProjectEventFields: vi.fn(),
      listBuilds: vi.fn(),
      getBuild: vi.fn(),
      listReleases: vi.fn(),
      getRelease: vi.fn(),
      listBuildsInRelease: vi.fn(),
      getProjectStabilityTargets: vi.fn()
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn()
    };

    sharedServices = new BugsnagSharedServices(
      mockCurrentUserApi,
      mockErrorsApi,
      mockProjectApi,
      mockCache,
      'https://app.bugsnag.com',
      'https://api.bugsnag.com',
      'test-api-key'
    );
  });

  describe('getProjects', () => {
    it('should return cached projects if available', async () => {
      const projects = [mockProject];
      mockCache.get.mockReturnValue(projects);

      const result = await sharedServices.getProjects();

      expect(result).toEqual(projects);
      expect(mockCache.get).toHaveBeenCalledWith('bugsnag_projects');
      expect(mockCurrentUserApi.listUserOrganizations).not.toHaveBeenCalled();
    });

    it('should fetch and cache projects if not cached', async () => {
      const projects = [mockProject];
      mockCache.get.mockReturnValue(null);
      mockCurrentUserApi.listUserOrganizations.mockResolvedValue({ body: [mockOrg] });
      mockCurrentUserApi.getOrganizationProjects.mockResolvedValue({ body: projects });

      const result = await sharedServices.getProjects();

      expect(result).toEqual(projects);
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_projects', projects, 3600);
    });
  });

  describe('getProject', () => {
    it('should return project by ID', async () => {
      const projects = [mockProject];
      // Mock cache to return null for individual project lookup, then projects array for getProjects
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'bugsnag_projects') return projects;
        return null; // Return null for individual project lookups
      });

      const result = await sharedServices.getProject('project-123');

      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      const projects = [mockProject];
      // Mock cache to return null for individual project lookup, then projects array for getProjects
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'bugsnag_projects') return projects;
        return null; // Return null for individual project lookups
      });

      const result = await sharedServices.getProject('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentProject', () => {
    it('should return cached current project', async () => {
      mockCache.get.mockReturnValue(mockProject);

      const result = await sharedServices.getCurrentProject();

      expect(result).toEqual(mockProject);
      expect(mockCache.get).toHaveBeenCalledWith('bugsnag_current_project');
    });

    it('should find project by API key if not cached', async () => {
      const mockEventFields = [
        { display_id: 'error.status', custom: false, filter_options: {}, pivot_options: {} }
      ];

      mockCache.get.mockReturnValueOnce(null); // current project not cached
      mockCache.get.mockReturnValueOnce([mockProject]); // projects cached
      mockProjectApi.listProjectEventFields.mockResolvedValue({ body: mockEventFields });

      const result = await sharedServices.getCurrentProject();

      expect(result).toEqual(mockProject);
      expect(mockCache.set).toHaveBeenCalledWith('bugsnag_current_project', mockProject, 604800);
    });
  });

  describe('getInputProject', () => {
    it('should return project by ID when provided', async () => {
      const projects = [mockProject];
      // Mock cache to return null for individual project lookup, then projects array for getProjects
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'bugsnag_projects') return projects;
        return null; // Return null for individual project lookups
      });

      const result = await sharedServices.getInputProject('project-123');

      expect(result).toEqual(mockProject);
    });

    it('should return current project when no ID provided', async () => {
      mockCache.get.mockReturnValue(mockProject);

      const result = await sharedServices.getInputProject();

      expect(result).toEqual(mockProject);
    });

    it('should throw error if project not found', async () => {
      const projects = [mockProject];
      // Mock cache to return null for individual project lookup, then projects array for getProjects
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'bugsnag_projects') return projects;
        return null; // Return null for individual project lookups
      });

      await expect(sharedServices.getInputProject('nonexistent')).rejects.toThrow(
        'Project with ID nonexistent not found.'
      );
    });
  });

  describe('API client access', () => {
    it('should return current user API', () => {
      expect(sharedServices.getCurrentUserApi()).toBe(mockCurrentUserApi);
    });

    it('should return errors API', () => {
      expect(sharedServices.getErrorsApi()).toBe(mockErrorsApi);
    });

    it('should return project API', () => {
      expect(sharedServices.getProjectApi()).toBe(mockProjectApi);
    });

    it('should return cache', () => {
      expect(sharedServices.getCache()).toBe(mockCache);
    });
  });

  describe('configuration', () => {
    it('should return project API key', () => {
      expect(sharedServices.getProjectApiKey()).toBe('test-api-key');
    });

    it('should return true for hasProjectApiKey', () => {
      expect(sharedServices.hasProjectApiKey()).toBe(true);
    });
  });

  describe('URL generation', () => {
    it('should generate dashboard URL', async () => {
      mockCache.get.mockReturnValue(mockOrg);

      const result = await sharedServices.getDashboardUrl(mockProject);

      expect(result).toBe('https://app.bugsnag.com/test-org/test-project');
    });

    it('should generate error URL', async () => {
      mockCache.get.mockReturnValue(mockOrg);

      const result = await sharedServices.getErrorUrl(mockProject, 'error-123', '?filter=test');

      expect(result).toBe('https://app.bugsnag.com/test-org/test-project/errors/error-123?filter=test');
    });
  });

  describe('updateError', () => {
    it('should update error and return true on success', async () => {
      mockErrorsApi.updateErrorOnProject.mockResolvedValue({ status: 200 });

      const result = await sharedServices.updateError('project-123', 'error-123', 'fix');

      expect(result).toBe(true);
      expect(mockErrorsApi.updateErrorOnProject).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        { operation: 'fix' }
      );
    });

    it('should return true on 204 status', async () => {
      mockErrorsApi.updateErrorOnProject.mockResolvedValue({ status: 204 });

      const result = await sharedServices.updateError('project-123', 'error-123', 'ignore');

      expect(result).toBe(true);
    });

    it('should return false on other status codes', async () => {
      mockErrorsApi.updateErrorOnProject.mockResolvedValue({ status: 400 });

      const result = await sharedServices.updateError('project-123', 'error-123', 'fix');

      expect(result).toBe(false);
    });
  });

  describe('addStabilityData', () => {
    it('should add stability data to build response', () => {
      const buildResponse = {
        id: 'build-123',
        accumulative_daily_users_seen: 100,
        accumulative_daily_users_with_unhandled: 10,
        total_sessions_count: 1000,
        unhandled_sessions_count: 50
      };

      const stabilityTargets = {
        stability_target_type: 'user' as const,
        target_stability: { value: 0.95 },
        critical_stability: { value: 0.90 }
      };

      const result = sharedServices.addStabilityData(buildResponse, stabilityTargets);

      expect(result.user_stability).toBe(0.9); // (100 - 10) / 100
      expect(result.session_stability).toBe(0.95); // (1000 - 50) / 1000
      expect(result.meets_target_stability).toBe(false); // 0.9 < 0.95
      expect(result.meets_critical_stability).toBe(true); // 0.9 >= 0.90
    });

    it('should handle zero division gracefully', () => {
      const buildResponse = {
        id: 'build-123',
        accumulative_daily_users_seen: 0,
        accumulative_daily_users_with_unhandled: 0,
        total_sessions_count: 0,
        unhandled_sessions_count: 0
      };

      const stabilityTargets = {
        stability_target_type: 'user' as const,
        target_stability: { value: 0.95 },
        critical_stability: { value: 0.90 }
      };

      const result = sharedServices.addStabilityData(buildResponse, stabilityTargets);

      expect(result.user_stability).toBe(0);
      expect(result.session_stability).toBe(0);
      expect(result.meets_target_stability).toBe(false);
      expect(result.meets_critical_stability).toBe(false);
    });
  });
});
