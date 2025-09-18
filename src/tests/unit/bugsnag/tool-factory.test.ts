/**
 * Unit tests for BugsnagToolFactory
 */

import { describe, it, expect } from "vitest";
import { BugsnagToolFactory, ToolDiscoveryConfig } from "../../../bugsnag/tool-factory.js";
import { BugsnagTool, BugsnagToolError } from "../../../bugsnag/types.js";

describe("BugsnagToolFactory", () => {
  describe("discoverTools", () => {
    it("should discover all default tools when no config is provided", () => {
      const tools = BugsnagToolFactory.discoverTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Should not include ListProjectsTool by default
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).not.toContain("list_projects");

      // Should include other core tools
      expect(toolNames).toContain("get_error");
      expect(toolNames).toContain("get_event_details");
      expect(toolNames).toContain("list_project_errors");
    });

    it("should include ListProjectsTool when configured", () => {
      const config: ToolDiscoveryConfig = {
        includeListProjects: true
      };

      const tools = BugsnagToolFactory.discoverTools(config);
      const toolNames = tools.map(tool => tool.name);

      expect(toolNames).toContain("list_projects");
    });

    it("should exclude specified tools", () => {
      const config: ToolDiscoveryConfig = {
        excludeTools: ["get_error", "get_event_details"]
      };

      const tools = BugsnagToolFactory.discoverTools(config);
      const toolNames = tools.map(tool => tool.name);

      expect(toolNames).not.toContain("get_error");
      expect(toolNames).not.toContain("get_event_details");
      expect(toolNames).toContain("list_project_errors"); // Should still include others
    });

    it("should include custom tools when provided", () => {
      // Create a mock custom tool
      class CustomTool implements BugsnagTool {
        readonly name = "custom_tool";
        readonly definition = {
          title: "Custom Tool",
          summary: "A custom test tool",
          purpose: "Testing custom tool discovery",
          useCases: ["Testing"],
          parameters: [],
          examples: [],
          hints: []
        };

        async execute() {
          return { content: [{ type: "text" as const, text: "custom result" }] };
        }
      }

      const config: ToolDiscoveryConfig = {
        customTools: [CustomTool]
      };

      const tools = BugsnagToolFactory.discoverTools(config);
      const toolNames = tools.map(tool => tool.name);

      expect(toolNames).toContain("custom_tool");
    });

    it("should validate tool instances", () => {
      // Create an invalid tool class
      class InvalidTool {
        // Missing required properties
      }

      const config: ToolDiscoveryConfig = {
        customTools: [InvalidTool as any]
      };

      expect(() => {
        BugsnagToolFactory.discoverTools(config);
      }).toThrow(BugsnagToolError);
    });

    it("should return tools with valid interface", () => {
      const tools = BugsnagToolFactory.discoverTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe("string");
        expect(tool.definition).toBeDefined();
        expect(typeof tool.definition).toBe("object");
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe("function");

        // Validate definition structure
        expect(tool.definition.title).toBeDefined();
        expect(tool.definition.summary).toBeDefined();
        expect(tool.definition.purpose).toBeDefined();
        expect(Array.isArray(tool.definition.useCases)).toBe(true);
        expect(Array.isArray(tool.definition.parameters)).toBe(true);
        expect(Array.isArray(tool.definition.examples)).toBe(true);
        expect(Array.isArray(tool.definition.hints)).toBe(true);
      }
    });
  });

  describe("createTool", () => {
    it("should create a tool by name", () => {
      const tool = BugsnagToolFactory.createTool("get_error");

      expect(tool).toBeDefined();
      expect(tool?.name).toBe("get_error");
    });

    it("should return null for unknown tool name", () => {
      const tool = BugsnagToolFactory.createTool("unknown_tool");

      expect(tool).toBeNull();
    });

    it("should respect configuration when creating tools", () => {
      const config: ToolDiscoveryConfig = {
        includeListProjects: true
      };

      const tool = BugsnagToolFactory.createTool("list_projects", config);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("list_projects");

      // Without config, should return null
      const toolWithoutConfig = BugsnagToolFactory.createTool("list_projects");
      expect(toolWithoutConfig).toBeNull();
    });
  });

  describe("getAvailableToolNames", () => {
    it("should return array of tool names", () => {
      const toolNames = BugsnagToolFactory.getAvailableToolNames();

      expect(Array.isArray(toolNames)).toBe(true);
      expect(toolNames.length).toBeGreaterThan(0);
      expect(toolNames).toContain("get_error");
      expect(toolNames).not.toContain("list_projects");
    });

    it("should include ListProjectsTool when configured", () => {
      const config: ToolDiscoveryConfig = {
        includeListProjects: true
      };

      const toolNames = BugsnagToolFactory.getAvailableToolNames(config);
      expect(toolNames).toContain("list_projects");
    });

    it("should exclude specified tools", () => {
      const config: ToolDiscoveryConfig = {
        excludeTools: ["get_error"]
      };

      const toolNames = BugsnagToolFactory.getAvailableToolNames(config);
      expect(toolNames).not.toContain("get_error");
    });
  });

  describe("isToolAvailable", () => {
    it("should return true for available tools", () => {
      expect(BugsnagToolFactory.isToolAvailable("get_error")).toBe(true);
      expect(BugsnagToolFactory.isToolAvailable("get_event_details")).toBe(true);
    });

    it("should return false for unavailable tools", () => {
      expect(BugsnagToolFactory.isToolAvailable("unknown_tool")).toBe(false);
      expect(BugsnagToolFactory.isToolAvailable("list_projects")).toBe(false);
    });

    it("should respect configuration", () => {
      const config: ToolDiscoveryConfig = {
        includeListProjects: true
      };

      expect(BugsnagToolFactory.isToolAvailable("list_projects", config)).toBe(true);

      const excludeConfig: ToolDiscoveryConfig = {
        excludeTools: ["get_error"]
      };

      expect(BugsnagToolFactory.isToolAvailable("get_error", excludeConfig)).toBe(false);
    });
  });

  describe("getToolCount", () => {
    it("should return correct tool count", () => {
      const count = BugsnagToolFactory.getToolCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    });

    it("should include ListProjectsTool in count when configured", () => {
      const defaultCount = BugsnagToolFactory.getToolCount();

      const config: ToolDiscoveryConfig = {
        includeListProjects: true
      };

      const countWithListProjects = BugsnagToolFactory.getToolCount(config);
      expect(countWithListProjects).toBe(defaultCount + 1);
    });

    it("should exclude tools from count when configured", () => {
      const defaultCount = BugsnagToolFactory.getToolCount();

      const config: ToolDiscoveryConfig = {
        excludeTools: ["get_error", "get_event_details"]
      };

      const countWithExclusions = BugsnagToolFactory.getToolCount(config);
      expect(countWithExclusions).toBe(defaultCount - 2);
    });
  });

  describe("tool validation", () => {
    it("should validate tool name", () => {
      class InvalidNameTool {
        // Missing name property
        readonly definition = {
          title: "Test",
          summary: "Test",
          purpose: "Test",
          useCases: [],
          parameters: [],
          examples: [],
          hints: []
        };
        async execute() {
          return { content: [{ type: "text" as const, text: "test" }] };
        }
      }

      const config: ToolDiscoveryConfig = {
        customTools: [InvalidNameTool as any]
      };

      expect(() => {
        BugsnagToolFactory.discoverTools(config);
      }).toThrow("Tool must have a valid name property");
    });

    it("should validate tool definition", () => {
      class InvalidDefinitionTool {
        readonly name = "test_tool";
        // Missing definition property
        async execute() {
          return { content: [{ type: "text" as const, text: "test" }] };
        }
      }

      const config: ToolDiscoveryConfig = {
        customTools: [InvalidDefinitionTool as any]
      };

      expect(() => {
        BugsnagToolFactory.discoverTools(config);
      }).toThrow("Tool must have a valid definition property");
    });

    it("should validate execute method", () => {
      class InvalidExecuteTool {
        readonly name = "test_tool";
        readonly definition = {
          title: "Test",
          summary: "Test",
          purpose: "Test",
          useCases: [],
          parameters: [],
          examples: [],
          hints: []
        };
        // Missing execute method
      }

      const config: ToolDiscoveryConfig = {
        customTools: [InvalidExecuteTool as any]
      };

      expect(() => {
        BugsnagToolFactory.discoverTools(config);
      }).toThrow("Tool must have a valid execute method");
    });

    it("should validate definition structure", () => {
      class InvalidDefinitionStructureTool {
        readonly name = "test_tool";
        readonly definition = {
          title: "Test",
          // Missing required fields
        };
        async execute() {
          return { content: [{ type: "text" as const, text: "test" }] };
        }
      }

      const config: ToolDiscoveryConfig = {
        customTools: [InvalidDefinitionStructureTool as any]
      };

      expect(() => {
        BugsnagToolFactory.discoverTools(config);
      }).toThrow(/Tool definition must have a .* property/);
    });
  });
});
