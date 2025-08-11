import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartBearMcpServer } from '../../../common/server.js';
import z from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import Bugsnag from '../../../common/bugsnag.js';

// Mock Bugsnag
vi.mock('../../../common/bugsnag.js', () => ({
  default: {
    notify: vi.fn()
  }
}));

describe('SmartBearMcpServer', () => {
  let server: SmartBearMcpServer;
  let superRegisterToolMock: any;
  let superRegisterResourceMock: any;
  
  beforeEach(() => {
    server = new SmartBearMcpServer();
    // This approach is required to mock the super call - other techniques result in mocking the actual server
    superRegisterToolMock = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(server)), 'registerTool').mockImplementation(vi.fn());
    superRegisterResourceMock = vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(server)), 'registerResource').mockImplementation(vi.fn());
    server.server.elicitInput = vi.fn().mockResolvedValue('mocked input');
    
    // Reset the Bugsnag mock
    vi.mocked(Bugsnag.notify).mockClear();
  });

  describe('addClient', () => {

    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        name: 'test_product',
        registerTools: vi.fn(),
        registerResources: vi.fn(),
      };
    });

    it('should register tools when client provides them', async () => {

      server.addClient(mockClient);

      // The server should call the client's registerTools function
      expect(mockClient.registerTools).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        'test_tool',
        {
          title: 'Test Tool',
          summary: 'A test tool',
          parameters: [
            {
              name: 'p1',
              type: z.string(),
              required: true,
              description: 'The input for the tool',
            }
          ]
        },
        registerCbMock,
      );

      expect(superRegisterToolMock).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );

      // Assert some of the details
      const registerToolParams = superRegisterToolMock.mock.calls[0];
      expect(registerToolParams[0]).toBe('test_product_test_tool');
      expect(registerToolParams[1]['title']).toBe('Test Tool');
      expect(registerToolParams[1]['description']).toBe(
        'A test tool\n\n' +
        '**Parameters:**\n' +
        '- p1 (string) *required*: The input for the tool');
      expect(registerToolParams[1]['inputSchema']['p1'].toString()).toBe(z.string().describe('The input for the tool').toString());
      expect(registerToolParams[1]['annotations']).toEqual({
        title: 'Test Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });

      // Get the wrapper function that will execute the tool and call it
      registerToolParams[2]();

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it('should register tools with complex parameters', async () => {

      server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      registerFn(
        'test_tool',
        {
          title: 'Test Tool',
          summary: 'A test tool',
          parameters: [
            {
              name: 'p1',
              type: z.string(),
              required: true,
              description: 'The input for the tool',
              examples: ['example1', 'example2'],
              constraints: ['constraint1', 'constraint2']
            },
            {
              name: 'p2',
              type: z.number(),
              required: false,
              description: 'The optional numeric input for the tool',
            },
            {
              name: 'p3',
              type: z.boolean(),
              required: true,
            },
            {
              name: 'p4',
              type: z.array(z.string()),
              required: true,
            },
            {
              name: 'p5',
              type: z.object({
                key1: z.string(),
                key2: z.number(),
              }),
              required: true,
            },
            {
              name: 'p6',
              type: z.enum(['value1', 'value2', 'value3']),
              required: true,
            },
            {
              name: 'p7',
              type: z.literal('value'),
              required: true,
            },
            {
              name: 'p8',
              type: z.union([z.literal('value1'), z.literal('value2')]),
              required: true,
            },
            {
              name: 'p9',
              type: z.any(),
              required: true,
            }
          ],
          purpose: 'To test the tool registration process',
          useCases: ['Testing', 'Development'],
          examples: [
            {
              description: 'Example 1',
              parameters: {
                p1: 'example1',
                p2: 42
              },
              expectedOutput: 'Expected output for example 1'
            },
            {
              description: 'Example 2',
              parameters: {
                p1: 'example2',
                p2: 24
              },
            }
          ],
          hints: [
            'First hint',
            'Second hint'
          ],
          outputFormat: 'The output format',
          readOnly: true,
          destructive: true,
          idempotent: true,
          openWorld: true
        },
        vi.fn(),
      );

      // Assert some of the details
      const registerToolParams = superRegisterToolMock.mock.calls[0];
      expect(registerToolParams[0]).toBe('test_product_test_tool');
      expect(registerToolParams[1]['title']).toBe('Test Tool');
      expect(registerToolParams[1]['description']).toBe(
        'A test tool\n\n' +
        '**Parameters:**\n' +
        '- p1 (string) *required*: The input for the tool (e.g. example1, example2)\n' +
        '  - constraint1\n' +
        '  - constraint2\n' +
        '- p2 (number): The optional numeric input for the tool\n' +
        '- p3 (boolean) *required*\n' +
        '- p4 (array) *required*\n' +
        '- p5 (object) *required*\n' +
        '- p6 (enum) *required*\n' +
        '- p7 (literal) *required*\n' +
        '- p8 (union) *required*\n' +
        '- p9 (any) *required*\n\n' +
        '**Output Format:** The output format\n\n' +
        '**Use Cases:** 1. Testing 2. Development\n\n' +
        '**Examples:**\n' +
        '1. Example 1\n' +
        '```json\n' +
        '{\n' +
        '  "p1": "example1",\n' +
        '  "p2": 42\n' +
        '}\n' +
        '```\n' +
        'Expected Output: Expected output for example 1\n\n' +
        '2. Example 2\n' +
        '```json\n' +
        '{\n' +
        '  "p1": "example2",\n' +
        '  "p2": 24\n' +
        '}\n' +
        '```\n\n' +
        '**Hints:** 1. First hint 2. Second hint');
      expect(registerToolParams[1]['inputSchema']['p1'].toString()).toBe(z.string().describe('The input for the tool').toString());
      expect(registerToolParams[1]['annotations']).toEqual({
        title: 'Test Tool',
        readOnlyHint: true,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      });

    });

    it('should handle errors when registering tools', async () => {

      server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        'test_tool',
        {
          title: 'Test Tool',
          summary: 'A test tool',
          parameters: []
        },
        registerCbMock,
      );
      
      // Make the callback throw an error to test error handling
      registerCbMock.mockImplementation(() => {
        throw new Error('Test error from registerCbMock');
      });
      
      // Get the wrapper function that will execute the tool and call it
      const registerToolParams = superRegisterToolMock.mock.calls[0];
      
      await expect(
        registerToolParams[2]()
      ).rejects.toThrow('Test error from registerCbMock');

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: 'Test error from registerCbMock',
        })
      );
    });

    it('should elicit input when client requires it', async () => {

      server.addClient(mockClient);

      // The server should call the client's registerTools function
      expect(mockClient.registerTools).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );

      // Get the register function passed from the server and execute it with test tool details
      const getInputFn = mockClient.registerTools.mock.calls[0][1];
      const params = vi.mockObject({});
      const options = vi.mockObject({});
      getInputFn(params, options);

      expect(server.server.elicitInput).toHaveBeenCalledExactlyOnceWith(params, options);
    });

    it('should register resources when client provides them', async () => {
      const mockClient = {
        name: 'test_product',
        registerTools: vi.fn(),
        registerResources: vi.fn()
      };

      server.addClient(mockClient);

      // The server should call the client's registerResources function
      expect(mockClient.registerResources).toHaveBeenCalledWith(
        expect.any(Function)
      );

      // Get the register function passed from the server and execute it with test resource details
      const registerFn = mockClient.registerResources.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        'test_resource',
        '{identifier}',
        registerCbMock,
      );

      expect(superRegisterResourceMock).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.any(ResourceTemplate),
        expect.any(Object),
        expect.any(Function)
      );

      // Assert some of the details
      const registerResourceParams = superRegisterResourceMock.mock.calls[0];
      expect(registerResourceParams[0]).toBe('test_resource');
      expect(registerResourceParams[1].uriTemplate.template).toBe('test_product://test_resource/{identifier}');

      // Get the wrapper function that will execute the tool and call it
      registerResourceParams[3]();

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it('should not register resources when client does not provide them', async () => {

      const mockClient = {
        name: 'test_product',
        registerTools: vi.fn(),
        registerResources: undefined
      };

      server.addClient(mockClient);

      // It should not crash with undefined registerResources function
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it('should handle errors when registering resources', async () => {

      server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test resource details
      const registerFn = mockClient.registerResources.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        'test_resource',
        '{identifier}',
        registerCbMock,
      );

      // Make the callback throw an error to test error handling
      registerCbMock.mockImplementation(() => {
        throw new Error('Test error from registerCbMock');
      });

      // Get the wrapper function that will execute the resource and call it
      const registerResourceParams = superRegisterResourceMock.mock.calls[0];
      await expect(
        registerResourceParams[3]()
      ).rejects.toThrow('Test error from registerCbMock');

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: 'Test error from registerCbMock',
        })
      );
    });

  });

});