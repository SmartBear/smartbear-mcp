// tools.test.ts

import { describe, expect, it } from "vitest";
import type { ZodObject, ZodTypeAny } from "zod";
import { TOOLS } from "../../../pactflow/client/tools";

describe("TOOLS definition for 'Generate Pact Tests'", () => {
  it("defines the generate pact tests tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Generate Pact tests using PactFlow AI/);
    expect(tool?.clients).toEqual(["pactflow"]);
    expect(tool?.handler).toBe("generate");
  });

  it("rejects unsupported language values in the language field", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    const languageSchema = schema.shape.language;
    expect(languageSchema).toBeDefined();

    const invalidData = "ruby"; // not in enum
    expect(() => languageSchema?.parse(invalidData)).toThrow(
      /Invalid enum value/,
    );
  });
});

describe("TOOLS definition for 'Get Metrics'", () => {
  it("defines the metrics tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Get Metrics");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Fetch metrics across the entire workspace/);
    expect(tool?.handler).toBe("getMetrics");
    expect(tool?.clients).toContain("pactflow");
    expect(tool?.clients).toContain("pact_broker");
  });

  it("has correct schema for metrics tool", () => {
    const tool = TOOLS.find((t) => t.title === "Get Metrics");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    expect(schema).toBeDefined();
    // Metrics tool takes no required parameters
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("TOOLS definition for 'Get Team Metrics'", () => {
  it("defines the team metrics tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Get Team Metrics");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Fetch metrics for all teams/);
    expect(tool?.handler).toBe("getTeamMetrics");
    expect(tool?.clients).toContain("pactflow");
  });

  it("accepts no parameters for team metrics tool", () => {
    const tool = TOOLS.find((t) => t.title === "Get Team Metrics");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    expect(schema).toBeDefined();

    // Should succeed with no parameters
    const resultWithoutParams = schema.safeParse({});
    expect(resultWithoutParams.success).toBe(true);

    // Should succeed with unexpected parameters (z.object({}) allows extra keys by default)
    const resultWithParams = schema.safeParse({ teamId: "team-123" });
    expect(resultWithParams.success).toBe(true);
  });
});
