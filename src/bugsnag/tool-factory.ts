import { BugsnagTool } from "./types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { ToolError } from "../common/types.js";

/**
 * Interface for tool class constructors
 */
export interface ToolConstructor {
  new(): BugsnagTool;
}

/**
 * Tool Factory class for automatic tool discovery and instantiation
 */
export class BugsnagToolFactory {

  /**
   * Discover tool files in the tools directory
   */
  private static async discoverToolFiles(toolsDir: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(toolsDir, { withFileTypes: true, recursive: true });
      return files
        .filter(file => file.isFile() && (file.name.endsWith("-tool.ts") || file.name.endsWith("-tool.js")))
        .map(file => path.join(file.parentPath, file.name));
    } catch (error) {
      throw new ToolError(
        `Failed to read tools directory: ${error}`,
        "ToolFactory",
        error as Error
      );
    }
  }

  /**
   * Dynamically import a tool class from a file
   */
  private static async importToolClass(filePath: string): Promise<ToolConstructor | null> {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      
      // Find the exported tool class (should be the class that extends BaseBugsnagTool)
      const toolClass = Object.values(module).find(
        (exportedItem: any) => 
          typeof exportedItem === 'function'
      ) as ToolConstructor;

      return toolClass;
    } catch (error) {
      console.warn(`Failed to import tool from ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Get all tool classes through filesystem discovery
   */
  private static async getToolClasses(toolDirectories: string[]): Promise<ToolConstructor[]> {

    // Discover tool files from inside the package first and then from any configured locations
    const toolsDirPath = path.join(path.dirname(import.meta.filename), "tools");
    const toolFiles = await this.discoverToolFiles(toolsDirPath);
    for (const dir of toolDirectories) {
      toolFiles.push(...await this.discoverToolFiles(dir));
    }
    
    // Import tool classes
    const toolClasses: ToolConstructor[] = [];
    for (const filename of toolFiles) {
      const ToolClass = await this.importToolClass(filename);
      if (ToolClass) {
        toolClasses.push(ToolClass);
      }
    }
    return toolClasses;
  }

  /**
   * Discover and instantiate all available tools based on configuration
   */
  static async discoverTools(toolDirectories: string[]): Promise<BugsnagTool[]> {
    const tools: BugsnagTool[] = [];
    const toolClasses = await this.getToolClasses(toolDirectories);
    for (const ToolClass of toolClasses) {
      try {
        
        const tool = new ToolClass();
        // Validate that the tool implements the required interface
        this.validateTool(tool);
        tools.push(tool);
      } catch (error) {
        throw new ToolError(
          `Failed to instantiate tool class ${ToolClass.name}: ${error}`,
          "ToolFactory",
          error as Error
        );
      }
    }
    return tools;
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
}
