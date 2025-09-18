/**
 * Unit tests for List Project Errors Tool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListProjectErrorsTool } from '../../../bugsnag/tools/list-project-errors-tool.js';
import { SharedServices, ToolExecutionContext } from '../../../bugsnag/types.js';

// Mock the SharedServices
const createMockServices = (): jest.Mocked<SharedServices> => ({
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
});

describe('ListProjectErrorsTool', () => {
  let tool: ListProjectErrorsTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    mockServices = createMockServices();
    context = {
      services: mockServices,
      getInput: vi.fn()
    };
    tool = new ListProjectErrorsTool(false);
  });

  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('list_project_errors');
    });

    it('should have correct title', () => {
      expect(tool.definition.title).toBe('List Project Errors');
    });

    it('should include projectId parameter when no project API key is configured', () => {
      const toolWithoutApiKey = new ListProjectErrorsTool(false);
      const projectIdParam = toolWithoutApiKey.definition.parameters.find(p => p.name === 'projectId');
      expect(projectIdParam).toBeDefined();
      expect(projectIdParam?.required).toBe(true);
    });

    it('should not include projectId parameter when project API key is configured', () => {
      const toolWithApiKey = new ListProjectErrorsTool(true);
      const projectIdParam = toolWithApiKey.definition.parameters.find(p => p.name === 'projectId');
      expect(projectIdParam).toBeUndefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required projectId parameter', async () => {
      const result = await tool.execute({}, context);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'projectId\' is missing');
    });
  });
});
