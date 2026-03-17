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

  describe("addClient", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        name: "Test Product",
        toolPrefix: "test_product",
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
          parameters: [
            {
              name: "p1",
              type: z.string(),
              required: true,
              description: "The input for the tool",
            },
          ],
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
          parameters: [
            {
              name: "p1",
              type: z.string(),
              required: true,
              description: "The input for the tool",
              examples: ["example1", "example2"],
              constraints: ["constraint1", "constraint2"],
            },
            {
              name: "p2",
              type: z.number(),
              required: false,
              description: "The optional numeric input for the tool",
            },
            {
              name: "p3",
              type: z.boolean(),
              required: true,
            },
            {
              name: "p4",
              type: z.array(z.string()),
              required: true,
            },
            {
              name: "p5",
              type: z.object({
                key1: z.string(),
                key2: z.number(),
              }),
              required: true,
            },
            {
              name: "p6",
              type: z.enum(["value1", "value2", "value3"]),
              required: true,
            },
            {
              name: "p7",
              type: z.literal("value"),
              required: true,
            },
            {
              name: "p8",
              type: z.union([z.literal("value1"), z.literal("value2")]),
              required: true,
            },
            {
              name: "p9",
              type: z.any(),
              required: true,
            },
          ],
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
          "- p1 (string) *required*: The input for the tool (e.g. example1, example2)\n" +
          "  - constraint1\n" +
          "  - constraint2\n" +
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
        toolPrefix: "test_product",
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
      registerFn("test_resource", "{identifier}", registerCbMock);

      expect(superRegisterResourceMock).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        expect.any(ResourceTemplate),
        expect.any(Object),
        expect.any(Function),
      );

      // Assert some of the details
      const registerResourceParams = superRegisterResourceMock.mock.calls[0];
      expect(registerResourceParams[0]).toBe("test_resource");
      expect(registerResourceParams[1].uriTemplate.template).toBe(
        "test_product://test_resource/{identifier}",
      );

      // Get the wrapper function that will execute the tool and call it
      registerResourceParams[3]();

      expect(registerCbMock).toHaveBeenCalledOnce();
      expect(vi.mocked(Bugsnag.notify)).not.toHaveBeenCalled();
    });

    it("should not register resources when client does not provide them", async () => {
      const mockClient = {
        name: "Test Product",
        toolPrefix: "test_product",
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
      registerFn("test_resource", "{identifier}", registerCbMock);

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

  describe("getReadableTypeName", () => {
    it.each([
      ["string", z.string()],
      ["number", z.number()],
      ["boolean", z.boolean()],
      ["array", z.array(z.string())],
      ["object", z.object({ key: z.string() })],
      ["enum", z.enum(["value1", "value2"])],
      ["literal", z.literal("value")],
      ["union", z.union([z.string(), z.number()])],
      ["record<string, number>", z.record(z.string(), z.number())],
      ["record<string, array>", z.record(z.string(), z.array(z.string()))],
      ["any", z.any()],
      ["string", z.optional(z.string())],
      ["string", z.string().default("default")],
    ])("should return '%s' for the given Zod type", (expected, zodType) => {
      // biome-ignore lint/complexity/useLiteralKeys: accessing internal method for test
      const result = server["getReadableTypeName"](zodType);
      expect(result).toBe(expected);
    });
  });
});
