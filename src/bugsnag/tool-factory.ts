/**
 * Tool Factory for automatic discovery and instantiation of Bugsnag tools
 */

import { BugsnagTool, BugsnagToolError } from "./types.js";

// Import all tool classes for auto-discovery
import { ListProjectsTool } from "./tools/list-projects-tool.js";
import { GetErrorTool } from "./tools/get-error-tool.js";
import { GetEventDetailsTool } from "./tools/get-event-details-tool.js";
import { ListProjectErrorsTool } from "./tools/list-project-errors-tool.js";
import { ListProjectEventFiltersTool } from "./tools/list-project-event-filters-tool.js";
import { UpdateErrorTool } from "./tools/update-error-tool.js";
import { ListBuildsTool } from "./tools/list-builds-tool.js";
import { GetBuildTool } from "./tools/get-build-tool.js";
import { ListBuildsInReleaseTool } from "./tools/list-builds-in-release-tool.js";
import { ListReleasesTool } from "./tools/list-releases-tool.js";
import { GetReleaseTool } from "./tools/get-release-tool.js";

/**
 * Interface for tool class constructors
 */
export interface ToolConstructor {
  new(): BugsnagTool;
}

/**
 * Configuration for tool discovery
 */
export interface ToolDiscoveryConfig {
  /** Whether to include the ListProjectsTool (only when no project API key is configured) */
  includeListProjects?: boolean;
  /** Custom tool classes to include in addition to the default ones */
  customTools?: ToolConstructor[];
  /** Tool names to exclude from discovery */
  excludeTools?: string[];
}

/**
 * Tool Factory class for automatic tool discovery and instantiation
 */
export class BugsnagToolFactory {
  private static readonly DEFAULT_TOOL_CLASSES: ToolConstructor[] = [
    GetErrorTool,
    GetEventDetailsTool,
    ListProjectErrorsTool,
    ListProjectEventFiltersTool,
    UpdateErrorTool,
    ListBuildsTool,
    GetBuildTool,
    ListBuildsInReleaseTool,
    ListReleasesTool,
    GetReleaseTool
  ];

  private static toolInstanceCache = new Map<string, BugsnagTool>();

  /**
   * Discover and instantiate all available tools based on configuration
   */
  static discoverTools(config: ToolDiscoveryConfig = {}): BugsnagTool[] {
    const tools: BugsnagTool[] = [];
    const toolClasses = this.getToolClasses(config);

    for (const ToolClass of toolClasses) {
      try {
        // Use cached instance if available (tools are stateless)
        const cacheKey = ToolClass.name;
        let tool = this.toolInstanceCache.get(cacheKey);

        if (!tool) {
          tool = new ToolClass();
          // Validate that the tool implements the required interface
          this.validateTool(tool);
          this.toolInstanceCache.set(cacheKey, tool);
        }

        // Skip excluded tools
        if (config.excludeTools?.includes(tool.name)) {
          continue;
        }

        tools.push(tool);
      } catch (error) {
        throw new BugsnagToolError(
          `Failed to instantiate tool class ${ToolClass.name}: ${error}`,
          "ToolFactory",
          error as Error
        );
      }
    }

    return tools;
  }

  /**
   * Get all tool classes based on configuration
   */
  private static getToolClasses(config: ToolDiscoveryConfig): ToolConstructor[] {
    const toolClasses: ToolConstructor[] = [...this.DEFAULT_TOOL_CLASSES];

    // Add ListProjectsTool if configured
    if (config.includeListProjects) {
      toolClasses.unshift(ListProjectsTool);
    }

    // Add custom tools if provided
    if (config.customTools) {
      toolClasses.push(...config.customTools);
    }

    return toolClasses;
  }

  /**
   * Validate that a tool instance implements the required interface
   */
  private static validateTool(tool: any): asserts tool is BugsnagTool {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name property');
    }

    if (!tool.definition || typeof tool.definition !== 'object') {
      throw new Error('Tool must have a valid definition property');
    }

    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error('Tool must have a valid execute method');
    }

    // Validate definition structure
    const { definition } = tool;
    const requiredFields = ['title', 'summary', 'purpose', 'useCases', 'parameters', 'examples', 'hints'];

    for (const field of requiredFields) {
      if (!(field in definition)) {
        throw new Error(`Tool definition must have a '${field}' property`);
      }
    }

    if (!Array.isArray(definition.parameters)) {
      throw new Error('Tool definition parameters must be an array');
    }

    if (!Array.isArray(definition.examples)) {
      throw new Error('Tool definition examples must be an array');
    }

    if (!Array.isArray(definition.hints)) {
      throw new Error('Tool definition hints must be an array');
    }

    if (!Array.isArray(definition.useCases)) {
      throw new Error('Tool definition useCases must be an array');
    }
  }

  /**
   * Create a tool instance by name (optimized for single tool creation)
   */
  static createTool(toolName: string, config: ToolDiscoveryConfig = {}): BugsnagTool | null {
    // Use full discovery to respect configuration
    const tools = this.discoverTools(config);
    return tools.find(tool => tool.name === toolName) || null;
  }

  /**
   * Clear the tool instance cache (useful for testing)
   */
  static clearCache(): void {
    this.toolInstanceCache.clear();
  }

  /**
   * Get all available tool names
   */
  static getAvailableToolNames(config: ToolDiscoveryConfig = {}): string[] {
    const tools = this.discoverTools(config);
    return tools.map(tool => tool.name);
  }

  /**
   * Check if a tool is available
   */
  static isToolAvailable(toolName: string, config: ToolDiscoveryConfig = {}): boolean {
    return this.getAvailableToolNames(config).includes(toolName);
  }

  /**
   * Get tool count based on configuration
   */
  static getToolCount(config: ToolDiscoveryConfig = {}): number {
    return this.discoverTools(config).length;
  }
}
