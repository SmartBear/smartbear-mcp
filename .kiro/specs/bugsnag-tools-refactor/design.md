# Design Document

## Overview

This design outlines the refactoring of the Bugsnag client's monolithic tool registration system into a modular, maintainable architecture. The current implementation has all 10+ tools defined in a single 1200+ line `registerTools` method, making it difficult to maintain, test, and extend.

The refactored architecture will separate each tool into its own module while maintaining backward compatibility and introducing consistent patterns for tool development.

## Architecture

### Current Architecture Issues

- **Monolithic Design**: All tools are defined in a single large method
- **Tight Coupling**: Tools are tightly coupled to the BugsnagClient class
- **Testing Challenges**: Difficult to test individual tools in isolation
- **Maintenance Overhead**: Changes to one tool risk affecting others
- **Code Duplication**: Similar patterns repeated across tools without abstraction

### Proposed Architecture

The new architecture introduces a layered approach:

```
BugsnagClient
├── ToolRegistry (manages tool discovery and registration)
├── SharedServices (provides common functionality to tools)
└── Tools/
    ├── ListProjectsTool
    ├── GetErrorTool
    ├── GetEventDetailsTool
    ├── ListProjectErrorsTool
    ├── ListProjectEventFiltersTool
    ├── UpdateErrorTool
    ├── ListBuildsTool
    ├── GetBuildTool
    ├── ListReleasesTool
    ├── GetReleaseTool
    └── ListBuildsInReleaseTool
```

## Components and Interfaces

### 1. Base Tool Interface

All tools will implement a common interface to ensure consistency:

```typescript
interface BugsnagTool {
  readonly name: string;
  readonly definition: ToolDefinition;
  execute(args: any, context: ToolExecutionContext): Promise<ToolResult>;
}

interface ToolExecutionContext {
  services: SharedServices;
  getInput: GetInputFunction;
}

interface ToolDefinition {
  title: string;
  summary: string;
  purpose: string;
  useCases: string[];
  parameters: ParameterDefinition[];
  examples: ToolExample[];
  hints: string[];
  outputFormat?: string;
}
```

### 2. Shared Services Interface

Common functionality will be provided through a shared services interface:

```typescript
interface SharedServices {
  // Project management
  getProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  getCurrentProject(): Promise<Project | null>;
  getInputProject(projectId?: string): Promise<Project>;

  // API clients
  getCurrentUserApi(): CurrentUserAPI;
  getErrorsApi(): ErrorAPI;
  getProjectApi(): ProjectAPI;

  // Caching
  getCache(): NodeCache;

  // URL generation
  getDashboardUrl(project: Project): Promise<string>;
  getErrorUrl(project: Project, errorId: string, queryString?: string): Promise<string>;

  // Configuration
  getProjectApiKey(): string | undefined;
  hasProjectApiKey(): boolean;
}
```

### 3. Tool Registry

The tool registry will handle automatic discovery and registration of tools:

```typescript
class ToolRegistry {
  private tools: Map<string, BugsnagTool> = new Map();

  registerTool(tool: BugsnagTool): void;
  discoverTools(): BugsnagTool[];
  registerAllTools(register: RegisterToolsFunction, context: ToolExecutionContext): void;
}
```

### 4. Individual Tool Modules

Each tool will be implemented as a separate class:

```typescript
// Example: GetErrorTool
export class GetErrorTool implements BugsnagTool {
  readonly name = "get_error";
  readonly definition: ToolDefinition = {
    title: "Get Error",
    summary: "Get full details on an error...",
    // ... rest of definition
  };

  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    const { services } = context;
    const project = await services.getInputProject(args.projectId);
    // ... tool implementation
  }
}
```

## Data Models

### Tool Categories

Tools will be organized into logical categories:

1. **Project Tools**: `ListProjectsTool`
2. **Error Tools**: `GetErrorTool`, `ListProjectErrorsTool`, `UpdateErrorTool`
3. **Event Tools**: `GetEventDetailsTool`, `ListProjectEventFiltersTool`
4. **Build Tools**: `ListBuildsTool`, `GetBuildTool`, `ListBuildsInReleaseTool`
5. **Release Tools**: `ListReleasesTool`, `GetReleaseTool`

### Parameter Validation

Each tool will define its parameters using Zod schemas for consistent validation:

```typescript
interface ParameterDefinition {
  name: string;
  type: z.ZodType<any>;
  required: boolean;
  description: string;
  examples: string[];
  constraints?: string[];
}
```

## Error Handling

### Consistent Error Patterns

All tools will follow consistent error handling patterns:

1. **Parameter Validation**: Use Zod schemas for input validation
2. **Business Logic Errors**: Throw descriptive errors with context
3. **API Errors**: Wrap and enhance API errors with additional context
4. **Error Propagation**: Allow errors to bubble up with proper error messages

### Error Types

```typescript
class BugsnagToolError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}
```

## Testing Strategy

### Unit Testing Approach

1. **Tool Isolation**: Each tool can be tested independently
2. **Service Mocking**: SharedServices interface can be easily mocked
3. **Parameter Testing**: Validate parameter schemas and edge cases
4. **Error Scenarios**: Test error handling and edge cases

### Test Structure

```typescript
describe('GetErrorTool', () => {
  let tool: GetErrorTool;
  let mockServices: jest.Mocked<SharedServices>;

  beforeEach(() => {
    mockServices = createMockServices();
    tool = new GetErrorTool();
  });

  it('should retrieve error details successfully', async () => {
    // Test implementation
  });

  it('should handle missing error gracefully', async () => {
    // Test error handling
  });
});
```

### Integration Testing

1. **Tool Registry**: Test tool discovery and registration
2. **End-to-End**: Test complete tool execution flow
3. **Backward Compatibility**: Ensure existing functionality works unchanged

## Migration Strategy

### Phase 1: Infrastructure Setup
- Create base interfaces and shared services
- Implement tool registry
- Set up testing framework

### Phase 2: Tool Migration
- Migrate tools one by one, starting with simpler ones
- Maintain backward compatibility during migration
- Add comprehensive tests for each migrated tool

### Phase 3: Cleanup and Optimization
- Remove old monolithic implementation
- Optimize shared services
- Add performance monitoring

### Backward Compatibility

The refactoring will maintain 100% backward compatibility:
- All existing tool names and parameters remain unchanged
- Response formats stay identical
- Error messages and behavior preserved
- No breaking changes to the public API

## Benefits of This Design

1. **Modularity**: Each tool is self-contained and focused
2. **Testability**: Tools can be tested in isolation with mocked dependencies
3. **Maintainability**: Changes to one tool don't affect others
4. **Extensibility**: New tools can be added easily following established patterns
5. **Consistency**: All tools follow the same interface and patterns
6. **Reusability**: Shared services eliminate code duplication
7. **Type Safety**: Strong typing throughout the system
8. **Documentation**: Each tool is self-documenting with clear definitions
