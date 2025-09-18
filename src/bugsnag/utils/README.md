# Bugsnag Tool Implementation Utilities

This directory contains base utilities and patterns for implementing Bugsnag tools in a consistent, maintainable way.

## Overview

The utilities provide:

- **Parameter validation** using Zod schemas
- **Consistent error handling** and response formatting
- **Common parameter definitions** for reuse across tools
- **URL parsing utilities** for dashboard links
- **Result formatting helpers** for consistent output

## Core Utilities

### Parameter Validation

#### CommonParameterSchemas

Pre-defined Zod schemas for common parameter types:

```typescript
import { CommonParameterSchemas } from "./tool-utilities.js";

// Validate a project ID
CommonParameterSchemas.projectId.parse("my-project-id");

// Validate pagination parameters
CommonParameterSchemas.pageSize.parse(25); // 1-100
CommonParameterSchemas.direction.parse("desc"); // "asc" | "desc"
```

#### CommonParameterDefinitions

Factory functions for creating parameter definitions:

```typescript
import { CommonParameterDefinitions } from "./tool-utilities.js";

const parameters = [
  CommonParameterDefinitions.projectId(true), // required
  CommonParameterDefinitions.filters(false, defaultFilters), // optional with defaults
  CommonParameterDefinitions.sort(["name", "date"], "date"), // with valid values
  CommonParameterDefinitions.perPage(30) // with default value
];
```

#### validateToolArgs

Validates arguments against parameter definitions:

```typescript
import { validateToolArgs } from "./tool-utilities.js";

// In your tool's execute method:
validateToolArgs(args, this.definition.parameters, this.name);
```

### Error Handling

#### executeWithErrorHandling

Wraps tool execution with consistent error handling:

```typescript
import { executeWithErrorHandling } from "./tool-utilities.js";

async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
  return executeWithErrorHandling(this.name, async () => {
    // Your tool logic here
    return { data: "result" };
  });
}
```

#### BugsnagToolError

Custom error class for tool-specific errors:

```typescript
import { BugsnagToolError } from "../types.js";

throw new BugsnagToolError("Specific error message", this.name);
```

### Response Formatting

#### createSuccessResult / createErrorResult

Create properly formatted tool results:

```typescript
import { createSuccessResult, createErrorResult } from "./tool-utilities.js";

// Success result
return createSuccessResult({ data: items, count: items.length });

// Error result
return createErrorResult("Something went wrong");
```

#### formatPaginatedResult / formatListResult

Format results with consistent structure:

```typescript
import { formatPaginatedResult, formatListResult } from "./tool-utilities.js";

// Paginated results with next URL
return formatPaginatedResult(items, items.length, totalCount, nextUrl);

// Simple list results
return formatListResult(items, items.length);
```

### URL Utilities

#### extractProjectSlugFromUrl / extractEventIdFromUrl

Extract information from dashboard URLs:

```typescript
import { extractProjectSlugFromUrl, extractEventIdFromUrl } from "./tool-utilities.js";

const url = "https://app.bugsnag.com/my-org/my-project/errors/123?event_id=456";
const projectSlug = extractProjectSlugFromUrl(url); // "my-project"
const eventId = extractEventIdFromUrl(url); // "456"
```

#### validateUrlParameters

Ensure required URL parameters are present:

```typescript
import { validateUrlParameters } from "./tool-utilities.js";

validateUrlParameters(url, ["event_id", "error_id"], this.name);
```

### Conditional Parameters

#### createConditionalProjectIdParam

Create project ID parameter only when needed:

```typescript
import { createConditionalProjectIdParam } from "./tool-utilities.js";

const parameters = [
  ...createConditionalProjectIdParam(hasProjectApiKey),
  // other parameters...
];
```

#### validateConditionalParameters

Validate parameters that depend on other parameter values:

```typescript
import { validateConditionalParameters } from "./tool-utilities.js";

// Validates that severity is provided when operation is "override_severity"
validateConditionalParameters(args, this.name);
```

## Implementation Pattern

Here's the recommended pattern for implementing a new tool:

```typescript
import { BugsnagTool, ToolDefinition, ToolExecutionContext, ToolResult } from "../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
  executeWithErrorHandling,
  createConditionalProjectIdParam,
  formatListResult,
  TOOL_DEFAULTS
} from "./tool-utilities.js";

export class MyTool implements BugsnagTool {
  readonly name = "my_tool";

  readonly definition: ToolDefinition = {
    title: "My Tool",
    summary: "Brief description of what the tool does",
    purpose: "Detailed explanation of the tool's purpose",
    useCases: [
      "Use case 1",
      "Use case 2"
    ],
    parameters: [
      // Conditional project ID (only if no project API key)
      ...createConditionalProjectIdParam(false), // This should be dynamic

      // Common parameters
      CommonParameterDefinitions.filters(false, TOOL_DEFAULTS.DEFAULT_FILTERS),
      CommonParameterDefinitions.perPage(),

      // Custom parameters
      {
        name: "customParam",
        type: z.string(),
        required: false,
        description: "Custom parameter description",
        examples: ["example"]
      }
    ],
    examples: [
      {
        description: "Example usage",
        parameters: { customParam: "value" },
        expectedOutput: "Description of expected output"
      }
    ],
    hints: [
      "Helpful hint 1",
      "Helpful hint 2"
    ],
    outputFormat: "Description of output format"
  };

  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // 1. Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      // 2. Validate conditional parameters if needed
      validateConditionalParameters(args, this.name);

      // 3. Get project using SharedServices
      const project = await context.services.getInputProject(args.projectId);

      // 4. Perform tool logic
      const data = await this.performToolLogic(args, context);

      // 5. Format and return result
      return formatListResult(data, data.length);
    });
  }

  private async performToolLogic(args: any, context: ToolExecutionContext): Promise<any[]> {
    // Your tool's specific logic here
    return [];
  }
}
```

## Constants

### TOOL_DEFAULTS

Common default values:

```typescript
import { TOOL_DEFAULTS } from "./tool-utilities.js";

TOOL_DEFAULTS.PAGE_SIZE; // 30
TOOL_DEFAULTS.MAX_PAGE_SIZE; // 100
TOOL_DEFAULTS.SORT_DIRECTION; // "desc"
TOOL_DEFAULTS.DEFAULT_FILTERS; // Default error filters
```

## Testing

The utilities include comprehensive unit tests. When implementing new tools:

1. Test parameter validation with valid and invalid inputs
2. Test error handling scenarios
3. Test result formatting
4. Test any custom logic specific to your tool

Example test structure:

```typescript
import { describe, it, expect } from "vitest";
import { MyTool } from "./my-tool.js";
import { createMockServices, createMockContext } from "./test-helpers.js";

describe("MyTool", () => {
  let tool: MyTool;
  let mockContext: any;

  beforeEach(() => {
    tool = new MyTool();
    mockContext = createMockContext();
  });

  it("should validate parameters correctly", async () => {
    const args = { /* valid args */ };
    const result = await tool.execute(args, mockContext);
    expect(result.isError).toBeUndefined();
  });

  it("should handle missing required parameters", async () => {
    const args = { /* missing required params */ };
    const result = await tool.execute(args, mockContext);
    expect(result.isError).toBe(true);
  });
});
```

## Best Practices

1. **Always validate parameters** using `validateToolArgs`
2. **Use executeWithErrorHandling** to wrap your tool logic
3. **Reuse common parameter definitions** instead of creating custom ones
4. **Format results consistently** using the provided utilities
5. **Handle errors gracefully** with descriptive messages
6. **Write comprehensive tests** for your tools
7. **Follow the established patterns** shown in the example tools

## Migration from Existing Tools

When migrating existing tools to use these utilities:

1. Extract parameter definitions using `CommonParameterDefinitions`
2. Replace manual validation with `validateToolArgs`
3. Wrap execution logic with `executeWithErrorHandling`
4. Use formatting utilities for consistent output
5. Add comprehensive tests
6. Update error handling to use `BugsnagToolError`

This approach ensures consistency across all tools while reducing code duplication and improving maintainability.
