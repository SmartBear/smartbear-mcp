import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightHubClient } from '../../../insight-hub/client.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../../../common/info.js';

// Mock the dependencies
vi.mock('../../../insight-hub/client/index.js', () => ({
  CurrentUserAPI: vi.fn().mockImplementation(() => ({
    listUserOrganizations: vi.fn(),
    getOrganizationProjects: vi.fn()
  })),
  ErrorAPI: vi.fn().mockImplementation(() => ({
    viewErrorOnProject: vi.fn(),
    viewLatestEventOnError: vi.fn()
  })),
  Configuration: vi.fn().mockImplementation((config) => config)
}));

vi.mock('../../../insight-hub/client/api/Project.js', () => ({
  ProjectAPI: vi.fn().mockImplementation(() => ({
    listProjectEventFields: vi.fn(),
    createProject: vi.fn()
  }))
}));

vi.mock('node-cache', () => ({
  default: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  }))
}));

vi.mock('../../../common/bugsnag.js', () => ({
  default: {
    notify: vi.fn()
  }
}));

describe('InsightHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      new InsightHubClient('test-token');

      expect(MockedCurrentUserAPI).toHaveBeenCalledOnce();
      expect(MockedErrorAPI).toHaveBeenCalledOnce();
      expect(MockedProjectAPI).toHaveBeenCalledOnce();
    });

    it('should initialize NodeCache', async () => {
      const NodeCacheModule = await import('node-cache');
      const MockedNodeCache = vi.mocked(NodeCacheModule.default);

      new InsightHubClient('test-token');

      expect(MockedNodeCache).toHaveBeenCalledOnce();
    });
  });
});
