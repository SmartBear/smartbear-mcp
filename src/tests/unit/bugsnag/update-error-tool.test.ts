/**
 * Unit tests for UpdateErrorTool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateErrorTool } from '../../../bugsnag/tools/update-error-tool.js';
import { SharedServices, ToolExecutionContext } from '../../../bugsnag/types.js';
import { Project } from '../../../bugsnag/client/api/CurrentUser.js';

describe('UpdateErrorTool', () => {
  let tool: UpdateErrorTool;
  let mockServices: jest.Mocked<SharedServices>;
  let mockContext: ToolExecutionContext;
  let mockGetInput: jest.Mock;

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project'
  };

  beforeEach(() => {
    mockGetInput = vi.fn();

    mockServices = {
      cts: vi.fn(),
      getProject: vi.fn(),
      getCurrentProject: vi.fn(),
      getInputProject: vi.fn().mockResolvedValue(mockProject),
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
      addStabilityData: vi.fn(),
    } as jest.Mocked<SharedServices>;

    mockContext = {
      services: mockServices,
      getInput: mockGetInput
    };

    tool = new UpdateErrorTool();
  });

  describe('constructor', () => {
    it('should create tool with correct name and definition', () => {
      expect(tool.name).toBe('update_error');
      expect(tool.definition.title).toBe('Update Error');
      expect(tool.definition.summary).toBe('Update the status of an error');
    });

    it('should include projectId parameter when no project API key', () => {
      const toolWithoutApiKey = new UpdateErrorTool(false);
      const projectIdParam = toolWithoutApiKey.definition.parameters.find(p => p.name === 'projectId');
      expect(projectIdParam).toBeDefined();
      expect(projectIdParam?.required).toBe(true);
    });

    it('should not include projectId parameter when project API key is configured', () => {
      const toolWithApiKey = new UpdateErrorTool(true);
      const projectIdParam = toolWithApiKey.definition.parameters.find(p => p.name === 'projectId');
      expect(projectIdParam).toBeUndefined();
    });

    it('should have correct parameter definitions', () => {
      const params = tool.definition.parameters;

      // Should have projectId (since hasProjectApiKey defaults to false), errorId, and operation
      expect(params).toHaveLength(3);

      const errorIdParam = params.find(p => p.name === 'errorId');
      expect(errorIdParam).toBeDefined();
      expect(errorIdParam?.required).toBe(true);

      const operationParam = params.find(p => p.name === 'operation');
      expect(operationParam).toBeDefined();
      expect(operationParam?.required).toBe(true);
    });
  });

  describe('execute', () => {
    it('should update error successfully with basic operation', async () => {
      mockServices.updateError.mockResolvedValue(true);

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'fix'
      }, mockContext);

      expect(mockServices.getInputProject).toHaveBeenCalledWith('project-123');
      expect(mockServices.updateError).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        'fix',
        { severity: undefined }
      );
      expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      expect(result.isError).toBeUndefined();
    });

    it('should update error successfully with explicit project ID', async () => {
      mockServices.updateError.mockResolvedValue(true);

      const result = await tool.execute({
        projectId: 'project-456',
        errorId: 'error-123',
        operation: 'ignore'
      }, mockContext);

      expect(mockServices.getInputProject).toHaveBeenCalledWith('project-456');
      expect(mockServices.updateError).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        'ignore',
        { severity: undefined }
      );
      expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
    });

    it('should handle all permitted operations', async () => {
      const operations = ['open', 'fix', 'ignore', 'discard', 'undiscard'] as const;
      mockServices.updateError.mockResolvedValue(true);

      for (const operation of operations) {
        const result = await tool.execute({
          projectId: 'project-123',
          errorId: 'error-123',
          operation
        }, mockContext);

        expect(mockServices.updateError).toHaveBeenCalledWith(
          'project-123',
          'error-123',
          operation,
          { severity: undefined }
        );
        expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
      }

      expect(mockServices.updateError).toHaveBeenCalledTimes(operations.length);
    });

    it('should handle override_severity operation with user input', async () => {
      mockGetInput.mockResolvedValue({
        action: 'accept',
        content: { severity: 'warning' }
      });
      mockServices.updateError.mockResolvedValue(true);

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'override_severity'
      }, mockContext);

      expect(mockGetInput).toHaveBeenCalledWith({
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

      expect(mockServices.updateError).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        'override_severity',
        { severity: 'warning' }
      );
      expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
    });

    it('should handle override_severity operation when user input is rejected', async () => {
      mockGetInput.mockResolvedValue({
        action: 'reject'
      });
      mockServices.updateError.mockResolvedValue(true);

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'override_severity'
      }, mockContext);

      expect(mockGetInput).toHaveBeenCalled();
      expect(mockServices.updateError).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        'override_severity',
        { severity: undefined }
      );
      expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
    });

    it('should handle override_severity operation when user provides no content', async () => {
      mockGetInput.mockResolvedValue({
        action: 'accept',
        content: null
      });
      mockServices.updateError.mockResolvedValue(true);

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'override_severity'
      }, mockContext);

      expect(mockServices.updateError).toHaveBeenCalledWith(
        'project-123',
        'error-123',
        'override_severity',
        { severity: undefined }
      );
      expect(result.content[0].text).toBe(JSON.stringify({ success: true }));
    });

    it('should return false when update fails', async () => {
      mockServices.updateError.mockResolvedValue(false);

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'fix'
      }, mockContext);

      expect(result.content[0].text).toBe(JSON.stringify({ success: false }));
      expect(result.isError).toBeUndefined();
    });

    it('should throw error when errorId is missing', async () => {
      const result = await tool.execute({
        projectId: 'project-123',
        operation: 'fix'
      } as any, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'errorId\' is missing');
    });

    it('should throw error when operation is missing', async () => {
      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123'
      } as any, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'operation\' is missing');
    });

    it('should throw error when errorId is empty', async () => {
      const result = await tool.execute({
        projectId: 'project-123',
        errorId: '',
        operation: 'fix'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error ID cannot be empty');
    });

    it('should throw error when operation is invalid', async () => {
      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'invalid_operation'
      } as any, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid value for parameter \'operation\'');
    });

    it('should handle project resolution errors', async () => {
      mockServices.getInputProject.mockRejectedValue(new Error('Project not found'));

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'fix'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project not found');
    });

    it('should handle updateError service errors', async () => {
      mockServices.updateError.mockRejectedValue(new Error('API error'));

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'fix'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API error');
    });

    it('should handle getInput errors for override_severity', async () => {
      mockGetInput.mockRejectedValue(new Error('Input error'));

      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 'error-123',
        operation: 'override_severity'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Input error');
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter');
    });

    it('should validate parameter types', async () => {
      const result = await tool.execute({
        projectId: 'project-123',
        errorId: 123, // Should be string
        operation: 'fix'
      } as any, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid value for parameter');
    });
  });

  describe('examples and documentation', () => {
    it('should have meaningful examples', () => {
      const examples = tool.definition.examples;
      expect(examples).toHaveLength(2);

      expect(examples[0].description).toBe('Mark an error as fixed');
      expect(examples[0].parameters.errorId).toBe('6863e2af8c857c0a5023b411');
      expect(examples[0].parameters.operation).toBe('fix');

      expect(examples[1].description).toBe('Change error severity');
      expect(examples[1].parameters.operation).toBe('override_severity');
    });

    it('should have helpful hints', () => {
      const hints = tool.definition.hints;
      expect(hints).toContain('Only use valid operations - BugSnag may reject invalid values');
      expect(hints).toContain('When using \'override_severity\', you will be prompted to provide the new severity level');
    });

    it('should have appropriate use cases', () => {
      const useCases = tool.definition.useCases;
      expect(useCases).toContain('Mark an error as open, fixed or ignored');
      expect(useCases).toContain('Discard or un-discard an error');
      expect(useCases).toContain('Update the severity of an error');
    });
  });
});
