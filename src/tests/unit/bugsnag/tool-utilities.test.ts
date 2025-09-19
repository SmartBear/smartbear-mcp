/**
 * Unit tests for Bugsnag tool utilities
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  CommonParameterSchemas,
  CommonParameterDefinitions,
  validateToolArgs,
  createSuccessResult,
  createErrorResult,
  executeWithErrorHandling,
  formatPaginatedResult,
  formatListResult,
  extractProjectSlugFromUrl,
  extractEventIdFromUrl,
  validateUrlParameters,
  createConditionalProjectIdParam,
  validateConditionalParameters,
  TOOL_DEFAULTS
} from "../../../bugsnag/utils/tool-utilities.js";
import { BugsnagToolError, ParameterDefinition } from "../../../bugsnag/types.js";

describe("CommonParameterSchemas", () => {
  it("should validate project ID correctly", () => {
    expect(() => CommonParameterSchemas.projectId.parse("valid-id")).not.toThrow();
    expect(() => CommonParameterSchemas.projectId.parse("")).toThrow();
    expect(() => CommonParameterSchemas.projectId.parse(null)).toThrow();
  });

  it("should validate pagination parameters correctly", () => {
    expect(() => CommonParameterSchemas.pageSize.parse(10)).not.toThrow();
    expect(() => CommonParameterSchemas.pageSize.parse(100)).not.toThrow();
    expect(() => CommonParameterSchemas.pageSize.parse(0)).toThrow();
    expect(() => CommonParameterSchemas.pageSize.parse(101)).toThrow();
  });

  it("should validate sort direction correctly", () => {
    expect(() => CommonParameterSchemas.direction.parse("asc")).not.toThrow();
    expect(() => CommonParameterSchemas.direction.parse("desc")).not.toThrow();
    expect(() => CommonParameterSchemas.direction.parse("invalid")).toThrow();
  });

  it("should validate update operations correctly", () => {
    expect(() => CommonParameterSchemas.updateOperation.parse("fix")).not.toThrow();
    expect(() => CommonParameterSchemas.updateOperation.parse("ignore")).not.toThrow();
    expect(() => CommonParameterSchemas.updateOperation.parse("invalid")).toThrow();
  });
});

describe("CommonParameterDefinitions", () => {
  it("should create project ID parameter definition", () => {
    const param = CommonParameterDefinitions.projectId(true);
    expect(param.name).toBe("projectId");
    expect(param.required).toBe(true);
    expect(param.examples).toContain("515fb9337c1074f6fd000003");
  });

  it("should create filters parameter definition with defaults", () => {
    const defaultFilters = { "error.status": [{ type: "eq" as const, value: "open" }] };
    const param = CommonParameterDefinitions.filters(false, defaultFilters);
    expect(param.name).toBe("filters");
    expect(param.required).toBe(false);
    expect(param.constraints).toBeDefined();
  });

  it("should create sort parameter definition with valid values", () => {
    const validValues = ["last_seen", "first_seen", "events"];
    const param = CommonParameterDefinitions.sort(validValues, "last_seen");
    expect(param.name).toBe("sort");
    expect(param.examples).toEqual(validValues);
  });
});

describe("validateToolArgs", () => {
  const mockParameters: ParameterDefinition[] = [
    {
      name: "requiredParam",
      type: z.string(),
      required: true,
      description: "A required parameter",
      examples: ["example"]
    },
    {
      name: "optionalParam",
      type: z.number(),
      required: false,
      description: "An optional parameter",
      examples: ["123"]
    }
  ];

  it("should pass validation with valid arguments", () => {
    const args = { requiredParam: "test", optionalParam: 123 };
    expect(() => validateToolArgs(args, mockParameters, "TestTool")).not.toThrow();
  });

  it("should pass validation with only required arguments", () => {
    const args = { requiredParam: "test" };
    expect(() => validateToolArgs(args, mockParameters, "TestTool")).not.toThrow();
  });

  it("should throw error for missing required parameter", () => {
    const args = { optionalParam: 123 };
    expect(() => validateToolArgs(args, mockParameters, "TestTool"))
      .toThrow(BugsnagToolError);

    try {
      validateToolArgs(args, mockParameters, "TestTool");
    } catch (error) {
      expect(error).toBeInstanceOf(BugsnagToolError);
      expect((error as BugsnagToolError).message).toContain("requiredParam");
      expect((error as BugsnagToolError).toolName).toBe("TestTool");
    }
  });

  it("should throw error for invalid parameter type", () => {
    const args = { requiredParam: "test", optionalParam: "not-a-number" };
    expect(() => validateToolArgs(args, mockParameters, "TestTool"))
      .toThrow(BugsnagToolError);
  });

  it("should handle null and undefined values correctly", () => {
    const args = { requiredParam: "test", optionalParam: null };
    expect(() => validateToolArgs(args, mockParameters, "TestTool")).not.toThrow();
  });
});

describe("createSuccessResult", () => {
  it("should create a success result with JSON content", () => {
    const data = { message: "success", count: 5 };
    const result = createSuccessResult(data);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(JSON.stringify(data));
    expect(result.isError).toBeUndefined();
  });

  it("should handle complex data structures", () => {
    const data = {
      items: [{ id: 1, name: "test" }],
      metadata: { total: 1, page: 1 }
    };
    const result = createSuccessResult(data);

    expect(result.content[0].text).toBe(JSON.stringify(data));
  });
});

describe("createErrorResult", () => {
  it("should create an error result", () => {
    const message = "Something went wrong";
    const result = createErrorResult(message);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(message);
    expect(result.isError).toBe(true);
  });

  it("should handle error with underlying cause", () => {
    const message = "Tool failed";
    const cause = new Error("Network error");
    const result = createErrorResult(message, cause);

    expect(result.content[0].text).toBe(message);
    expect(result.isError).toBe(true);
  });
});

describe("executeWithErrorHandling", () => {
  it("should return success result for successful execution", async () => {
    const data = { result: "success" };
    const execution = async () => data;

    const result = await executeWithErrorHandling("TestTool", execution);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(JSON.stringify(data));
  });

  it("should handle BugsnagToolError correctly", async () => {
    const error = new BugsnagToolError("Tool specific error", "TestTool");
    const execution = async () => { throw error; };

    const result = await executeWithErrorHandling("TestTool", execution);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Tool specific error");
  });

  it("should handle generic Error correctly", async () => {
    const error = new Error("Generic error");
    const execution = async () => { throw error; };

    const result = await executeWithErrorHandling("TestTool", execution);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Tool execution failed: Generic error");
  });

  it("should handle non-Error exceptions", async () => {
    const execution = async () => { throw "string error"; };

    const result = await executeWithErrorHandling("TestTool", execution);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Tool execution failed with unknown error");
  });
});

describe("formatPaginatedResult", () => {
  it("should format basic paginated result", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = formatPaginatedResult(data, 2);

    expect(result.data).toBe(data);
    expect(result.count).toBe(2);
    expect(result.total).toBeUndefined();
    expect(result.next).toBeUndefined();
  });

  it("should include total when provided", () => {
    const data = [{ id: 1 }];
    const result = formatPaginatedResult(data, 1, 10);

    expect(result.total).toBe(10);
  });

  it("should include next URL when provided", () => {
    const data = [{ id: 1 }];
    const nextUrl = "https://api.example.com/next";
    const result = formatPaginatedResult(data, 1, undefined, nextUrl);

    expect(result.next).toBe(nextUrl);
  });

  it("should not include next URL when null", () => {
    const data = [{ id: 1 }];
    const result = formatPaginatedResult(data, 1, undefined, null);

    expect(result.next).toBeUndefined();
  });
});

describe("formatListResult", () => {
  it("should format simple list result", () => {
    const data = [{ name: "item1" }, { name: "item2" }];
    const result = formatListResult(data, 2);

    expect(result.data).toBe(data);
    expect(result.count).toBe(2);
  });
});

describe("extractProjectSlugFromUrl", () => {
  it("should extract project slug from valid URL", () => {
    const url = "https://app.bugsnag.com/my-org/my-project/errors/123";
    const slug = extractProjectSlugFromUrl(url);

    expect(slug).toBe("my-project");
  });

  it("should throw error for invalid URL format", () => {
    const url = "https://app.bugsnag.com/my-org";

    expect(() => extractProjectSlugFromUrl(url)).toThrow(BugsnagToolError);
  });

  it("should throw error for malformed URL", () => {
    const url = "not-a-url";

    expect(() => extractProjectSlugFromUrl(url)).toThrow(BugsnagToolError);
  });
});

describe("extractEventIdFromUrl", () => {
  it("should extract event ID from URL with query parameters", () => {
    const url = "https://app.bugsnag.com/my-org/my-project/errors/123?event_id=event-456";
    const eventId = extractEventIdFromUrl(url);

    expect(eventId).toBe("event-456");
  });

  it("should throw error when event_id parameter is missing", () => {
    const url = "https://app.bugsnag.com/my-org/my-project/errors/123";

    expect(() => extractEventIdFromUrl(url)).toThrow(BugsnagToolError);
  });

  it("should throw error for malformed URL", () => {
    const url = "not-a-url";

    expect(() => extractEventIdFromUrl(url)).toThrow(BugsnagToolError);
  });
});

describe("validateUrlParameters", () => {
  it("should pass validation when all required parameters are present", () => {
    const url = "https://example.com?param1=value1&param2=value2";
    const requiredParams = ["param1", "param2"];

    expect(() => validateUrlParameters(url, requiredParams, "TestTool")).not.toThrow();
  });

  it("should throw error when required parameter is missing", () => {
    const url = "https://example.com?param1=value1";
    const requiredParams = ["param1", "param2"];

    expect(() => validateUrlParameters(url, requiredParams, "TestTool"))
      .toThrow(BugsnagToolError);
  });

  it("should throw error for malformed URL", () => {
    const url = "not-a-url";
    const requiredParams = ["param1"];

    expect(() => validateUrlParameters(url, requiredParams, "TestTool"))
      .toThrow(BugsnagToolError);
  });
});

describe("createConditionalProjectIdParam", () => {
  it("should return empty array when project API key is configured", () => {
    const params = createConditionalProjectIdParam(true);
    expect(params).toHaveLength(0);
  });

  it("should return project ID parameter when no project API key", () => {
    const params = createConditionalProjectIdParam(false);
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("projectId");
    expect(params[0].required).toBe(true);
  });
});

describe("validateConditionalParameters", () => {
  it("should pass when operation is not override_severity", () => {
    const args = { operation: "fix" };
    expect(() => validateConditionalParameters(args, "TestTool")).not.toThrow();
  });

  it("should pass when operation is override_severity and severity is provided", () => {
    const args = { operation: "override_severity", severity: "warning" };
    expect(() => validateConditionalParameters(args, "TestTool")).not.toThrow();
  });

  it("should throw error when operation is override_severity but severity is missing", () => {
    const args = { operation: "override_severity" };
    expect(() => validateConditionalParameters(args, "TestTool"))
      .toThrow(BugsnagToolError);
  });
});

describe("TOOL_DEFAULTS", () => {
  it("should have expected default values", () => {
    expect(TOOL_DEFAULTS.PAGE_SIZE).toBe(30);
    expect(TOOL_DEFAULTS.MAX_PAGE_SIZE).toBe(100);
    expect(TOOL_DEFAULTS.SORT_DIRECTION).toBe("desc");
    expect(TOOL_DEFAULTS.DEFAULT_FILTERS).toHaveProperty("event.since");
    expect(TOOL_DEFAULTS.DEFAULT_FILTERS).toHaveProperty("error.status");
  });
});
