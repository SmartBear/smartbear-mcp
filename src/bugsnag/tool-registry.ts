import { BugsnagTool, ToolRegistry, ToolExecutionContext, BugsnagToolError } from "./types.js";
import { RegisterToolsFunction } from "../common/types.js";
import { BugsnagToolFactory, ToolDiscoveryConfig } from "./tool-factory.js";

/**
 * Registry for managing Bugsnag tool discovery and registration
 */
export class BugsnagToolRegistry implements ToolRegistry {
  private tools: Map<string, BugsnagTool> = new Map();
  private discoveredTools: BugsnagTool[] | null = null;
  private lastDiscoveryConfig: ToolDiscoveryConfig | undefined = undefined;

  /**
   * Register a single tool
   */
  registerTool(tool: BugsnagTool): void {
    if (this.tools.has(tool.name)) {
      throw new BugsnagToolError(
        `Tool with name '${tool.name}' is already registered`,
        "ToolRegistry"
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): BugsnagTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): BugsnagTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Discover and return all available tools using automatic discovery with caching
   */
  discoverTools(config?: ToolDiscoveryConfig): BugsnagTool[] {
    // Use cached discovery if config hasn't changed
    if (this.discoveredTools && this.configEquals(this.lastDiscoveryConfig, config)) {
      return this.discoveredTools;
    }

    this.discoveredTools = BugsnagToolFactory.discoverTools(config);
    this.lastDiscoveryConfig = config ? { ...config } : undefined;
    return this.discoveredTools;
  }

  /**
   * Compare two discovery configurations for equality
   */
  private configEquals(config1?: ToolDiscoveryConfig, config2?: ToolDiscoveryConfig): boolean {
    if (!config1 && !config2) return true;
    if (!config1 || !config2) return false;

    return (
      config1.includeListProjects === config2.includeListProjects &&
      JSON.stringify(config1.excludeTools?.sort()) === JSON.stringify(config2.excludeTools?.sort()) &&
      config1.customTools?.length === config2.customTools?.length
    );
  }

  /**
   * Register all discovered tools with the MCP server
   */
  registerAllTools(register: RegisterToolsFunction, context: ToolExecutionContext, config?: ToolDiscoveryConfig): void {
    const tools = this.discoverTools(config);

    // Clear existing tools and register discovered ones
    this.clear();

    for (const tool of tools) {
      // Register the tool in our internal registry
      this.registerTool(tool);

      // Convert our tool definition to the MCP server format
      const toolParams = {
        title: tool.definition.title,
        summary: tool.definition.summary,
        purpose: tool.definition.purpose,
        useCases: tool.definition.useCases,
        parameters: tool.definition.parameters.map(param => ({
          name: param.name,
          type: param.type,
          required: param.required,
          description: param.description,
          examples: param.examples,
          constraints: param.constraints
        })),
        examples: tool.definition.examples,
        hints: tool.definition.hints,
        outputFormat: tool.definition.outputFormat
      };

      // Register the tool with the MCP server
      register(toolParams, async (args: any) => {
        try {
          const result = await tool.execute(args, context);
          return result;
        } catch (error) {
          if (error instanceof BugsnagToolError) {
            return {
              content: [{ type: "text", text: error.message }],
              isError: true
            };
          }

          // Wrap unexpected errors
          const wrappedError = new BugsnagToolError(
            `Unexpected error in tool '${tool.name}': ${error}`,
            tool.name,
            error as Error
          );

          return {
            content: [{ type: "text", text: wrappedError.message }],
            isError: true
          };
        }
      });
    }
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    this.discoveredTools = null;
    this.lastDiscoveryConfig = undefined;
  }

  /**
   * Get the count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
