import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import z from "zod";
import Bugsnag from "../../../common/bugsnag";
import { SmartBearMcpServer } from "../../../common/server";
import { ToolError } from "../../../common/tools";

// Mock Bugsnag
vi.mock("../../../common/bugsnag.js", () => ({
  default: {
    notify: vi.fn(),
  },
}));

describe("SmartBearMcpServer", () => {
  let server: SmartBearMcpServer;
  let superRegisterToolMock: any;
  let superRegisterResourceMock: any;

  beforeEach(() => {
    server = new SmartBearMcpServer();
    // This approach is required to mock the super call - other techniques result in mocking the actual server
    superRegisterToolMock = vi
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(server)),
        "registerTool",
      )
      .mockImplementation(vi.fn());
    superRegisterResourceMock = vi
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(server)),
        "registerResource",
      )
      .mockImplementation(vi.fn());
    server.server.elicitInput = vi.fn().mockResolvedValue("mocked input");
    // Mock elicitation support
    server.setElicitationSupported(true);

    // Reset the Bugsnag mock
    vi.mocked(Bugsnag.notify).mockClear();
  });

  describe("clientInfo", () => {
    it("returns undefined before any clientInfo is set", () => {
      expect(server.getClientInfo()).toBeUndefined();
    });

    it("stores and returns the client info set via setClientInfo", () => {
      server.setClientInfo({ name: "Claude Code", version: "1.2.3" });

      expect(server.getClientInfo()).toEqual({
        name: "Claude Code",
        version: "1.2.3",
      });
    });

    it("overwrites previously stored client info", () => {
      server.setClientInfo({ name: "Claude Code", version: "1.2.3" });
      server.setClientInfo({ name: "Cursor", version: "0.9.0" });

      expect(server.getClientInfo()).toEqual({
        name: "Cursor",
        version: "0.9.0",
      });
    });
  });

  describe("addClient", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        name: "Test Product",
        capabilityPrefix: "test_product",
        configPrefix: "test-product",
        config: z.object({}),
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };
    });

    it("should register tools when client provides them", async () => {
      await server.addClient(mockClient);

      // The server should call the client's registerTools function
      expect(mockClient.registerTools).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
      );

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "Test Tool",
          summary: "A test tool",
          inputSchema: z.object({
            p1: z.string().describe("The input for the tool"),
          }),
        },
        registerCbMock,
      );

      expect(superRegisterToolMock).toHaveBeenCalledOnce();

      // Assert some of the details
      const registerToolParams = superRegisterToolMock.mock.calls[0];
      expect(registerToolParams[0]).toBe("test_product_test_tool");
      expect(registerToolParams[1].title).toBe("Test Product: Test Tool");
      expect(registerToolParams[1].description).toBe(
        "A test tool\n\n" +
          "**Parameters:**\n" +
          "- p1 (string) *required*: The input for the tool",
      );
      expect(registerToolParams[1].inputSchema.p1.toString()).toBe(
        z.string().describe("The input for the tool").toString(),
      );
      expect(registerToolParams[1].annotations).toEqual({
        title: "Test Product: Test Tool",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });

      // Get the wrapper function that will execute the tool and call it
      registerToolParams[2]();

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should throw error when asked to call non-configured tool", async () => {
      await server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "Test Tool",
          summary: "An non-configured tool",
        },
        registerCbMock,
      );

      // Get the wrapper function that will execute the tool and call it
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      mockClient.isConfigured.mockReturnValueOnce(false);

      const toolResponse = await registerToolParams[2]();

      expect(toolResponse.isError).toBe(true);
      expect(toolResponse.content?.[0].text).toBe(
        "Error executing Test Product: Test Tool: The tool is not configured - configuration options for Test Product are missing or invalid.",
      );
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should register tools with complex parameters", async () => {
      await server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      registerFn(
        {
          title: "Test Tool",
          summary: "A test tool",
          inputSchema: z.object({
            p1: z.string().describe("The input for the tool"),
            p2: z
              .number()
              .describe("The optional numeric input for the tool")
              .optional(),
            p3: z.boolean(),
            p4: z.array(z.string()),
            p5: z.object({
              key1: z.string(),
              key2: z.number(),
            }),
            p6: z.enum(["value1", "value2", "value3"]),
            p7: z.literal("value"),
            p8: z.union([z.literal("value1"), z.literal("value2")]),
            p9: z.any(),
          }),
          purpose: "To test the tool registration process",
          useCases: ["Testing", "Development"],
          examples: [
            {
              description: "Example 1",
              parameters: {
                p1: "example1",
                p2: 42,
              },
              expectedOutput: "Expected output for example 1",
            },
            {
              description: "Example 2",
              parameters: {
                p1: "example2",
                p2: 24,
              },
            },
          ],
          hints: ["First hint", "Second hint"],
          outputDescription: "The output description",
          readOnly: true,
          destructive: true,
          idempotent: true,
          openWorld: true,
        },
        vi.fn(),
      );

      // Assert some of the details
      const registerToolParams = superRegisterToolMock.mock.calls[0];
      expect(registerToolParams[0]).toBe("test_product_test_tool");
      expect(registerToolParams[1].title).toBe("Test Product: Test Tool");
      expect(registerToolParams[1].description).toBe(
        "A test tool\n\n" +
          "**Parameters:**\n" +
          "- p1 (string) *required*: The input for the tool\n" +
          "- p2 (number): The optional numeric input for the tool\n" +
          "- p3 (boolean) *required*\n" +
          "- p4 (array) *required*\n" +
          "- p5 (object) *required*\n" +
          "- p6 (enum) *required*\n" +
          "- p7 (literal) *required*\n" +
          "- p8 (union) *required*\n" +
          "- p9 (any) *required*\n\n" +
          "**Output Description:** The output description\n\n" +
          "**Use Cases:** 1. Testing 2. Development\n\n" +
          "**Examples:**\n" +
          "1. Example 1\n" +
          "```json\n" +
          "{\n" +
          '  "p1": "example1",\n' +
          '  "p2": 42\n' +
          "}\n" +
          "```\n" +
          "Expected Output: Expected output for example 1\n\n" +
          "2. Example 2\n" +
          "```json\n" +
          "{\n" +
          '  "p1": "example2",\n' +
          '  "p2": 24\n' +
          "}\n" +
          "```\n\n" +
          "**Hints:** 1. First hint 2. Second hint",
      );
      expect(registerToolParams[1].inputSchema.p1.toString()).toBe(
        z.string().describe("The input for the tool").toString(),
      );
      expect(registerToolParams[1].annotations).toEqual({
        title: "Test Product: Test Tool",
        readOnlyHint: true,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      });
      expect(registerToolParams[1].outputSchema).toBeUndefined();
    });

    it("should handle tool errors when registering tools", async () => {
      await server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "Test Tool",
          summary: "A test tool",
          parameters: [],
        },
        registerCbMock,
      );

      // Make the callback throw an error to test error handling
      registerCbMock.mockImplementation(() => {
        throw new ToolError("Tool error from registerCbMock");
      });

      // Get the wrapper function that will execute the tool and call it
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      expect(await registerToolParams[2]()).toEqual({
        isError: true,
        content: [
          {
            type: "text",
            text: "Error executing Test Product: Test Tool: Tool error from registerCbMock",
          },
        ],
      });

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors when registering tools", async () => {
      await server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test tool details
      const registerFn = mockClient.registerTools.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "Test Tool",
          summary: "A test tool",
          parameters: [],
        },
        registerCbMock,
      );

      // Make the callback throw an error to test error handling
      registerCbMock.mockImplementation(() => {
        throw new Error("Unexpected error from registerCbMock");
      });

      // Get the wrapper function that will execute the tool and call it
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      await expect(registerToolParams[2]()).rejects.toThrow(
        "Unexpected error from registerCbMock",
      );

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).toHaveBeenCalledExactlyOnceWith(
        expect.any(Error),
        expect.any(Function),
      );
    });

    it("should elicit input when client requires it", async () => {
      await server.addClient(mockClient);

      // The server should call the client's registerTools function
      expect(mockClient.registerTools).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
      );

      // Get the register function passed from the server and execute it with test tool details
      const getInputFn = mockClient.registerTools.mock.calls[0][1];
      const params = vi.mockObject({});
      const options = vi.mockObject({});
      await getInputFn(params, options);

      // Since elicitation is supported, the wrapper should call elicitInput
      expect(server.server.elicitInput).toHaveBeenCalledExactlyOnceWith(
        params,
        options,
      );
    });

    it("should register resources when client provides them", async () => {
      const mockClient = {
        name: "Test Product",
        capabilityPrefix: "test_product",
        configPrefix: "test-product",
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        config: z.object({}),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      await server.addClient(mockClient);

      // The server should call the client's registerResources function
      expect(mockClient.registerResources).toHaveBeenCalledWith(
        expect.any(Function),
      );

      // Get the register function passed from the server and execute it with test resource details
      const registerFn = mockClient.registerResources.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "Test Resource",
          path: "{identifier}",
          description: "A test resource",
        },
        registerCbMock,
      );

      expect(superRegisterResourceMock).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.any(ResourceTemplate),
        expect.any(Object),
        expect.any(Function),
      );

      // Assert some of the details
      const registerResourceParams = superRegisterResourceMock.mock.calls[0];
      expect(registerResourceParams[0]).toBe("test_product_test_resource");
      expect(registerResourceParams[1].uriTemplate.template).toBe(
        "test_product://test_resource/{identifier}",
      );
      expect(registerResourceParams[2]).toEqual({
        description: "A test resource",
        title: "Test Product: Test Resource",
      });

      // Get the wrapper function that will execute the tool and call it
      registerResourceParams[3]();

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should not register resources when client does not provide them", async () => {
      const mockClient = {
        name: "Test Product",
        capabilityPrefix: "test_product",
        configPrefix: "test-product",
        registerTools: vi.fn(),
        registerResources: undefined,
        config: z.object({}),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      await server.addClient(mockClient);

      // It should not crash with undefined registerResources function
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should handle errors when registering resources", async () => {
      await server.addClient(mockClient);

      // Get the register function passed from the server and execute it with test resource details
      const registerFn = mockClient.registerResources.mock.calls[0][0];
      const registerCbMock = vi.fn();
      registerFn(
        {
          title: "test_resource",
          path: "{identifier}",
          description: "A test resource",
        },
        registerCbMock,
      );

      // Make the callback throw an error to test error handling
      registerCbMock.mockImplementation(() => {
        throw new ToolError("Test error from registerCbMock");
      });

      // Get the wrapper function that will execute the resource and call it
      const registerResourceParams = superRegisterResourceMock.mock.calls[0];
      await expect(registerResourceParams[3]()).rejects.toThrow(
        "Test error from registerCbMock",
      );

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).toHaveBeenCalledExactlyOnceWith(
        expect.any(Error),
        expect.any(Function),
      );
    });

    it("should register tool with inputSchema and outputSchema, and handle structuredContent", async () => {
      await server.addClient(mockClient);
      const registerCbMock = vi.fn().mockResolvedValue({
        isError: false,
        structuredContent: {
          values: [
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ],
        },
      });

      const inputSchema = z.object({
        p1: z.string().describe("param-required-string"),
        p2: z.number().min(0).describe("param-optional-number").optional(),
        p3: z.number().describe("param-defaulted-number").default(1),
        p4: z
          .boolean()
          .default(false)
          .describe("param-defaulted-bool-described-after"),
      });
      const outputSchema = z.object({
        values: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          )
          .describe("List of values"),
      });

      const registerFn = mockClient.registerTools.mock.calls[0][0];
      registerFn(
        {
          title: "Search values",
          summary: "Tool using input and output schemas",
          inputSchema,
          outputSchema,
        },
        registerCbMock,
      );

      expect(superRegisterToolMock).toHaveBeenCalledOnce();
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      expect(registerToolParams[0]).toBe("test_product_search_values");
      expect(registerToolParams[1].title).toBe("Test Product: Search values");

      // Description should list parameters derived from inputSchema
      expect(registerToolParams[1].description).toBe(
        "Tool using input and output schemas\n\n" +
          "**Parameters:**\n" +
          "- p1 (string) *required*: param-required-string\n" +
          "- p2 (number): param-optional-number\n" +
          "- p3 (number): param-defaulted-number (default: 1)\n" +
          "- p4 (boolean): param-defaulted-bool-described-after (default: false)",
      );

      expect(Object.keys(registerToolParams[1].inputSchema).length).toBe(4);

      // Output schema should be raw shape of outputSchema
      expect(registerToolParams[1].outputSchema.values.toString()).toBe(
        z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          )
          .describe("List of values")
          .toString(),
      );

      // Execute wrapper function to validate structuredContent -> content conversion
      const result = await registerToolParams[2]({ query: "alpha" }, {});
      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(result.isError).toBe(false);
      expect(result.structuredContent?.values.length).toBe(2);
      expect(result.content?.[0].text).toBe(
        JSON.stringify(result.structuredContent),
      );
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should register tool with outputSchema and throw error if structuredContent is missing", async () => {
      await server.addClient(mockClient);
      const registerCbMock = vi.fn().mockResolvedValue({
        isError: false,
      });

      const outputSchema = z.object({
        values: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          )
          .describe("List of values"),
      });

      const registerFn = mockClient.registerTools.mock.calls[0][0];
      registerFn(
        {
          title: "Get values",
          summary: "Tool using output schema",
          outputSchema,
        },
        registerCbMock,
      );

      expect(superRegisterToolMock).toHaveBeenCalledOnce();
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      // Execute wrapper function to validate error on missing structuredContent
      await expect(registerToolParams[2]({}, {})).rejects.toThrow(
        "The result of the tool 'Get values' must include 'structuredContent'",
      );

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).toHaveBeenCalled();
    });

    it("should register tool with outputSchema and not throw error if structuredContent is missing but isError", async () => {
      await server.addClient(mockClient);
      const registerCbMock = vi.fn().mockResolvedValue({
        isError: true,
      });

      const outputSchema = z.object({
        values: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          )
          .describe("List of values"),
      });

      const registerFn = mockClient.registerTools.mock.calls[0][0];
      registerFn(
        {
          title: "Get values",
          summary: "Tool using output schema",
          outputSchema,
        },
        registerCbMock,
      );

      expect(superRegisterToolMock).toHaveBeenCalledOnce();
      const registerToolParams = superRegisterToolMock.mock.calls[0];

      // Execute wrapper function to validate no error on missing structuredContent when isError is true
      const result = await registerToolParams[2]({}, {});
      expect(result.isError).toBe(true);

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });
  });

  describe("cleanupSession", () => {
    it("should skip clients without cleanupSession and call those that have it", async () => {
      const clientWithCleanup = {
        name: "Test Product A",
        capabilityPrefix: "test_product_a",
        configPrefix: "test-product-a",
        config: z.object({}),
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
        cleanupSession: vi.fn().mockResolvedValue(undefined),
      };
      const clientWithoutCleanup = {
        name: "Test Product B",
        capabilityPrefix: "test_product_b",
        configPrefix: "test-product-b",
        config: z.object({}),
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      await server.addClient(clientWithCleanup);
      await server.addClient(clientWithoutCleanup);

      await expect(server.cleanupSession("session-abc")).resolves.not.toThrow();
      expect(clientWithCleanup.cleanupSession).toHaveBeenCalledOnce();
      expect(clientWithCleanup.cleanupSession).toHaveBeenCalledWith(
        "session-abc",
      );
    });
  });

  describe("toolset filtering", () => {
    let mockClient: any;
    let secondMockClient: any;
    let server: SmartBearMcpServer;
    let registerToolSpy: any;
    let registerFn: any;
    let setupServer: (
      enabledToolsets?: string,
      defaultToolsets?: string[],
    ) => Promise<void>;

    beforeEach(async () => {
      mockClient = {
        name: "Test Product",
        capabilityPrefix: "test_product",
        configPrefix: "test-product",
        config: z.object({}),
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };
      secondMockClient = {
        name: "Another Test Product",
        capabilityPrefix: "another_test_product",
        configPrefix: "another-test-product",
        config: z.object({}),
        registerTools: vi.fn(),
        registerResources: vi.fn(),
        configure: vi.fn(),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      setupServer = async (
        enabledToolsets?: string,
        defaultToolsets?: string[],
      ) => {
        server = new SmartBearMcpServer(enabledToolsets);
        registerToolSpy = vi
          .spyOn(
            Object.getPrototypeOf(Object.getPrototypeOf(server)),
            "registerTool",
          )
          .mockImplementation(vi.fn());

        mockClient.defaultToolsets = defaultToolsets;
        await server.addClient(mockClient);
        registerFn = mockClient.registerTools.mock.calls[0][0];
        await server.addClient(secondMockClient);
      };
    });

    it("should register all tools when enabled toolsets is not set", async () => {
      await setupServer();
      // Tool with a toolset
      const result1 = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupA" },
        vi.fn(),
      );
      // Tool without a toolset
      const result2 = registerFn({ title: "Tool B", summary: "B" }, vi.fn());

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });

    it("should register tools whose toolset matches enabled toolsets", async () => {
      await setupServer("test-product:groupa");

      const result = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupA" },
        vi.fn(),
      );

      expect(result).not.toBeNull();
      expect(registerToolSpy).toHaveBeenCalledOnce();
    });

    it("should skip tools whose toolset does not match enabled toolsets", async () => {
      await setupServer("test-product:groupa");
      const result = registerFn(
        { title: "Tool B", summary: "B", toolset: "groupB" },
        vi.fn(),
      );

      expect(result).toBeNull();
      expect(registerToolSpy).not.toHaveBeenCalled();
    });

    it("should register tools default tools of client", async () => {
      await setupServer("test-product:groupa", ["default-group"]);

      let result = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupa" },
        vi.fn(),
      );
      expect(result).not.toBeNull();

      result = registerFn(
        { title: "Default Tool", summary: "Default", toolset: "default-group" },
        vi.fn(),
      );
      expect(result).not.toBeNull();

      expect(registerToolSpy).toHaveBeenCalledTimes(2);
    });

    it("should register tools default tools of client, if other toolsets are enabled", async () => {
      await setupServer("test-product:groupa", ["default-group"]);

      let result = registerFn(
        { title: "Tool C", summary: "C", toolset: "groupa" },
        vi.fn(),
      );
      expect(result).not.toBeNull();

      result = registerFn(
        { title: "Default Tool", summary: "Default", toolset: "default-group" },
        vi.fn(),
      );
      expect(result).not.toBeNull();

      expect(registerToolSpy).toHaveBeenCalledTimes(2);
    });

    it("should not register default tools of client if no other toolsets are enabled", async () => {
      await setupServer("another-test-product:groupb", ["default-group"]);

      const result = registerFn(
        { title: "Default Tool", summary: "Default", toolset: "default-group" },
        vi.fn(),
      );
      expect(result).toBeNull();

      expect(registerToolSpy).not.toHaveBeenCalled();
    });

    it("should support multiple toolsets in MCP_TOOLSETS", async () => {
      await setupServer("test-product:groupa,test-product:groupb");

      const resultA = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupA" },
        vi.fn(),
      );
      const resultB = registerFn(
        { title: "Tool B", summary: "B", toolset: "groupB" },
        vi.fn(),
      );
      const resultC = registerFn(
        { title: "Tool C", summary: "C", toolset: "groupC" },
        vi.fn(),
      );

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(resultC).toBeNull();
      expect(registerToolSpy).toHaveBeenCalledTimes(2);
    });

    it("should register all tools when just the client name is in toolsets", async () => {
      await setupServer("test-product");

      const resultA = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupA" },
        vi.fn(),
      );

      expect(resultA).not.toBeNull();
      expect(registerToolSpy).toHaveBeenCalledTimes(1);
    });

    it("should not register any tools when a different client is enabled in toolsets", async () => {
      await setupServer("another-test-product");

      const resultA = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupA" },
        vi.fn(),
      );

      expect(resultA).toBeNull();
      expect(registerToolSpy).not.toHaveBeenCalled();
    });

    it("should match toolsets case-insensitively", async () => {
      await setupServer("Test-Product:GroupA");

      const result = registerFn(
        { title: "Tool A", summary: "A", toolset: "groupa" },
        vi.fn(),
      );

      expect(result).not.toBeNull();
    });
  });

  describe("schemaToRawShape", () => {
    it("should convert Zod schema to raw shape", () => {
      const schema = z.object({
        name: z.string().describe("The name of the person"),
        age: z.number().min(0).describe("The age of the person"),
        isActive: z.boolean().describe("Is the person active?"),
      });
      // biome-ignore lint/complexity/useLiteralKeys: accessing internal method for test
      const result = server["schemaToRawShape"](schema);
      expect(result).toEqual(schema.shape);
    });
    it("returns an empty object if it's not a ZodObject", () => {
      const schema = z.array(z.string());
      // biome-ignore lint/complexity/useLiteralKeys: accessing internal method for test
      const rawShape = server["schemaToRawShape"](schema);
      expect(rawShape).toBeUndefined();
    });
    it("returns an empty object if the schema is undefined", () => {
      // biome-ignore lint/complexity/useLiteralKeys: accessing internal method for test
      const rawShape = server["schemaToRawShape"](undefined);
      expect(rawShape).toBeUndefined();
    });
  });

  describe("isToolEnabled", () => {
    const mockClient = {
      name: "Test Product",
      configPrefix: "test-product",
      capabilityPrefix: "test_product",
      config: z.object({}),
      configure: vi.fn(),
      isConfigured: vi.fn(),
      registerTools: vi.fn(),
    };

    it("should enable all tools when no toolsets are configured", () => {
      const server = new SmartBearMcpServer();
      expect(server.isToolEnabled(mockClient, "anything")).toBe(true);
    });

    it("should enable tool when client is listed", () => {
      const server = new SmartBearMcpServer("test-product");
      expect(server.isToolEnabled(mockClient, "anything")).toBe(true);
    });

    it("should enable tool when its toolset matches an enabled entry", () => {
      const server = new SmartBearMcpServer("test-product:errors");
      expect(server.isToolEnabled(mockClient, "errors")).toBe(true);
    });

    it("should disable tool when its toolset does not match any enabled entry", () => {
      const server = new SmartBearMcpServer("test-product:errors");
      expect(server.isToolEnabled(mockClient, "releases")).toBe(false);
    });

    it("should disable tool when client prefix does not match any enabled toolset", () => {
      const server = new SmartBearMcpServer("other-product:errors");
      expect(server.isToolEnabled(mockClient, "errors")).toBe(false);
    });

    it("should handle toolset name normalization (spaces, hyphens, underscores)", () => {
      const server = new SmartBearMcpServer("test-product:mytools");
      expect(server.isToolEnabled(mockClient, "my-tools")).toBe(true);
      expect(server.isToolEnabled(mockClient, "my_tools")).toBe(true);
      expect(server.isToolEnabled(mockClient, "my tools")).toBe(true);
    });

    it("should be case-insensitive", () => {
      const server = new SmartBearMcpServer("Test-Product:Errors");
      expect(server.isToolEnabled(mockClient, "errors")).toBe(true);
    });

    it("should enable default toolsets when specific toolsets are configured for the client", () => {
      const client = { ...mockClient, defaultToolsets: ["default-set"] };
      const server = new SmartBearMcpServer("test-product:errors");
      expect(server.isToolEnabled(client, "default-set")).toBe(true);
    });

    it("should not enable default toolsets when no specific toolsets are configured for the client", () => {
      const client = { ...mockClient, defaultToolsets: ["default-set"] };
      const server = new SmartBearMcpServer("other-product:errors");
      expect(server.isToolEnabled(client, "default-set")).toBe(false);
    });

    it("should support multiple toolset entries for the same client", () => {
      const server = new SmartBearMcpServer(
        "test-product:errors,test-product:releases",
      );
      expect(server.isToolEnabled(mockClient, "errors")).toBe(true);
      expect(server.isToolEnabled(mockClient, "releases")).toBe(true);
      expect(server.isToolEnabled(mockClient, "other")).toBe(false);
    });
  });
});

// cspell:ignore groupa groupb
