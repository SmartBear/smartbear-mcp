import { describe, it, expect, beforeEach } from 'vitest';
import {
  BugsnagToolRegistry,
  BaseBugsnagTool,
  BugsnagToolError,
  ToolDefinition,
  ToolExecutionContext,
  ToolResult
} from '../../../bugsnag/tools/index.js';
import { z } from 'zod';

// Mock tool for testing
class MockTool extends BaseBugsnagTool {
  readonly name = "mock_tool";
  readonly definition: ToolDefinition = {
    title: "Mock Tool",
    summary: "A mock tool for testing",
    purpose: "Testing the tool interface",
    useCases: ["Testing"],
    parameters: [
      {
        name: "testParam",
        type: z.string(),
        required: true,
        description: "A test parameter",
        examples: ["test"]
      }
    ],
    examples: [
      {
        description: "Test example",
        parameters: { testParam: "test" },
        expectedOutput: "Mock result"
      }
    ],
    hints: ["This is a test tool"]
  };

  async execute(args: any, _context: ToolExecutionContext): Promise<ToolResult> {
    this.validateArgs(args);
    return this.createResult({ message: `Hello ${args.testParam}` });
  }
}

describe('BugsnagToolRegistry', () => {
  let registry: BugsnagToolRegistry;

  beforeEach(() => {
    registry = new BugsnagToolRegistry();
  });

  it('should register and retrieve tools', () => {
    const tool = new MockTool();
    registry.registerTool(tool);

    expect(registry.hasTool('mock_tool')).toBe(true);
    expect(registry.getTool('mock_tool')).toBe(tool);
    expect(registry.getToolCount()).toBe(1);
  });

  it('should prevent duplicate tool registration', () => {
    const tool1 = new MockTool();
    const tool2 = new MockTool();

    registry.registerTool(tool1);

    expect(() => registry.registerTool(tool2)).toThrow(BugsnagToolError);
  });

  it('should return all registered tools', () => {
    const tool = new MockTool();
    registry.registerTool(tool);

    const allTools = registry.getAllTools();
    expect(allTools).toHaveLength(1);
    expect(allTools[0]).toBe(tool);
  });

  it('should clear all tools', () => {
    const tool = new MockTool();
    registry.registerTool(tool);

    expect(registry.getToolCount()).toBe(1);

    registry.clear();

    expect(registry.getToolCount()).toBe(0);
    expect(registry.hasTool('mock_tool')).toBe(false);
  });
});

describe('BaseBugsnagTool', () => {
  let tool: MockTool;

  beforeEach(() => {
    tool = new MockTool();
  });

  it('should validate required parameters', () => {
    expect(() => tool['validateArgs']({})).toThrow(BugsnagToolError);
    expect(() => tool['validateArgs']({ testParam: null })).toThrow(BugsnagToolError);
    expect(() => tool['validateArgs']({ testParam: "valid" })).not.toThrow();
  });

  it('should validate parameter types', () => {
    expect(() => tool['validateArgs']({ testParam: 123 })).toThrow(BugsnagToolError);
    expect(() => tool['validateArgs']({ testParam: "valid" })).not.toThrow();
  });

  it('should create successful results', () => {
    const data = { message: "test" };
    const result = tool['createResult'](data);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(JSON.stringify(data));
    expect(result.isError).toBeUndefined();
  });

  it('should create error results', () => {
    const message = "Test error";
    const result = tool['createErrorResult'](message);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(message);
    expect(result.isError).toBe(true);
  });
});

describe('BugsnagToolError', () => {
  it('should create error with tool name', () => {
    const error = new BugsnagToolError("Test message", "test_tool");

    expect(error.message).toBe("Test message");
    expect(error.toolName).toBe("test_tool");
    expect(error.name).toBe("BugsnagToolError");
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new Error("Original error");
    const error = new BugsnagToolError("Test message", "test_tool", cause);

    expect(error.cause).toBe(cause);
  });
});
