/**
 * Example tool implementation showing how to use the base tool utilities
 *
 * This is a reference implementation that demonstrates the patterns and utilities
 * that all Bugsnag tools should follow.
 */

import { BugsnagTool, ToolDefinition, ToolExecutionContext, ToolResult } from "../types.js";
import {
  CommonParameterSchemas,
  CommonParameterDefinitions,
  validateToolArgs,
  executeWithErrorHandling,
  createConditionalProjectIdParam,
  formatListResult,
  TOOL_DEFAULTS
} from "./tool-utilities.js";

/**
 * Example tool that demonstrates proper usage of base utilities
 */
export class ExampleTool implements BugsnagTool {
  readonly name = "example_tool";

  readonly definition: ToolDefinition = {
    title: "Example Tool",
    summary: "An example tool demonstrating proper usage of base utilities",
    purpose: "Demonstrate consistent patterns for tool implementation",
    useCases: [
      "Show how to use parameter validation",
      "Demonstrate error handling patterns",
      "Illustrate response formatting"
    ],
    parameters: [
      // Conditional project ID parameter (only required if no project API key)
      ...createConditionalProjectIdParam(false), // This would be dynamic in real implementation

      // Common parameter definitions
      CommonParameterDefinitions.filters(false, TOOL_DEFAULTS.DEFAULT_FILTERS),
      CommonParameterDefinitions.sort(["name", "created_at"], "created_at"),
      CommonParameterDefinitions.direction(),
      CommonParameterDefinitions.perPage(),

      // Custom parameter using common schemas
      {
        name: "customParam",
        type: CommonParameterDefinitions.projectId().type.optional(),
        required: false,
        description: "An example custom parameter",
        examples: ["example-value"]
      }
    ],
    examples: [
      {
        description: "Basic usage with default parameters",
        parameters: {},
        expectedOutput: "JSON object with data array and count"
      },
      {
        description: "Usage with custom filters and sorting",
        parameters: {
          filters: {
            "error.status": [{ "type": "eq", "value": "open" }]
          },
          sort: "name",
          direction: "asc",
          per_page: 50
        },
        expectedOutput: "Filtered and sorted results"
      }
    ],
    hints: [
      "This is an example tool for demonstration purposes",
      "Use similar patterns in your own tool implementations",
      "Always validate parameters and handle errors consistently"
    ],
    outputFormat: "JSON object containing 'data' array and 'count' number"
  };

  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Step 1: Validate arguments using the parameter definitions
      validateToolArgs(args, this.definition.parameters, this.name);

      // Step 2: Get the project (demonstrates SharedServices usage)
      const project = await context.services.getInputProject(args.projectId);

      // Step 3: Perform the tool's main logic
      const mockData = [
        { id: "1", name: "Example Item 1", project_id: project.id },
        { id: "2", name: "Example Item 2", project_id: project.id }
      ];

      // Step 4: Apply any filtering/sorting based on parameters
      let filteredData = mockData;

      if (args.sort === "name") {
        filteredData = filteredData.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return args.direction === "asc" ? comparison : -comparison;
        });
      }

      // Step 5: Apply pagination
      const perPage = args.per_page || TOOL_DEFAULTS.PAGE_SIZE;
      const paginatedData = filteredData.slice(0, perPage);

      // Step 6: Format the result using utility functions
      return formatListResult(paginatedData, paginatedData.length);
    });
  }
}

/**
 * Example of a more complex tool with error handling
 */
export class ExampleErrorHandlingTool implements BugsnagTool {
  readonly name = "example_error_tool";

  readonly definition: ToolDefinition = {
    title: "Example Error Handling Tool",
    summary: "Demonstrates various error handling scenarios",
    purpose: "Show how to handle different types of errors consistently",
    useCases: [
      "Demonstrate parameter validation errors",
      "Show API error handling",
      "Illustrate business logic error handling"
    ],
    parameters: [
      CommonParameterDefinitions.errorId(),
      {
        name: "errorType",
        type: CommonParameterSchemas.nonEmptyString,
        required: true,
        description: "Type of error to simulate",
        examples: ["validation", "api", "business", "success"]
      }
    ],
    examples: [
      {
        description: "Simulate a successful operation",
        parameters: {
          errorId: "123",
          errorType: "success"
        },
        expectedOutput: "Success result"
      }
    ],
    hints: [
      "This tool simulates different error scenarios for testing"
    ]
  };

  async execute(args: any, _context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      // Simulate different error scenarios
      switch (args.errorType) {
        case "success":
          return { message: "Operation completed successfully", errorId: args.errorId };

        case "validation":
          // This would be caught by executeWithErrorHandling and formatted properly
          throw new Error("Validation failed: Invalid error ID format");

        case "api": {
          // Simulate an API error
          const apiError = new Error("API request failed");
          apiError.name = "APIError";
          throw apiError;
        }

        case "business":
          // Simulate a business logic error
          throw new Error(`Error ${args.errorId} is not in a state that allows this operation`);

        default:
          throw new Error(`Unknown error type: ${args.errorType}`);
      }
    });
  }
}

/**
 * Example showing URL parameter extraction
 */
export class ExampleUrlTool implements BugsnagTool {
  readonly name = "example_url_tool";

  readonly definition: ToolDefinition = {
    title: "Example URL Tool",
    summary: "Demonstrates URL parameter extraction utilities",
    purpose: "Show how to extract information from dashboard URLs",
    useCases: [
      "Extract project information from dashboard URLs",
      "Parse event IDs from shared links"
    ],
    parameters: [
      CommonParameterDefinitions.dashboardUrl()
    ],
    examples: [
      {
        description: "Extract information from a dashboard URL",
        parameters: {
          link: "https://app.bugsnag.com/my-org/my-project/errors/123?event_id=456"
        },
        expectedOutput: "Extracted project slug and event ID"
      }
    ],
    hints: [
      "URL must be a valid Bugsnag dashboard URL",
      "Required parameters will be validated automatically"
    ]
  };

  async execute(args: any, _context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      // Import utilities inside the function to avoid circular dependencies
      const { extractProjectSlugFromUrl, extractEventIdFromUrl, validateUrlParameters } =
        await import("./tool-utilities.js");

      // Validate that required URL parameters are present
      validateUrlParameters(args.link, ["event_id"], this.name);

      // Extract information from the URL
      const projectSlug = extractProjectSlugFromUrl(args.link);
      const eventId = extractEventIdFromUrl(args.link);

      return {
        projectSlug,
        eventId,
        originalUrl: args.link
      };
    });
  }
}
